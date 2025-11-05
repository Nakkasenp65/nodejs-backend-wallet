declare namespace _default {
    export { createUser };
    export { updateUser };
    export { getUser };
    export { getUsers };
    export { searchRecipient };
    export { checkStatus };
    export { getReferralHistory };
    export { createReferral };
    export { setLocked };
    export { unlock };
    export { getLockStatus };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับสร้างผู้ใช้ใหม่
 * @description รับข้อมูลผู้ใช้จาก Request Body, เรียกใช้ Service เพื่อสร้างผู้ใช้,
 * และส่งข้อมูลผู้ใช้ที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลผู้ใช้ใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createUser: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับอัปเดตข้อมูลผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service เพื่ออัปเดตข้อมูล, และส่งข้อมูลผู้ใช้ที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const updateUser: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลผู้ใช้รายบุคคล
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อดึงข้อมูล,
 * และส่งข้อมูลผู้ใช้กลับไปเป็น JSON response
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getUser: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการผู้ใช้ทั้งหมด
 * @description รับเงื่อนไขการกรองและการแบ่งหน้าจาก Query String, เรียกใช้ Service,
 * และส่งรายการผู้ใช้พร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่อาจมี `req.query` (page, pageSize, search, role)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getUsers: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับค้นหาผู้รับ (Recipient)
 * @description รับประเภทและค่าที่ใช้ค้นหาจาก Query String (`type`, `value`),
 * เรียกใช้ Service เพื่อค้นหา, และส่งข้อมูลผู้ใช้ที่พบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query.type` และ `req.query.value`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const searchRecipient: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับตรวจสอบสถานะผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อตรวจสอบ,
 * และส่งสถานะ (เป็นผู้ใช้ใหม่หรือไม่, สถานะการล็อก) กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const checkStatus: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงประวัติการแนะนำเพื่อน
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service,
 * และส่งประวัติการแนะนำเพื่อนกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getReferralHistory: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับสร้างบันทึกการแนะนำ
 * @description รับ `newcomerId` และ `referralCode` จาก Request Body,
 * เรียกใช้ Service เพื่อสร้างบันทึก, และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.body.newcomerId` และ `req.body.referralCode`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createReferral: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับตั้งสถานะล็อกบัญชีผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อล็อกบัญชี,
 * และส่งข้อความยืนยันกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const setLocked: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับปลดล็อกบัญชีผู้ใช้
 * @description รับ `line_user_id` และ `pin` จาก Request Body,
 * เรียกใช้ Service เพื่อปลดล็อก, และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.body.line_user_id` และ `req.body.pin`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const unlock: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงสถานะการล็อกและสถานะความเป็นผู้ใช้ใหม่
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service ที่เกี่ยวข้อง,
 * และส่งสถานะ `isLocked` และ `isNewUser` กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getLockStatus: (req: any, res: any, next: any) => void;
//# sourceMappingURL=user.controller.d.ts.map