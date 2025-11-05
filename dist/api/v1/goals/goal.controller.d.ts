declare namespace _default {
    export { createGoal };
    export { updateGoal };
    export { getUserGoal };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับสร้างเป้าหมายการออมใหม่
 * @description รับ `userId` จาก URL parameters และข้อมูลเป้าหมาย (mobileId, planId) จาก Request Body,
 * เรียกใช้ Service เพื่อสร้างเป้าหมาย, และส่งข้อมูลเป้าหมายที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createGoal: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับอัปเดตเป้าหมายการออม
 * @description รับ `userId` จาก URL parameters และข้อมูลสำหรับอัปเดต (planId, productId) จาก Request Body,
 * เรียกใช้ Service เพื่ออัปเดตข้อมูล, และส่งข้อมูลเป้าหมายที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const updateGoal: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลเป้าหมายการออมของผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อดึงข้อมูล,
 * และส่งข้อมูลเป้าหมายกลับไปเป็น JSON response
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getUserGoal: (req: any, res: any, next: any) => void;
//# sourceMappingURL=goal.controller.d.ts.map