declare namespace _default {
    export { createGoalForUser };
    export { getUserGoal };
    export { updateGoalForUser };
}
export default _default;
/**
 * สร้างเป้าหมายการออมใหม่สำหรับผู้ใช้
 * @description ฟังก์ชันนี้จะสร้าง Goal ใหม่โดยเชื่อมโยงกับ User, Product (mobileModel), และ Plan ที่ระบุ
 * พร้อมกันนี้ จะมีการอัปเดตสถานะ `firstTime` ของผู้ใช้เป็น `false` ซึ่งเป็นผลกระทบข้างเคียงที่สำคัญ
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการสร้างเป้าหมายให้
 * @param {object} data - อ็อบเจกต์ข้อมูลสำหรับสร้างเป้าหมาย
 * @param {string} data.mobileId - ID ของสินค้า (Product) ที่เป็นเป้าหมาย
 * @param {string} data.planId - ID ของแผนการออม (Plan) ที่เลือก
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Goal ที่สร้างขึ้นใหม่ พร้อมข้อมูล mobileModel และ plan ที่เกี่ยวข้อง
 */
declare function createGoalForUser(userId: string, data: {
    mobileId: string;
    planId: string;
}): Promise<object>;
/**
 * ดึงข้อมูลเป้าหมายการออมปัจจุบันของผู้ใช้ด้วย `line_user_id`
 * @description ค้นหาเป้าหมายแรกที่พบ (findFirst) และเลือกเฉพาะข้อมูลที่จำเป็นสำหรับแสดงผล
 * ได้แก่ ข้อมูล plan และข้อมูลบางส่วนของ product
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ของผู้ใช้ที่ต้องการดึงข้อมูลเป้าหมาย
 * @returns {Promise<object|null>} Promise ที่ resolve เป็นอ็อบเจกต์ Goal ที่มีข้อมูล plan และ product หรือ `null` หากไม่พบ
 * @throws {ApiError} ในกรณีที่ไม่ได้ระบุ `line_user_id`
 */
declare function getUserGoal(line_user_id: string): Promise<object | null>;
/**
 * อัปเดตข้อมูลเป้าหมายการออมของผู้ใช้
 * @description ค้นหาและอัปเดต Goal โดยใช้ `userId` เป็นเงื่อนไขหลัก ( предполагает one-to-one relationship)
 * @async
 * @param {string} userId - ID ของผู้ใช้เจ้าของเป้าหมายที่ต้องการอัปเดต
 * @param {object} data - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดตใน Goal
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Goal ที่อัปเดตแล้ว
 */
declare function updateGoalForUser(userId: string, data: object): Promise<object>;
//# sourceMappingURL=goal.service.d.ts.map