declare namespace _default {
    export { fetchProducts };
    export { getProducts };
    export { getProductFilters };
    export { createProduct };
    export { editProduct };
    export { deleteProduct };
}
export default _default;
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
declare function fetchProducts(opts?: {
    minPrice?: number | string;
    maxPrice?: number | string;
    sort?: "asc" | "desc";
}): Promise<Array<object>>;
/**
 * ดึงรายการสินค้าทั้งหมด (สำหรับหน้า Admin หรือหน้าที่ต้องการ Filter ที่ซับซ้อน)
 * @description รองรับการแบ่งหน้า (Pagination), การค้นหา (Search), การกรองหลายมิติ (Multi-faceted Filtering),
 * และการจัดเรียง (Sorting) อย่างสมบูรณ์
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกสำหรับการ Query
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลสินค้าและข้อมูลการแบ่งหน้า
 */
declare function getProducts(options?: object): Promise<{
    data: Array<object>;
    paging: object;
}>;
/**
ดึงข้อมูลตัวเลือกทั้งหมดสำหรับใช้สร้าง UI Filter ในหน้าสินค้า
@description ใช้ prisma.$transaction และ distinct เพื่อดึงค่าที่ไม่ซ้ำกันของ brand, capacity, และ color
ทั้งหมดพร้อมกันในครั้งเดียวเพื่อประสิทธิภาพสูงสุด
@async
@returns {Promise<{brands: Array<string>, capacities: Array<string>, colors: Array<string>}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยอาร์เรย์ของตัวเลือก Filter
*/
declare function getProductFilters(): Promise<{
    brands: Array<string>;
    capacities: Array<string>;
    colors: Array<string>;
}>;
/**
 * สร้างสินค้าใหม่ในระบบ
 * @description ฟังก์ชันนี้จะสร้าง `uniqueId` จากคุณสมบัติของสินค้าโดยอัตโนมัติ
 * และทำการตรวจสอบเพื่อป้องกันการสร้างสินค้าที่ซ้ำซ้อนกัน
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลสินค้าที่ต้องการสร้าง
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์สินค้าที่สร้างขึ้นใหม่
 * @throws {ApiError} หากข้อมูลที่จำเป็นขาดหายไป หรือมีสินค้าที่มีคุณสมบัติเดียวกันอยู่แล้ว (CONFLICT)
 */
declare function createProduct(payload: object): Promise<object>;
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
declare function editProduct(productId: string, file?: object, payload: object): Promise<object>;
/**
 * ลบสินค้าออกจากระบบ
 * @description มีการป้องกันที่สำคัญ: จะไม่ทำการลบหากสินค้านั้นยังมีการเชื่อมโยงกับ Goal ของผู้ใช้อยู่
 * เพื่อรักษาความสมบูรณ์ของข้อมูล (Data Integrity)
 * @async
 * @param {string} productId - ID ของสินค้าที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของสินค้าที่ถูกลบไป
 * @throws {ApiError} หากไม่พบสินค้า หรือสินค้ายังถูกใช้งานอยู่ใน Goal
 */
declare function deleteProduct(productId: string): Promise<object>;
//# sourceMappingURL=product.service.d.ts.map