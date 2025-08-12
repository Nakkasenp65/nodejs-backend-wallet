import productService from '../services/product.service.js';
import httpStatus from 'http-status';

// GET /products?mode=affordable|upgrade|all&min=&max=&topPerBrand=&take=&skip=&sort=
export const listProducts = async (req, res, next) => {
  try {
    const {
      mode = 'affordable',
      min,
      max,
      minPrice: minPriceQ,
      maxPrice: maxPriceQ,
      topPerBrand,
      take,
      skip,
      sort,
    } = req.query;

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

export default {
  listProducts,
};
