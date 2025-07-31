import express from 'express';
import productController from '../controllers/product.controller.js';
import productValidation from '../validations/product.validation.js';
import validate from '../middlewares/validate.js';

const productRouter = express.Router();

// กำหนดเส้นทาง GET /
// เมื่อมีการเรียกมาที่ /api/products (ตัวอย่าง) จะมาทำงานที่ฟังก์ชันนี้
// และส่งต่อไปยัง productController.getProducts
productRouter.get('/', validate(productValidation.getProducts), productController.getProducts);

export default productRouter;
