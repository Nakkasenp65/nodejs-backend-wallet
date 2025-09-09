import prisma from '../../../libs/prisma.js';
import ApiError from '../../../utils/ApiError.js';
import httpStatus from 'http-status';

/**
 * Fetch products with price range + options
 * @param {object} opts
 * @param {number|null} opts.minPrice
 * @param {number|null} opts.maxPrice
 * @param {boolean} [opts.topPerBrand=false]   // show only the best (highest downPayment) per brand
 * @param {number} [opts.take=24]
 * @param {number} [opts.skip=0]
 * @param {"asc"|"desc"} [opts.sort="asc"]     // by downPaymentAmount
 */
const fetchProducts = async (opts = {}) => {
  const { minPrice = null, maxPrice = null, topPerBrand = false, take = 24, skip = 0, sort = 'asc' } = opts;
  const where = {
    ...(minPrice != null || maxPrice != null
      ? {
          downPaymentAmount: {
            ...(minPrice != null ? { gte: Number(minPrice) } : {}),
            ...(maxPrice != null ? { lte: Number(maxPrice) } : {}),
          },
        }
      : {}),
  };

  console.log(where);

  // Aggregations for UI (range slider bounds, brand list)
  const [count, rangeAgg, brandsAgg] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.aggregate({
      where,
      _min: { downPaymentAmount: true },
      _max: { downPaymentAmount: true },
    }),
    prisma.product.findMany({
      where,
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    }),
  ]);

  // Mode 1: simple list (fast + paginated)
  if (!topPerBrand) {
    const items = await prisma.product.findMany({
      where,
      orderBy: { downPaymentAmount: sort },
      take,
      skip,
      select: {
        brand: true,
        capacity: true,
        color: true,
        downPaymentAmount: true,
        imageUrl: true,
        id: true,
        model: true,
        uniqueId: true,
      },
    });
    return {
      items,
      total: count,
      facets: {
        minAvailable: rangeAgg._min.downPaymentAmount ?? 0,
        maxAvailable: rangeAgg._max.downPaymentAmount ?? 0,
        brands: brandsAgg.map((b) => b.brand).filter(Boolean),
      },
    };
  }

  // Mode 2: top product per brand (best affordable in each brand)
  // NOTE: Prisma on Mongo doesn't do group-by well for this case with pagination.
  // We do a single big fetch (bounded by where) and reduce in memory.
  // If your dataset is huge, switch to a Mongo aggregation pipeline via $runCommandRaw.
  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ brand: 'asc' }, { downPaymentAmount: 'desc' }],
  });

  const map = new Map(); // brand -> product
  for (const p of rows) {
    if (!map.has(p.brand)) map.set(p.brand, p); // first is highest per brand due to sort
  }
  const perBrand = Array.from(map.values());

  // Apply pagination AFTER grouping
  const items = perBrand.sort((a, b) => (sort === 'asc' ? a.downPaymentAmount - b.downPaymentAmount : b.downPaymentAmount - a.downPaymentAmount)).slice(skip, skip + take);

  return {
    items,
    total: perBrand.length,
    facets: {
      minAvailable: rangeAgg._min.downPaymentAmount ?? 0,
      maxAvailable: rangeAgg._max.downPaymentAmount ?? 0,
      brands: brandsAgg.map((b) => b.brand).filter(Boolean),
    },
  };
};

/**
 * (Helper) สร้าง uniqueId จากข้อมูล Product เพื่อป้องกันข้อมูลซ้ำซ้อน
 * @param {object} productData - ข้อมูล Product ที่มี brand, model, capacity, color
 * @returns {string} - uniqueId ที่สร้างขึ้น เช่น "iPhone 15 Pro-256GB-ดำ-Apple"
 */
const generateUniqueId = (productData) => {
  const { brand, model, capacity, color } = productData;
  // ใช้ 'N/A' หากไม่มีค่า color เพื่อให้ uniqueId คงเส้นคงวา
  const colorPart = color?.trim() || 'N/A';
  return `${model}-${capacity}-${colorPart}-${brand}`;
};

const getProductFilters = async () => {
  // 1. ใช้ prisma.$transaction เพื่อรันทุก query พร้อมกัน ซึ่งเร็วกว่าการรันทีละคำสั่ง
  const [brands, capacities, colors] = await prisma.$transaction([
    // 2. ดึงค่า 'brand' ที่ไม่ซ้ำกันทั้งหมด
    prisma.product.findMany({
      select: { brand: true }, // เลือกเฉพาะฟิลด์ brand
      distinct: ['brand'], // บอกให้ Prisma คืนค่าที่ไม่ซ้ำกันเท่านั้น
      orderBy: { brand: 'asc' }, // (Optional) เรียงตามตัวอักษร
    }),
    // 3. ดึงค่า 'capacity' ที่ไม่ซ้ำกันทั้งหมด
    prisma.product.findMany({
      select: { capacity: true },
      distinct: ['capacity'],
      orderBy: { capacity: 'asc' },
    }),
    // 4. ดึงค่า 'color' ที่ไม่ซ้ำกันทั้งหมด
    prisma.product.findMany({
      select: { color: true },
      distinct: ['color'],
      orderBy: { color: 'asc' },
    }),
  ]);

  // 5. จัดรูปแบบข้อมูลจาก [{ brand: 'Apple' }, { brand: 'Samsung' }]
  // ให้อยู่ในรูปแบบ Array of strings ที่ใช้งานง่าย ['Apple', 'Samsung']
  // และใช้ .filter(Boolean) เพื่อกรองค่าที่เป็น null หรือ empty string ออกไป
  return {
    brands: brands.map((item) => item.brand).filter(Boolean),
    capacities: capacities.map((item) => item.capacity).filter(Boolean),
    colors: colors.map((item) => item.color).filter(Boolean),
  };
};

/**
 * (Admin) ดึงข้อมูลสินค้าทั้งหมด (ฉบับปรับปรุง)
 * - รองรับการแบ่งหน้า (Pagination)
 * - รองรับการค้นหา (Search) ตามชื่อรุ่นและยี่ห้อ
 * - รองรับการกรอง (Filter) ตามยี่ห้อ, สภาพ, ความจุ, และสี
 * - รองรับการเรียงลำดับ (Sort) ตามราคาดาวน์และวันที่สร้าง
 *
 * @param {object} options - ตัวเลือกสำหรับ Query
 * @param {number} [options.page=1] - หน้าปัจจุบัน
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.search] - คำค้นหาสำหรับ model หรือ brand
 * @param {string} [options.brand] - กรองตามยี่ห้อ
 * @param {string} [options.condition] - [ใหม่] กรองตามสภาพสินค้า ('มือหนึ่ง', 'มือสอง')
 * @param {string} [options.capacity] - [ใหม่] กรองตามความจุ
 * @param {string} [options.color] - [ใหม่] กรองตามสี
 * @param {string} [options.sort] - การเรียงลำดับ (e.g., 'downPaymentAsc', 'downPaymentDesc')
 * @returns {Promise<object>} Object ที่มีข้อมูลสินค้า (data) และข้อมูลการแบ่งหน้า (paging)
 */
const getProducts = async (options = {}) => {
  // 1. กำหนดค่าเริ่มต้นและดึงค่า options ทั้งหมดที่ต้องการ
  const { page = 1, pageSize = 10, search, brand, condition, capacity, color, sort } = options;

  const take = parseInt(pageSize, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  // 2. สร้างเงื่อนไขการค้นหา (Where Clause) แบบไดนามิก
  const where = {};

  // --- ส่วนของ Filter เดิม ---
  if (search) {
    where.OR = [{ model: { contains: search, mode: 'insensitive' } }, { brand: { contains: search, mode: 'insensitive' } }];
  }
  if (brand && brand !== 'ALL') {
    where.brand = brand;
  }

  // --- [MODIFIED] เพิ่มเงื่อนไขสำหรับ Filter ใหม่ ---
  // ตรวจสอบว่ามีการส่งค่ามาและไม่ใช่ 'ALL' ก่อนจะเพิ่มลงใน query
  if (condition && condition !== 'ALL') {
    where.condition = condition;
  }
  if (capacity && capacity !== 'ALL') {
    where.capacity = capacity;
  }
  if (color && color !== 'ALL') {
    where.color = color;
  }

  // 3. สร้างเงื่อนไขการเรียงลำดับ (Order By Clause) - ไม่เปลี่ยนแปลง
  let orderBy = { createdAt: 'desc' };
  if (sort === 'downPaymentAsc') {
    orderBy = { downPaymentAmount: 'asc' };
  } else if (sort === 'downPaymentDesc') {
    orderBy = { downPaymentAmount: 'desc' };
  }

  // 4. ดึงข้อมูลและนับจำนวนทั้งหมดพร้อมกันด้วย $transaction เพื่อประสิทธิภาพสูงสุด
  // Prisma จะใช้ `where` clause ที่เราสร้างขึ้นในการกรองข้อมูลที่ Database level
  const [products, totalProducts] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  // 5. สร้าง Object สำหรับ Pagination - ไม่เปลี่ยนแปลง
  const paging = {
    page: parseInt(page, 10),
    pageSize: take,
    total: totalProducts,
    totalPages: Math.ceil(totalProducts / take),
  };

  // 6. คืนค่าข้อมูล
  return { data: products, paging };
};

/**
 * (Admin) สร้างสินค้าใหม่
 * @param {object} payload - ข้อมูลสินค้าที่จะสร้าง
 * @returns {Promise<object>} - Product object ที่สร้างเสร็จแล้ว
 */
const createProduct = async (payload) => {
  const { brand, model, capacity, color, downPaymentAmount, imageUrl, price, installment6Months, installment10Months } = payload;

  // 1. ตรวจสอบข้อมูลที่จำเป็น
  if (!brand || !model || !capacity || !downPaymentAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Brand, Model, Capacity, and Down Payment are required.');
  }

  // 2. สร้าง uniqueId และตรวจสอบข้อมูลซ้ำ
  const uniqueId = generateUniqueId({ brand, model, capacity, color });
  const existingProduct = await prisma.product.findUnique({
    where: { uniqueId },
  });

  if (existingProduct) {
    throw new ApiError(httpStatus.CONFLICT, `Product with these specifications already exists: ${uniqueId}`);
  }

  // 3. สร้างข้อมูลในฐานข้อมูล
  const newProduct = await prisma.product.create({
    data: {
      brand,
      model,
      capacity,
      color,
      downPaymentAmount,
      imageUrl,
      price,
      installment6Months,
      installment10Months,
      uniqueId, // บันทึก uniqueId ลงไปด้วย
    },
  });

  return newProduct;
};

/**
 * (Admin) แก้ไขข้อมูลสินค้า
 * @param {string} productId - ID ของสินค้าที่จะแก้ไข
 * @param {object} payload - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} - Product object ที่อัปเดตแล้ว
 */
const editProduct = async (productId, payload) => {
  // 1. ตรวจสอบว่ามี productId และ payload
  if (!productId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product ID is required.');
  }

  // 2. ดึงข้อมูลปัจจุบันของ Product มาเพื่อใช้สร้าง uniqueId ใหม่
  const currentProduct = await prisma.product.findUnique({ where: { id: productId } });
  if (!currentProduct) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');
  }

  // 3. สร้างข้อมูลใหม่และ uniqueId ใหม่
  const updatedData = { ...currentProduct, ...payload };
  const newUniqueId = generateUniqueId(updatedData);

  // 4. ตรวจสอบว่า uniqueId ใหม่ซ้ำกับรายการอื่นหรือไม่
  if (newUniqueId !== currentProduct.uniqueId) {
    const existingProduct = await prisma.product.findFirst({ where: { uniqueId: newUniqueId } });
    if (existingProduct) {
      throw new ApiError(httpStatus.CONFLICT, `Another product with these specifications already exists: ${newUniqueId}`);
    }
  }

  // ลบ id ออกจาก payload
  const { id, ...nonIdPayload } = payload;

  // 5. อัปเดตข้อมูลในฐานข้อมูล
  const product = await prisma.product.update({
    where: { id: productId },
    data: { ...nonIdPayload, uniqueId: newUniqueId }, // อัปเดตข้อมูลพร้อม uniqueId ใหม่
  });

  return product;
};

/**
 * (Admin) ลบสินค้า
 * @param {string} productId - ID ของสินค้าที่จะลบ
 * @returns {Promise<object>} - Product object ที่ถูกลบ
 */
const deleteProduct = async (productId) => {
  if (!productId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product ID is required.');
  }

  // ตรวจสอบว่ามี Product นี้อยู่จริงหรือไม่ก่อนลบ
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');
  }

  // (สำคัญ) ตรวจสอบว่ามี Goal ผูกกับ Product นี้หรือไม่
  // ถ้ามี ไม่ควรลบ เพื่อป้องกัน Data Inconsistency
  const relatedGoals = await prisma.goal.count({ where: { productId } });
  if (relatedGoals > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot delete product. It is linked to ${relatedGoals} user goals.`);
  }

  const deletedProduct = await prisma.product.delete({
    where: { id: productId },
  });

  return deletedProduct;
};

export default {
  fetchProducts,
  getProducts,
  getProductFilters,
  createProduct,
  editProduct,
  deleteProduct,
};
