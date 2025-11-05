declare namespace _default {
    export { getDashboardData };
}
export default _default;
/**
 * ดึงข้อมูลสรุปสำหรับ Admin Dashboard
 * @description ใช้ `Promise.all` เพื่อดึงข้อมูลสถิติหลายส่วนพร้อมกันในครั้งเดียวเพื่อประสิทธิภาพสูงสุด
 * สถิติที่ดึงมาประกอบด้วย: ยอดผู้ใช้ทั้งหมด, ยอดเงินออมในระบบ, จำนวนผู้ใช้ใหม่และยอดเงินฝากในเดือนปัจจุบัน,
 * จำนวนธุรกรรมที่รอตรวจสอบ, และข้อมูลสรุปเกี่ยวกับภารกิจและรางวัล
 * @async
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลสรุปสำหรับ Dashboard
 * @property {object} summary - ข้อมูลสรุปภาพรวมทั้งหมด
 * @property {number} summary.totalUsers - จำนวนผู้ใช้ทั้งหมดในระบบ
 * @property {number} summary.totalSavingsBalance - ยอดเงินออมคงเหลือรวมทั้งระบบ
 * @property {number} summary.pendingTransactionsCount - จำนวนธุรกรรมที่รอการตรวจสอบ
 * @property {number} summary.activeMissionsCount - จำนวนภารกิจที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
 * @property {object} monthlyActivity - ข้อมูลสรุปกิจกรรมในเดือนปัจจุบัน
 * @property {number} monthlyActivity.newUsersThisMonth - จำนวนผู้ใช้ใหม่ในเดือนนี้
 * @property {number} monthlyActivity.depositsThisMonth - ยอดเงินฝากที่สำเร็จในเดือนนี้
 * @property {number} monthlyActivity.rewardsPaidThisMonth - ยอดรางวัลที่จ่ายไปในเดือนนี้
 * @throws {Error} โยน `Error` หากเกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล
 */
declare function getDashboardData(): Promise<object>;
//# sourceMappingURL=admin.service.d.ts.map