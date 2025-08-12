import express from 'express';
import productController from '../controllers/product.controller.js';

const productRouter = express.Router();

// กำหนดเส้นทาง GET /
// เมื่อมีการเรียกมาที่ /api/product (ตัวอย่าง) จะมาทำงานที่ฟังก์ชันนี้
// และส่งต่อไปยัง productController.getProducts
productRouter.get('/', productController.listProducts);

export default productRouter;
