declare namespace _default {
    export { getBroadcasts };
    export { createBroadcast };
    export { updateBroadcast };
    export { deleteBroadcast };
    export { sendBroadcast };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการข้อความประกาศทั้งหมด (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้าและการค้นหาจาก Query String, เรียกใช้ Service,
 * และส่งรายการข้อความประกาศพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query` (page, pageSize, search)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getBroadcasts: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับสร้างข้อความประกาศฉบับร่างใหม่ (สำหรับ Admin)
 * @description รับข้อมูล (title, body) จาก Request Body, เรียกใช้ Service,
 * และส่งข้อมูล Broadcast ที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลใน req.body
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createBroadcast: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อความประกาศ (สำหรับ Admin)
 * @description รับ `broadcastId` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service, และส่งข้อมูล Broadcast ที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.broadcastId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const updateBroadcast: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับลบข้อความประกาศ (สำหรับ Admin)
 * @description รับ `broadcastId` จาก URL parameters, เรียกใช้ Service เพื่อลบ,
 * และส่งสถานะ 204 (No Content) กลับไปเมื่อดำเนินการสำเร็จ
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.broadcastId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const deleteBroadcast: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับส่งข้อความประกาศไปยังผู้ใช้ทุกคน (สำหรับ Admin)
 * @description รับ `broadcastId` จาก URL parameters, เรียกใช้ Service เพื่อเริ่มกระบวนการส่ง,
 * และส่งผลลัพธ์การดำเนินการ (เช่น จำนวนผู้รับ) กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.broadcastId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const sendBroadcast: (req: any, res: any, next: any) => void;
//# sourceMappingURL=broadcast.controller.d.ts.map