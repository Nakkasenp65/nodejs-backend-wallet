import productService from '../services/product.service.js';

const getProducts = async (req, res) => {
  const products = await productService.fetchProducts(req.query.maxPrice);
  // const products = await productService.fetchProducts();
  res.status(200).json(products);
};

export default {
  getProducts,
};
