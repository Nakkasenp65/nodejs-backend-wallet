declare namespace _default {
    export { listProducts };
    export { getProducts };
    export { getProductFilters };
    export { createProduct };
    export { editProduct };
    export { deleteProduct };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการสินค้า (สำหรับหน้าแสดงผลหลัก)
 * @description ดึงข้อมูลสินค้าตาม 'mode' (เช่น affordable, upgrade) และกรองตามช่วงราคา
 * ออกแบบมาเพื่อใช้ในส่วนแสดงผลสำหรับผู้ใช้ทั่วไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่อาจมี `req.query` (mode, minPrice, maxPrice, sort)
 * @param {object} res - อ็อบเจกต์ Express Response
 * @param {function} next - ฟังก์ชัน Express next middleware
 */
declare function listProducts(req: object, res: object, next: Function): Promise<any>;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการสินค้าพร้อม Filter และ Pagination (สำหรับ Admin)
 * @description รับเงื่อนไขการกรองที่ซับซ้อน (search, brand, capacity, color) และการแบ่งหน้าจาก Query String,
 * เรียกใช้ Service, และส่งรายการสินค้าพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getProducts: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลตัวเลือกสำหรับสร้าง Filter UI
 * @description เรียกใช้ Service เพื่อดึงค่าที่ไม่ซ้ำกันทั้งหมดของ brand, capacity, และ color
 * เพื่อนำไปใช้สร้างเป็นตัวเลือกในหน้าจอค้นหาสินค้า
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getProductFilters: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับสร้างสินค้าใหม่
 * @description รับข้อมูลสินค้าจาก Request Body, เรียกใช้ Service เพื่อสร้างสินค้า,
 * และส่งข้อมูลสินค้าที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลสินค้าใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createProduct: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อมูลสินค้า
 * @description รับ `productId` จาก URL parameters, ข้อมูลสำหรับอัปเดตจาก Request Body,
 * และไฟล์รูปภาพ (ถ้ามี) จาก `req.file` จากนั้นเรียกใช้ Service เพื่ออัปเดตข้อมูล
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.productId`, `req.body`, และ `req.file`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const editProduct: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับลบสินค้า
 * @description รับ `productId` จาก URL parameters, เรียกใช้ Service เพื่อลบสินค้า,
 * และส่งสถานะ 204 (No Content) กลับไปเมื่อดำเนินการสำเร็จ
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.productId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const deleteProduct: (req: any, res: any, next: any) => void;
//# sourceMappingURL=product.controller.d.ts.map