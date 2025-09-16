/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับสินค้า (Product)
 * @description ไฟล์นี้รวบรวมฟังก์ชันสำหรับการดึงข้อมูล, สร้าง, แก้ไข, และลบสินค้า
 * รวมถึงการจัดการตรรกะที่ซับซ้อน เช่น การสร้าง Unique ID และการป้องกันการลบข้อมูลที่ถูกใช้งานอยู่
 * @module services/product
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 * @requires services/image.service - Service สำหรับการอัปโหลดรูปภาพ
 */
import prisma from "../../../libs/prisma.js";
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";
import imageService from "../images/image.service.js";

/**
 * ดึงรายการสินค้าทั้งหมดพร้อมตัวเลือกการกรองและจัดเรียงขั้นพื้นฐาน
 * @description ฟังก์ชันนี้ออกแบบมาเพื่อดึงข้อมูลสินค้าที่จำเป็นสำหรับแสดงผลในหน้าหลัก
 * โดยเลือกเฉพาะฟิลด์ที่สำคัญเพื่อลดขนาด Payload และเพิ่มประสิทธิภาพ
 * @async
 * @param {object} [opts={}] - อ็อบเจกต์ตัวเลือกสำหรับการกรองและจัดเรียง
 * @param {number|string} [opts.minPrice] - กรองราคาวางดาวน์ขั้นต่ำ
 * @param {number|string} [opts.maxPrice] - กรองราคาวางดาวน์สูงสุด
 * @param {'asc'|'desc'} [opts.sort='asc'] - การเรียงลำดับตามราคาวางดาวน์
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของข้อมูลสินค้า
 */
const fetchProducts = async (opts = {}) => {
  // --- STAGE 1: การกำหนดค่าและการชำระล้าง (Configuration & Sanitization) ---
  const { minPrice = null, maxPrice = null, sort = "asc" } = opts;

  // --- STAGE 2: การสร้างเงื่อนไขการ Query (Query Condition Construction) ---
  // ตรรกะส่วนนี้ยังคงแข็งแกร่งและยืดหยุ่น
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

  // --- STAGE 3: การดึงข้อมูล (Data Retrieval) ---
  // เราจะดึงข้อมูลรายการสินค้าและจำนวนทั้งหมดพร้อมกันเพื่อประสิทธิภาพ
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { downPaymentAmount: sort },
      // เลือกเฉพาะฟิลด์ที่จำเป็นสำหรับ Frontend เพื่อลดขนาด Payload
      select: {
        id: true,
        brand: true,
        model: true,
        capacity: true,
        color: true,
        downPaymentAmount: true,
        imageUrl: true,
        uniqueId: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  // --- STAGE 4: การประกอบสร้างผลลัพธ์ (Result Construction) ---
  // คืนค่าในรูปแบบที่สอดคล้องกับที่ Frontend คาดหวัง
  return items;
};

const generateUniqueId = (productData) => {
  const { brand, model, capacity, color } = productData;
  // ใช้ 'N/A' หากไม่มีค่า color เพื่อให้ uniqueId คงเส้นคงวา
  const colorPart = color?.trim() || "N/A";
  return `${model}-${capacity}-${colorPart}-${brand}`;
};

/**
ดึงข้อมูลตัวเลือกทั้งหมดสำหรับใช้สร้าง UI Filter ในหน้าสินค้า
@description ใช้ prisma.$transaction และ distinct เพื่อดึงค่าที่ไม่ซ้ำกันของ brand, capacity, และ color
ทั้งหมดพร้อมกันในครั้งเดียวเพื่อประสิทธิภาพสูงสุด
@async
@returns {Promise<{brands: Array<string>, capacities: Array<string>, colors: Array<string>}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยอาร์เรย์ของตัวเลือก Filter
*/
const getProductFilters = async () => {
  // 1. ใช้ prisma.$transaction เพื่อรันทุก query พร้อมกัน ซึ่งเร็วกว่าการรันทีละคำสั่ง
  const [brands, capacities, colors] = await prisma.$transaction([
    // 2. ดึงค่า 'brand' ที่ไม่ซ้ำกันทั้งหมด
    prisma.product.findMany({
      select: { brand: true }, // เลือกเฉพาะฟิลด์ brand
      distinct: ["brand"], // บอกให้ Prisma คืนค่าที่ไม่ซ้ำกันเท่านั้น
      orderBy: { brand: "asc" }, // (Optional) เรียงตามตัวอักษร
    }),
    // 3. ดึงค่า 'capacity' ที่ไม่ซ้ำกันทั้งหมด
    prisma.product.findMany({
      select: { capacity: true },
      distinct: ["capacity"],
      orderBy: { capacity: "asc" },
    }),
    // 4. ดึงค่า 'color' ที่ไม่ซ้ำกันทั้งหมด
    prisma.product.findMany({
      select: { color: true },
      distinct: ["color"],
      orderBy: { color: "asc" },
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
 * ดึงรายการสินค้าทั้งหมด (สำหรับหน้า Admin หรือหน้าที่ต้องการ Filter ที่ซับซ้อน)
 * @description รองรับการแบ่งหน้า (Pagination), การค้นหา (Search), การกรองหลายมิติ (Multi-faceted Filtering),
 * และการจัดเรียง (Sorting) อย่างสมบูรณ์
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกสำหรับการ Query
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลสินค้าและข้อมูลการแบ่งหน้า
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
    where.OR = [
      { model: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }
  if (brand && brand !== "ALL") {
    where.brand = brand;
  }

  // --- [MODIFIED] เพิ่มเงื่อนไขสำหรับ Filter ใหม่ ---
  // ตรวจสอบว่ามีการส่งค่ามาและไม่ใช่ 'ALL' ก่อนจะเพิ่มลงใน query
  if (condition && condition !== "ALL") {
    where.condition = condition;
  }
  if (capacity && capacity !== "ALL") {
    where.capacity = capacity;
  }
  if (color && color !== "ALL") {
    where.color = color;
  }

  // 3. สร้างเงื่อนไขการเรียงลำดับ (Order By Clause) - ไม่เปลี่ยนแปลง
  let orderBy = { createdAt: "desc" };
  if (sort === "downPaymentAsc") {
    orderBy = { downPaymentAmount: "asc" };
  } else if (sort === "downPaymentDesc") {
    orderBy = { downPaymentAmount: "desc" };
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
 * สร้างสินค้าใหม่ในระบบ
 * @description ฟังก์ชันนี้จะสร้าง `uniqueId` จากคุณสมบัติของสินค้าโดยอัตโนมัติ
 * และทำการตรวจสอบเพื่อป้องกันการสร้างสินค้าที่ซ้ำซ้อนกัน
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลสินค้าที่ต้องการสร้าง
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์สินค้าที่สร้างขึ้นใหม่
 * @throws {ApiError} หากข้อมูลที่จำเป็นขาดหายไป หรือมีสินค้าที่มีคุณสมบัติเดียวกันอยู่แล้ว (CONFLICT)
 */
const createProduct = async (payload) => {
  const { brand, model, capacity, color, downPaymentAmount, imageUrl, price, installment6Months, installment10Months } =
    payload;

  // 1. ตรวจสอบข้อมูลที่จำเป็น
  if (!brand || !model || !capacity || !downPaymentAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Brand, Model, Capacity, and Down Payment are required.");
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
 * แก้ไขข้อมูลสินค้าที่มีอยู่ รวมถึงการอัปโหลดรูปภาพใหม่
 * @description จัดการตรรกะที่ซับซ้อนในการอัปเดต `uniqueId` เมื่อมีการแก้ไขคุณสมบัติที่เกี่ยวข้อง
 * และป้องกันการอัปเดตที่ทำให้เกิดข้อมูลซ้ำซ้อนกับสินค้าชิ้นอื่น
 * @async
 * @param {string} productId - ID ของสินค้าที่ต้องการแก้ไข
 * @param {object} [file] - ไฟล์รูปภาพใหม่ (ถ้ามี) จาก Multer
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์สินค้าที่อัปเดตแล้ว
 * @throws {ApiError} หากไม่พบสินค้า, ข้อมูลนำเข้าไม่ถูกต้อง, หรือเกิด Conflict กับสินค้าอื่น
 */
const editProduct = async (productId, file, payload) => {
  // --- STAGE 1: VALIDATION ---
  if (!productId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product ID is required.");
  }
  if ((!payload || Object.keys(payload).length === 0) && !file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Update payload or an image file is required.");
  }

  // --- STAGE 2: DATA PREPARATION & SANITIZATION ---
  const dataToUpdate = { ...payload };

  // [NEW] หน่วยปฏิบัติการอัปโหลดไฟล์
  // ทำงานก็ต่อเมื่อมีไฟล์ใหม่ส่งเข้ามาเท่านั้น
  if (file) {
    // ใช้ service ที่เหมาะสมสำหรับการอัปโหลดรูปภาพ Product
    // อาจจะมีการปรับขนาด, optimize, หรือเก็บในโฟลเดอร์ที่แตกต่างจากสลิป
    const imageInfo = await imageService.uploadImage(file, productId);
    dataToUpdate.imageUrl = imageInfo.url; // <-- อัปเดต imageUrl field
  }

  // --- STAGE 3: BUSINESS LOGIC (UNIQUE ID GENERATION) ---

  // ดึงข้อมูลปัจจุบันเพื่อใช้ในการสร้าง/เปรียบเทียบ uniqueId
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!currentProduct) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // สร้าง uniqueId ใหม่จากข้อมูลที่อาจมีการอัปเดต
  const potentiallyUpdatedData = { ...currentProduct, ...dataToUpdate };
  const newUniqueId = generateUniqueId(potentiallyUpdatedData);

  // ตรวจสอบความซ้ำซ้อนก็ต่อเมื่อ uniqueId มีการเปลี่ยนแปลง
  if (newUniqueId !== currentProduct.uniqueId) {
    const existingProduct = await prisma.product.findFirst({
      where: { uniqueId: newUniqueId, NOT: { id: productId } }, // <-- ป้องกันการเจอตัวเอง
    });
    if (existingProduct) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `Another product with these specifications already exists: ${newUniqueId}`,
      );
    }
    dataToUpdate.uniqueId = newUniqueId; // เพิ่ม uniqueId ใหม่เข้าไปใน object ที่จะอัปเดต
  }

  // --- STAGE 4: THE OPERATION ---
  // ทำการอัปเดตข้อมูลในฐานข้อมูล
  const product = await prisma.product.update({
    where: { id: productId },
    data: dataToUpdate, // dataToUpdate มีครบทั้งข้อมูลจาก payload, imageUrl ใหม่, และ uniqueId ใหม่ (ถ้ามี)
  });

  return product;
};

/**
 * ลบสินค้าออกจากระบบ
 * @description มีการป้องกันที่สำคัญ: จะไม่ทำการลบหากสินค้านั้นยังมีการเชื่อมโยงกับ Goal ของผู้ใช้อยู่
 * เพื่อรักษาความสมบูรณ์ของข้อมูล (Data Integrity)
 * @async
 * @param {string} productId - ID ของสินค้าที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของสินค้าที่ถูกลบไป
 * @throws {ApiError} หากไม่พบสินค้า หรือสินค้ายังถูกใช้งานอยู่ใน Goal
 */
const deleteProduct = async (productId) => {
  if (!productId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product ID is required.");
  }

  // ตรวจสอบว่ามี Product นี้อยู่จริงหรือไม่ก่อนลบ
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
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
