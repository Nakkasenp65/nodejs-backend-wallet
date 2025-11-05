declare namespace _default {
    export { scheduleSlipVerification };
}
export default _default;
/**
 * จัดตารางงานตรวจสอบสลิปกับ QStash
 * @description ฟังก์ชันนี้จะทำการตรวจสอบการตั้งค่าที่จำเป็น (Token, Webhook URL) ก่อนส่ง Payload
 * ไปยัง QStash เพื่อจัดตารางงานสำหรับการตรวจสอบสลิปในเบื้องหลัง
 * @async
 * @param {string} userId - ID ของ user ที่เป็นเจ้าของธุรกรรม
 * @param {string} transactionId - ID ของ Transaction ที่ต้องการตรวจสอบ
 * @param {string} slipImageUrl - URL ของรูปภาพสลิป
 * @returns {Promise<object|void>} - ข้อมูลการตอบกลับจาก QStash หรือ void ถ้า service ไม่ได้ตั้งค่าไว้
 * @throws {ApiError} - หากการตั้งค่าผิดพลาดหรือการส่งงานล้มเหลว
 */
declare function scheduleSlipVerification(userId: string, transactionId: string, slipImageUrl: string): Promise<object | void>;
//# sourceMappingURL=qstash.service.d.ts.map