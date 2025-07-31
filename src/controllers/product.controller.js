import productService from '../services/product.service.js';

/**
 * Controller สำหรับรับ request และดึงข้อมูลสินค้า
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getProducts = async (req, res) => {
  const products = await productService.fetchProducts(req.query.maxPrice);
  res.status(200).json(products);
};

export default {
  getProducts,
};
