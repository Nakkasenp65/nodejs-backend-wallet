declare namespace _default {
    export { getNotifications };
    export { markAsRead };
    export { clearNotifications };
    export { getSystemNotifications };
    export { createSystemNotification };
    export { editNotification };
    export { deleteNotification };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการการแจ้งเตือนทั้งหมดของผู้ใช้
 * @description รับ `userId` จาก URL parameters, เรียกใช้ Service เพื่อดึงข้อมูล,
 * และส่งรายการการแจ้งเตือนกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getNotifications: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับอัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว"
 * @description รับ `notificationId` จาก URL parameters, เรียกใช้ Service เพื่ออัปเดตสถานะ,
 * และส่งข้อมูลการแจ้งเตือนที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.notificationId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const markAsRead: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับล้างการแจ้งเตือนของผู้ใช้ตามประเภท
 * @description รับ `userId` จาก URL parameters และ `type` จาก Query String,
 * เรียกใช้ Service เพื่อลบการแจ้งเตือน, และส่งผลลัพธ์การดำเนินการกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และ `req.query.type`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const clearNotifications: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการการแจ้งเตือนของระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้าและการค้นหาจาก Query String, เรียกใช้ Service,
 * และส่งรายการการแจ้งเตือนพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query` (page, pageSize, search)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getSystemNotifications: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับสร้างการแจ้งเตือนของระบบ (สำหรับ Admin)
 * @description รับข้อมูลการแจ้งเตือนจาก Request Body, เรียกใช้ Service,
 * และส่งข้อมูลการแจ้งเตือนที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createSystemNotification: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขการแจ้งเตือน (สำหรับ Admin)
 * @description รับ `notificationId` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service, และส่งข้อมูลการแจ้งเตือนที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.notificationId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const editNotification: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับลบการแจ้งเตือนรายการเดียว
 * @description รับ `notificationId` จาก URL parameters, เรียกใช้ Service เพื่อลบ,
 * และส่งข้อมูลการแจ้งเตือนที่ถูกลบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.notificationId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const deleteNotification: (req: any, res: any, next: any) => void;
//# sourceMappingURL=notification.controller.d.ts.map