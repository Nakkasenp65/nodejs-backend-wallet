/**
 * @file เซอร์วิสสำหรับจัดการการเชื่อมต่อกับ QStash (Background Job Scheduler)
 * @description ไฟล์นี้ทำหน้าที่เป็นตัวกลางในการสื่อสารกับ Upstash QStash API
 * เพื่อมอบหมายงานที่ใช้เวลานาน (เช่น การตรวจสอบสลิป) ไปประมวลผลในเบื้องหลัง (asynchronously)
 * @module services/qstash
 * @requires @upstash/qstash - Client library อย่างเป็นทางการสำหรับ QStash
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import { Client } from "@upstash/qstash";
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
async function scheduleSlipVerification(userId, transactionId, slipImageUrl) {
    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashClient = qstashToken ? new Client({ token: qstashToken }) : null;
    if (!qstashClient) {
        console.error("CRITICAL: QSTASH_TOKEN is not defined. QStash service will be disabled.");
    }
    if (!qstashClient) {
        // ไม่โยน Error ที่จะทำให้ user flow พัง แต่ log ไว้เพื่อให้นักพัฒนาทราบ
        console.warn(`QStash service is not configured. Skipping verification for TxID: ${transactionId}`);
        return; // จบการทำงานอย่างเงียบๆ
    }
    // ดึงค่า URL จาก Environment Variables ---
    const webhookUrl = process.env.QSTASH_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error("CRITICAL: QSTASH_WEBHOOK_URL is not defined in .env file.");
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "QStash webhook URL is not configured.");
    }
    const payload = { userId, slipImageUrl, transactionId };
    try {
        console.log(`Scheduling slip verification for TxID: ${transactionId} to ${webhookUrl}`);
        const qstashResponse = await qstashClient.publishJSON({
            url: webhookUrl,
            body: payload,
            retries: 0,
            // ไม่จำเป็นต้องระบุ method หรือ headers อีกต่อไป
        });
        console.log("QStash task scheduled successfully:", qstashResponse);
        return qstashResponse;
    }
    catch (error) {
        // --- Best Practice 5: จัดการ Error ให้ชัดเจน ---
        // Log error ที่ได้จาก QStash เพื่อการดีบักที่ง่ายขึ้น
        const errorMessage = error.message || "An unknown error occurred";
        console.error(`Failed to schedule task with QStash for TxID ${transactionId}:`, errorMessage);
        // โยน Error ที่มีความหมายชัดเจนกลับไป
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Could not schedule slip verification task: ${errorMessage}`);
    }
}
export default { scheduleSlipVerification };
//# sourceMappingURL=qstash.service.js.map