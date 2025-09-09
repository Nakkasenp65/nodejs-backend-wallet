import productService from '../services/product.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

// GET /products?mode=affordable|upgrade|all&min=&max=&topPerBrand=&take=&skip=&sort=
export const listProducts = async (req, res, next) => {
  try {
    const { mode = 'affordable', min, max, minPrice: minPriceQ, maxPrice: maxPriceQ, topPerBrand, take, skip, sort } = req.query;

    // resolve numbers (null means "no bound")
    let minPrice = min != null ? Number(min) : minPriceQ != null ? Number(minPriceQ) : null;
    let maxPrice = max != null ? Number(max) : maxPriceQ != null ? Number(maxPriceQ) : null;

    // preset behaviors (you can keep or tweak)
    if (mode === 'affordable') {
      // keep minPrice as-is; cap by maxPrice if provided
      // (frontend usually sets maxPrice to their capacity)
    } else if (mode === 'upgrade') {
      // keep maxPrice as-is; leave unbounded if not provided
    } // mode "all" leaves both as given

    const data = await productService.fetchProducts({
      minPrice,
      maxPrice,
      topPerBrand: topPerBrand === 'true' || topPerBrand === '1',
      take: take ? Number(take) : 24,
      skip: skip ? Number(skip) : 0,
      sort: sort === 'desc' ? 'desc' : 'asc',
    });

    return res.status(httpStatus.OK).json(data);
  } catch (err) {
    next(err);
  }
};

const getProducts = catchAsync(async (req, res) => {
  // รับ options (page, pageSize, search, brand, sort) จาก query string
  const result = await productService.getProducts(req.query);
  res.status(httpStatus.OK).json(result);
});

const getProductFilters = catchAsync(async (req, res) => {
  const filters = await productService.getProductFilters();
  res.status(httpStatus.OK).json(filters);
});

const createProduct = catchAsync(async (req, res) => {
  // ส่ง payload ทั้งหมดจาก req.body ไปยัง service
  const newProduct = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).json(newProduct);
});

const editProduct = catchAsync(async (req, res) => {
  // ดึง productId จาก URL parameters
  const { productId } = req.params;
  // ส่ง productId และ payload จาก req.body ไปยัง service
  const updatedProduct = await productService.editProduct(productId, req.body);
  res.status(httpStatus.OK).json(updatedProduct);
});

const deleteProduct = catchAsync(async (req, res) => {
  // ดึง productId จาก URL parameters
  const { productId } = req.params;
  await productService.deleteProduct(productId);
  // เมื่อลบสำเร็จ ส่ง status 204 No Content กลับไป ซึ่งหมายถึงสำเร็จแต่ไม่มีข้อมูลจะส่งกลับ
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  listProducts,
  getProducts,
  getProductFilters,
  createProduct,
  editProduct,
  deleteProduct,
};
