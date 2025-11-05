/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการสินค้า (Product)
 * @description ไฟล์นี้ทำหน้าที่กำหนด API Endpoint หลักสำหรับดึงข้อมูลสินค้า
 * โดยเชื่อมต่อเส้นทางเข้ากับฟังก์ชัน Controller ที่เหมาะสม
 * @module routes/product
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/product.controller - Controller ที่บรรจุตรรกะการจัดการ Product
 */
import express from "express";
import productController from "./product.controller.js";
const productRouter = express.Router();
/**
 * @route GET /api/products
 * @description ดึงรายการสินค้าทั้งหมดพร้อมตัวเลือกการกรองและจัดเรียง
 * @description Endpoint นี้ออกแบบมาเพื่อใช้ในหน้าแสดงผลสินค้าสำหรับผู้ใช้ทั่วไป
 * @access Public
 * @query {string} [mode='affordable'] - โหมดการดึงข้อมูล ('affordable', 'upgrade', 'all')
 * @query {number} [minPrice] - ราคาวางดาวน์ขั้นต่ำ
 * @query {number} [maxPrice] - ราคาวางดาวน์สูงสุด
 * @query {string} [sort='asc'] - การเรียงลำดับตามราคา ('asc', 'desc')
 */
productRouter.get("/", productController.listProducts);
export default productRouter;
//# sourceMappingURL=product.route.js.map