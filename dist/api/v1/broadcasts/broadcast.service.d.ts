declare namespace _default {
    export { createBroadcast };
    export { getBroadcasts };
    export { updateBroadcast };
    export { deleteBroadcast };
    export { sendBroadcastToAllUsers };
}
export default _default;
/**
 * (Admin) สร้างข้อความประกาศฉบับร่าง (Draft) ใหม่
 * @description สร้างบันทึก Broadcast ใหม่ในฐานข้อมูลด้วยสถานะเริ่มต้นเป็น 'DRAFT'
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลสำหรับสร้างข้อความประกาศ
 * @param {string} payload.title - หัวข้อของข้อความประกาศ
 * @param {string} [payload.body] - เนื้อหาของข้อความประกาศ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Broadcast ที่สร้างขึ้นใหม่
 * @throws {ApiError} หากไม่ได้ระบุ `title`
 */
declare function createBroadcast(payload: {
    title: string;
    body?: string;
}): Promise<object>;
/**
 * (Admin) ดึงรายการข้อความประกาศทั้งหมดสำหรับหน้าจัดการ
 * @description รองรับการแบ่งหน้า (Pagination) และการค้นหา (Search) จาก title และ body
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกสำหรับ Query
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลข้อความประกาศและข้อมูลการแบ่งหน้า
 */
declare function getBroadcasts(options?: object): Promise<{
    data: Array<object>;
    paging: object;
}>;
/**
 * (Admin) แก้ไขข้อความประกาศ
 * @async
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการแก้ไข
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Broadcast ที่อัปเดตแล้ว
 */
declare function updateBroadcast(broadcastId: string, payload: object): Promise<object>;
/**
 * (Admin) ลบข้อความประกาศ
 * @async
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของ Broadcast ที่ถูกลบไป
 */
declare function deleteBroadcast(broadcastId: string): Promise<object>;
/**
 * (Admin) **ฟังก์ชันสำคัญ:** ส่งข้อความประกาศไปยังผู้ใช้ทุกคนในระบบแบบ Atomic Operation
 * @description กระบวนการนี้จะทำงานภายใน `prisma.$transaction` เพื่อรับประกันความถูกต้องของข้อมูล:
 * 1. ดึงข้อมูล Broadcast ต้นฉบับและตรวจสอบว่ายังไม่เคยถูกส่ง
 * 2. ดึง ID ของผู้ใช้ทั้งหมดในระบบ
 * 3. ใช้ `prisma.notification.createMany` เพื่อสร้าง Notification ส่วนบุคคลสำหรับผู้ใช้ทุกคนในคำสั่งเดียว
 * 4. อัปเดตสถานะของ Broadcast ต้นฉบับเป็น 'SENT' พร้อมบันทึกเวลาและจำนวนผู้รับ
 * @async
 * @param {string} broadcastId - ID ของ Broadcast ที่ต้องการส่ง
 * @returns {Promise<{message: string}>} Promise ที่ resolve เป็นข้อความสรุปผลการดำเนินการ
 * @throws {ApiError} หากไม่พบ Broadcast หรือเคยถูกส่งไปแล้ว
 */
declare function sendBroadcastToAllUsers(broadcastId: string): Promise<{
    message: string;
}>;
//# sourceMappingURL=broadcast.service.d.ts.map