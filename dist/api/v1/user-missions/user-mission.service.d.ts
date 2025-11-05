declare namespace _default {
    export { enrollInMission };
    export { claimMissionReward };
    export { getMyMissions };
    export { getMyMissionDetails };
    export { getUserMissionByLineUserId };
    export { editUserMission };
    export { expireOverdueMissions };
    export { checkAndUpdateMissionProgress };
}
export default _default;
/**
 * ดำเนินการสมัครเข้าร่วมภารกิจใหม่ให้ผู้ใช้ภายใต้ Atomic Transaction
 * @description มีการตรวจสอบเงื่อนไขหลายชั้น เช่น ภารกิจหมดอายุ, การสมัครซ้ำ,
 * หรือการมีภารกิจประเภทเดียวกันที่ยังไม่เสร็จสิ้น เพื่อป้องกันข้อมูลที่ไม่สอดคล้องกัน
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการสมัครภารกิจ
 * @param {string} missionId - ID ของภารกิจที่ต้องการสมัคร
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission ที่ถูกสร้างขึ้นใหม่
 * @throws {ApiError} ในกรณีที่ไม่พบภารกิจ, ภารกิจหมดอายุ, สมัครซ้ำ, หรือมีภารกิจประเภทเดียวกันที่ยังดำเนินอยู่
 */
declare function enrollInMission(userId: string, missionId: string): Promise<object>;
/**
 * ดำเนินการให้ผู้ใช้รับรางวัลจากภารกิจที่อยู่ในสถานะ 'AWAITING_CLAIM' ภายใต้ Atomic Transaction
 * @description จะมีการตรวจสอบสิทธิ์, วันหมดอายุการรับรางวัล, จากนั้นสร้าง Transaction รางวัล,
 * เพิ่มโบนัสใน Wallet, และเปลี่ยนสถานะภารกิจเป็น 'CLAIMED'
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่กดรับรางวัล
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการรับรางวัล
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission ที่อัปเดตสถานะแล้ว
 * @throws {ApiError} หากไม่พบภารกิจ, ไม่มีสิทธิ์, สถานะไม่ถูกต้อง, หรือหมดเวลาการรับรางวัล
 */
declare function claimMissionReward(userId: string, userMissionId: string): Promise<object>;
/**
 * ดึงรายการภารกิจทั้งหมดของผู้ใช้ปัจจุบัน พร้อมตัวเลือกในการกรองข้อมูล
 * @description สามารถกรองข้อมูลตามสถานะได้ผ่าน `options.filter`:
 * - ไม่ระบุ filter (default): แสดงเฉพาะภารกิจที่ "กำลังทำ" (ENROLLED, AWAITING_CLAIM) เพื่อประสบการณ์ผู้ใช้ที่ดีที่สุด
 * - 'all': แสดงภารกิจทั้งหมด รวมถึงที่หมดอายุ
 * - 'history': แสดงเฉพาะภารกิจที่จบแล้ว (CLAIMED, EXPIRED, CLAIM_EXPIRED)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกเพิ่มเติม
 * @param {'all'|'history'} [options.filter] - ตัวกรองสถานะภารกิจ
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของ UserMissions
 */
declare function getMyMissions(userId: string, options?: {
    filter?: "all" | "history";
}): Promise<Array<object>>;
/**
 * ดึงข้อมูลรายละเอียดของ UserMission รายการเดียว
 * @async
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการดูรายละเอียด
 * @returns {Promise<object|null>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission หรือ `null` หากไม่พบ
 */
declare function getMyMissionDetails(userMissionId: string): Promise<object | null>;
/**
 * ดึงรายการภารกิจทั้งหมดของผู้ใช้โดยใช้ `line_user_id`
 * @description ออกแบบมาเพื่อประสิทธิภาพโดยการค้นหา `userId` จาก `line_user_id` ก่อน แล้วจึงค้นหาภารกิจ
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของ UserMissions (เป็นอาร์เรย์ว่างหากไม่พบผู้ใช้)
 */
declare function getUserMissionByLineUserId(line_user_id: string): Promise<Array<object>>;
/**
 * แก้ไขข้อมูล UserMission โดย Admin
 * @description ฟังก์ชันนี้ใช้หลัก "Whitelist" เพื่ออนุญาตให้อัปเดตเฉพาะฟิลด์ที่กำหนด (เช่น status, currentProgress)
 * และมีตรรกะอัตโนมัติในการกำหนด `completedAt` และ `claimExpiresAt` เมื่อสถานะเปลี่ยนเป็น `AWAITING_CLAIM`
 * @async
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการแก้ไข
 * @param {object} updateBody - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission ที่อัปเดตแล้ว
 * @throws {ApiError} หากข้อมูลนำเข้าไม่ถูกต้อง หรือไม่พบ UserMission
 */
declare function editUserMission(userMissionId: string, updateBody: object): Promise<object>;
/**
 * จัดการภารกิจที่หมดอายุ (สำหรับ Cron Job)
 * @description ฟังก์ชันนี้ถูกออกแบบมาเพื่อเรียกใช้งานโดย Cron Job เพื่อเปลี่ยนสถานะภารกิจที่หมดอายุ
 * โดยจะจัดการ 2 กรณี: 1) ENROLLED -> EXPIRED และ 2) AWAITING_CLAIM -> CLAIM_EXPIRED
 * @async
 * @returns {Promise<{expiredCount: number, claimExpiredCount: number}>} Promise ที่ resolve เป็นอ็อบเจกต์สรุปจำนวนภารกิจที่อัปเดต
 * @throws {ApiError} หากเกิดข้อผิดพลาดระหว่างการประมวลผล
 */
declare function expireOverdueMissions(): Promise<{
    expiredCount: number;
    claimExpiredCount: number;
}>;
/**
 * ตรวจสอบและอัปเดตความคืบหน้าของภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ตาม Event ที่เกิดขึ้น
 * @description ฟังก์ชันนี้ทำหน้าที่เป็น Event Handler หลัก จะค้นหาภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
 * และคำนวณ Progress ที่จะเพิ่มขึ้นตามประเภทของ Event (eventType) และประเภทของภารกิจ
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่เกิด Event
 * @param {string} eventType - ประเภทของ Event (เช่น 'DEPOSIT_SUCCESS', 'NEWCOMER_FIRST_DEPOSIT')
 * @param {object} eventData - ข้อมูลเพิ่มเติมเกี่ยวกับ Event (เช่น `{ amount: 100 }`)
 * @returns {Promise<void>}
 */
declare function checkAndUpdateMissionProgress(userId: string, eventType: string, eventData: object): Promise<void>;
//# sourceMappingURL=user-mission.service.d.ts.map