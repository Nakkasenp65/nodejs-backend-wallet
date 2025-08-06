import { Client } from '@upstash/qstash';

/**
 * จัดตารางงานตรวจสอบสลิปกับ QStash โดยใช้ Best Practices
 * @param {string} transactionId - ID ของ Transaction ที่ต้องการตรวจสอบ
 * @param {string} slipImageUrl - URL ของรูปภาพสลิป
 * @returns {Promise<object|void>} - ข้อมูลการตอบกลับจาก QStash หรือ void ถ้า service ไม่ได้ตั้งค่าไว้
 * @throws {ApiError} - หากการตั้งค่าผิดพลาดหรือการส่งงานล้มเหลว
 */
async function scheduleSlipVerification(transactionId, slipImageUrl) {
  const qstashToken = process.env.QSTASH_TOKEN;
  const qstashClient = qstashToken ? new Client({ token: qstashToken }) : null;

  if (!qstashClient) {
    // Log error นี้ไว้ตอนที่เซิร์ฟเวอร์เริ่มทำงาน จะได้รู้ทันทีว่าตั้งค่าผิด
    console.error('CRITICAL: QSTASH_TOKEN is not defined. QStash service will be disabled.');
  }

  // --- Best Practice 2: ตรวจสอบการตั้งค่าตั้งแต่ต้น ---
  // ตรวจสอบว่า client ถูกสร้างสำเร็จหรือไม่
  if (!qstashClient) {
    // ไม่โยน Error ที่จะทำให้ user flow พัง แต่ log ไว้เพื่อให้นักพัฒนาทราบ
    console.warn(`QStash service is not configured. Skipping verification for TxID: ${transactionId}`);
    return; // จบการทำงานอย่างเงียบๆ
  }

  // --- Best Practice 3: ดึงค่า URL จาก Environment Variables ---
  // ทำให้โค้ดสามารถย้ายไปทำงานในสภาพแวดล้อมอื่น (dev, staging, prod) ได้ง่าย
  // โดยแค่เปลี่ยนค่าใน .env ไม่ต้องแก้โค้ด
  const webhookUrl = process.env.QSTASH_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('CRITICAL: QSTASH_WEBHOOK_URL is not defined in .env file.');
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'QStash webhook URL is not configured.');
  }

  // --- Best Practice 4: ใช้ `publishJSON` และส่ง Object ตรงๆ ---
  // `publishJSON` ถูกออกแบบมาให้รับ JavaScript object และจะจัดการ...
  //   1. `JSON.stringify(body)` ให้เอง
  //   2. ตั้งค่า `Content-Type: application/json` ให้เอง
  //   3. ตั้งค่า `method: 'POST'` ให้เป็น default
  // ทำให้โค้ดของคุณสั้นลงและลดโอกาสเกิดข้อผิดพลาดจากการตั้งค่าซ้ำซ้อน
  const payload = { slipImageUrl, transactionId };

  try {
    console.log(`Scheduling slip verification for TxID: ${transactionId} to ${webhookUrl}`);

    const qstashResponse = await qstashClient.publishJSON({
      url: webhookUrl,
      body: payload,
      retries: 0,
      // ไม่จำเป็นต้องระบุ method หรือ headers อีกต่อไป
    });

    console.log('QStash task scheduled successfully:', qstashResponse);
    return qstashResponse;
  } catch (error) {
    // --- Best Practice 5: จัดการ Error ให้ชัดเจน ---
    // Log error ที่ได้จาก QStash เพื่อการดีบักที่ง่ายขึ้น
    const errorMessage = error.message || 'An unknown error occurred';
    console.error(`Failed to schedule task with QStash for TxID ${transactionId}:`, errorMessage);

    // โยน Error ที่มีความหมายชัดเจนกลับไป
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Could not schedule slip verification task: ${errorMessage}`);
  }
}

export default { scheduleSlipVerification };
