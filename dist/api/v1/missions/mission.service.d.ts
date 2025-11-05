declare namespace _default {
    export { createMission };
    export { updateMission };
    export { getAllMissionsForAdmin };
    export { getAvailableMissions };
    export { getDetailsMission };
    export { deleteMission };
    export { editMission };
}
export default _default;
/**
 * สร้างภารกิจใหม่ในระบบ (สำหรับ Admin)
 * @description ใช้ Zod Schema ในการตรวจสอบความถูกต้องของข้อมูล (Validation) ที่ส่งเข้ามาอย่างเข้มงวด
 * ก่อนที่จะสร้างข้อมูลลงในฐานข้อมูล
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลของภารกิจที่ต้องการสร้าง
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ภารกิจที่สร้างขึ้นใหม่
 * @throws {Error} หากข้อมูลไม่ถูกต้องตาม Schema (ZodError) หรือเกิดข้อผิดพลาดจากฐานข้อมูล
 */
declare function createMission(payload: object): Promise<object>;
/**
 * แก้ไขรายละเอียดของภารกิจที่มีอยู่ (สำหรับ Admin)
 * @async
 * @param {string} missionId - ID ของภารกิจที่ต้องการแก้ไข
 * @param {object} updateData - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ภารกิจที่อัปเดตแล้ว
 */
declare function updateMission(missionId: string, updateData: object): Promise<object>;
/**
 * ดึงข้อมูลภารกิจทั้งหมดสำหรับหน้า Admin พร้อมรองรับการกรอง, จัดเรียง, แบ่งหน้า, และสถิติ
 * @description ฟังก์ชันนี้ถูกปรับปรุงประสิทธิภาพโดยการใช้ `_count` เพื่อนับจำนวนผู้เข้าร่วมแทนการดึงข้อมูลทั้งหมด
 * และใช้ `$transaction` เพื่อดึงข้อมูลสถิติสรุป (total, active, soon) พร้อมกันในครั้งเดียว
 * @async
 * @param {object} [options={}] - ตัวเลือกสำหรับ Query
 * @returns {Promise<{data: Array<object>, paging: object, stats: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลภารกิจ, การแบ่งหน้า, และสถิติ
 */
declare function getAllMissionsForAdmin(options?: object): Promise<{
    data: Array<object>;
    paging: object;
    stats: object;
}>;
/**
 * ดึงข้อมูลภารกิจที่ผู้ใช้ "สามารถเข้าร่วมได้"
 * @description ตรวจสอบเงื่อนไข 3 ชั้นเพื่อกรองภารกิจ:
 * 1. ภารกิจยังไม่หมดเขต
 * 2. ผู้ใช้ยังไม่เคยเข้าร่วมภารกิจนี้มาก่อน
 * 3. ผู้ใช้ไม่มีภารกิจประเภท (type) เดียวกันที่กำลังดำเนินอยู่ (ENROLLED หรือ AWAITING_CLAIM)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของภารกิจที่ผู้ใช้สามารถเข้าร่วมได้
 */
declare function getAvailableMissions(userId: string): Promise<Array<object>>;
/**
 * (Admin) ดึงข้อมูลภารกิจเชิงลึก (Mission Details)
 * @description ใช้ `prisma.$transaction` เพื่อดึงข้อมูล 4 ส่วนพร้อมกันอย่างมีประสิทธิภาพ:
 * 1. ข้อมูลหลักของภารกิจ
 * 2. สถิติสรุป (จำนวนผู้เข้าร่วมทั้งหมด, แยกตามสถานะ) โดยใช้ `groupBy`
 * 3. รายชื่อผู้เข้าร่วมแบบแบ่งหน้า (Paginated)
 * @async
 * @param {string} missionId - ID ของภารกิจที่ต้องการดูรายละเอียด
 * @param {object} [options={}] - ตัวเลือกสำหรับ Query (ใช้สำหรับ Pagination ของรายชื่อผู้เข้าร่วม)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลเชิงลึกทั้งหมดของภารกิจ
 * @throws {ApiError} หากไม่พบภารกิจ
 */
declare function getDetailsMission(missionId: string, options?: object): Promise<object>;
/**
 * ลบภารกิจออกจากระบบ (สำหรับ Admin)
 * @async
 * @param {string} missionId - ID ของภารกิจที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของภารกิจที่ถูกลบไป
 * @throws {ApiError} หากไม่ได้ระบุ `missionId`
 */
declare function deleteMission(missionId: string): Promise<object>;
/**
 * แก้ไขรายละเอียดของภารกิจที่มีอยู่ (สำหรับ Admin) - (เวอร์ชันรับ Payload เต็ม)
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต ซึ่งต้องมี `id` ของภารกิจอยู่ด้วย
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ภารกิจที่อัปเดตแล้ว
 * @throws {ApiError} หากไม่ได้ระบุ `id` หรือ `title` ใน payload
 */
declare function editMission(payload: object): Promise<object>;
//# sourceMappingURL=mission.service.d.ts.map