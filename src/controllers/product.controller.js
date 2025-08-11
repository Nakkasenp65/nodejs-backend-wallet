import productService from '../services/product.service.js';
import httpStatus from 'http-status';

// GET /products?mode=affordable|upgrade|all&min=&max=&topPerBrand=&take=&skip=&sort=
export const listProducts = async (req, res) => {
  const { mode = 'affordable', min, max, topPerBrand, take, skip, sort } = req.query;

  let minPrice = min != null ? Number(min) : null;
  let maxPrice = max != null ? Number(max) : null;

  if (mode === 'affordable') {
    minPrice = minPrice ?? null;
    maxPrice = maxPrice;
  } else if (mode === 'upgrade') {
    minPrice = minPrice;
    maxPrice = maxPrice ?? null;
  } // mode === "all" keeps both null unless provided

  const products = productService.fetchProducts({
    minPrice,
    maxPrice,
    topPerBrand: topPerBrand === 'true',
    take: take ? Number(take) : 24,
    skip: skip ? Number(skip) : 0,
    sort: sort === 'desc' ? 'desc' : 'asc',
  });

  res.status(httpStatus.OK).json(products);
};

export default {
  listProducts,
};
