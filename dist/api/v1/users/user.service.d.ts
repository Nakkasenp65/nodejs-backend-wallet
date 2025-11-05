declare namespace _default {
    export { checkUserStatus };
    export { getUsers };
    export { getUser };
    export { findRecipient };
    export { getUserFirstTimeById };
    export { createUserWithGoal };
    export { updateUser };
    export { updateUserByAdmin };
    export { deleteUser };
    export { getReferralHistory };
    export { createReferral };
    export { setUserReferCode };
    export { setLocked };
    export { unlock };
    export { getLockStatus };
}
export default _default;
/**
 * ตรวจสอบสถานะของผู้ใช้จาก line_user_id เพื่อระบุว่าเป็นผู้ใช้ใหม่หรือไม่ และสถานะการล็อก
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการตรวจสอบ
 * @returns {Promise<({isNewUser: true, isLocked: undefined}|{isNewUser: false, isLocked: boolean})>} Promise ที่ resolve เป็นอ็อบเจกต์
 * - `{ isNewUser: true }` หากไม่พบผู้ใช้
 * - `{ isNewUser: false, isLocked: boolean }` หากพบผู้ใช้
 * @throws {ApiError} หากไม่ได้ระบุ `line_user_id` หรือเกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล
 */
declare function checkUserStatus(line_user_id: string): Promise<({
    isNewUser: true;
    isLocked: undefined;
} | {
    isNewUser: false;
    isLocked: boolean;
})>;
/**
 * ดึงรายการผู้ใช้ทั้งหมดพร้อมระบบแบ่งหน้า (Pagination) และการกรองข้อมูล
 * @async
 * @param {object} [options={}] - อ็อบเจกต์สำหรับกำหนดเงื่อนไขการค้นหา
 * @param {number|string} [options.page=1] - เลขหน้าปัจจุบัน
 * @param {number|string} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.search] - คำค้นหาสำหรับชื่อที่แสดงใน LINE หรือชื่อเต็ม
 * @param {string} [options.role] - กรองตามบทบาทของผู้ใช้ (Role)
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลผู้ใช้และข้อมูลการแบ่งหน้า
 */
declare function getUsers(options?: {
    page?: number | string;
    pageSize?: number | string;
    search?: string;
    role?: string;
}): Promise<{
    data: Array<object>;
    paging: object;
}>;
/**
 * ดึงข้อมูลผู้ใช้ตาม `line_user_id` พร้อมข้อมูลที่จำเป็นสำหรับหน้าโปรไฟล์
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<object|null>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้พร้อมข้อมูล Wallet หรือ `null` หากไม่พบ
 */
declare function getUser(line_user_id: string): Promise<object | null>;
/**
 * ค้นหาผู้รับ (Recipient) โดยใช้เบอร์โทรศัพท์หรือรหัส Wallet
 * @async
 * @param {object} criteria - อ็อบเจกต์เงื่อนไขการค้นหา
 * @param {'phone'|'walletId'} criteria.type - ประเภทการค้นหา
 * @param {string} criteria.value - ค่าที่ใช้ค้นหา
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลผู้ใช้ที่ค้นพบ
 * @throws {ApiError} หากข้อมูลนำเข้าไม่ถูกต้อง, ประเภทการค้นหาไม่รองรับ, หรือไม่พบผู้ใช้
 */
declare function findRecipient({ type, value }: {
    type: "phone" | "walletId";
    value: string;
}): Promise<object>;
/**
 * ดึงสถานะ firstTime ของผู้ใช้จาก ID ภายในของระบบ
 * @async
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูล
 * @returns {Promise<{firstTime: boolean}>} Promise ที่ resolve เป็นอ็อบเจกต์สถานะ firstTime
 * @throws {ApiError} หากไม่พบผู้ใช้
 */
declare function getUserFirstTimeById(userId: string): Promise<{
    firstTime: boolean;
}>;
/**
 * สร้างผู้ใช้ใหม่พร้อมตั้งค่าเริ่มต้นที่จำเป็นทั้งหมดภายใน Atomic Transaction เดียว
 * @description กระบวนการนี้จะสร้าง User, Wallet, Goal, UserMissions, Welcome Bonus Transaction,
 * Notifications, และ Referral record (ถ้ามี) พร้อมกันทั้งหมด
 * @async
 * @param {object} userData - อ็อบเจกต์ข้อมูลสำหรับการลงทะเบียนผู้ใช้ใหม่
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่สร้างขึ้นใหม่พร้อมข้อมูลที่เกี่ยวข้องทั้งหมด
 * @throws {ApiError} หากมีผู้ใช้ที่มี `line_user_id` นี้อยู่แล้วในระบบ (CONFLICT)
 */
declare function createUserWithGoal(userData: object): Promise<object>;
/**
 * อัปเดตข้อมูลโปรไฟล์ของผู้ใช้โดยใช้ `line_user_id`
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการอัปเดต
 * @param {object} updateData - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต (fullname, phone, etc.)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้วพร้อมข้อมูลที่เกี่ยวข้องทั้งหมด
 * @throws {ApiError} หากไม่ได้ระบุ `line_user_id`, ไม่พบผู้ใช้, หรือเกิดข้อผิดพลาดจากฐานข้อมูล
 */
declare function updateUser(line_user_id: string, updateData: object): Promise<object>;
/**
 * อัปเดตข้อมูลผู้ใช้โดย Admin (ใช้ ID ภายในระบบ)
 * @description ฟังก์ชันนี้อนุญาตให้ Admin แก้ไขฟิลด์ที่จำกัด เช่น role
 * @async
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูล
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต (fullname, phone, role, etc.)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้ว
 */
declare function updateUserByAdmin(userId: string, payload: object): Promise<object>;
/**
 * ลบผู้ใช้ออกจากระบบอย่างถาวรพร้อมข้อมูลที่เกี่ยวข้องทั้งหมดภายใน Atomic Transaction
 * @description ใช้ Prisma's onDelete: Cascade เพื่อลบข้อมูลที่ผูกกันทั้งหมด เช่น Wallet, Goal, Transactions ฯลฯ
 * @async
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูลที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลของผู้ใช้ที่ถูกลบไป (สำหรับใช้ในการบันทึก Log)
 * @throws {ApiError} หากไม่ได้ระบุ `userId` หรือไม่พบผู้ใช้
 */
declare function deleteUser(userId: string): Promise<object>;
/**
 * ดึงประวัติการแนะนำเพื่อนของผู้ใช้ที่ระบุ
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ของผู้ที่ต้องการดูประวัติ
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของข้อมูลการแนะนำเพื่อน
 * @throws {ApiError} หากไม่พบผู้ใช้
 */
declare function getReferralHistory(line_user_id: string): Promise<Array<object>>;
/**
 * สร้างบันทึกการแนะนำ (Referral Record) เพื่อเชื่อมโยงผู้แนะนำและผู้ใช้ใหม่
 * @async
 * @param {string} newcomerId - ID ของผู้ใช้ใหม่ (ผู้ถูกแนะนำ)
 * @param {string} referralCode - โค้ดของผู้แนะนำ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Referral ที่สร้างขึ้นใหม่
 * @throws {Error} หากข้อมูลไม่ครบถ้วน, โค้ดไม่ถูกต้อง, แนะนำตัวเอง, หรือผู้ใช้ใหม่เคยถูกแนะนำแล้ว
 */
declare function createReferral(newcomerId: string, referralCode: string): Promise<object>;
/**
 * ตั้งค่าหรืออัปเดตโค้ดผู้แนะนำที่ผู้ใช้คนนี้ถูกแนะนำมา (referToCode)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} referCode - โค้ดของผู้แนะนำ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้ว
 */
declare function setUserReferCode(userId: string, referCode: string): Promise<object>;
/**
 * ตั้งสถานะของผู้ใช้เป็นล็อก (isLocked = true)
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้ว
 */
declare function setLocked(line_user_id: string): Promise<object>;
/**
 * ปลดล็อกผู้ใช้โดยการเปรียบเทียบ PIN ที่ส่งมากับ PIN ที่จัดเก็บไว้อย่างปลอดภัย
 * @description ใช้ `crypto.timingSafeEqual` เพื่อป้องกัน Timing Attacks
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @param {string|number} pin - PIN ที่ผู้ใช้ป้อนเข้ามาเพื่อปลดล็อก
 * @returns {Promise<{message: string}>} Promise ที่ resolve เป็นข้อความยืนยันการปลดล็อกสำเร็จ
 * @throws {ApiError} หาก PIN ไม่ถูกต้อง
 */
declare function unlock(line_user_id: string, pin: string | number): Promise<{
    message: string;
}>;
/**
 * ดึงสถานะการล็อก (isLocked) ของผู้ใช้
 * @description ออกแบบมาให้ทำงานอย่างปลอดภัย โดยจะคืนค่า isLocked: true หากไม่พบผู้ใช้หรือเกิดข้อผิดพลาด
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<{isLocked: boolean}>} Promise ที่ resolve เป็นอ็อบเจกต์สถานะการล็อก
 */
declare function getLockStatus(line_user_id: string): Promise<{
    isLocked: boolean;
}>;
//# sourceMappingURL=user.service.d.ts.map