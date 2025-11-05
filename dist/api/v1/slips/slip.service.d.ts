declare namespace _default {
    export { verfifySlip };
    export { uploadSlip };
}
export default _default;
/**
 * ส่ง URL ของรูปสลิปไปยัง API ภายนอกเพื่อตรวจสอบความถูกต้อง
 * @description ฟังก์ชันนี้จะดาวน์โหลด Buffer ของรูปภาพจาก URL ที่ได้รับ, สร้าง FormData,
 * และส่งไปให้ Slip Verification API เพื่อทำการตรวจสอบ
 * หากเกิดข้อผิดพลาดระหว่างการตรวจสอบ จะมีการเรียกใช้ `transactionService` เพื่ออัปเดตสถานะธุรกรรมเป็น REJECTED
 * @async
 * @param {string} slipImageUrl - URL สาธารณะของรูปภาพสลิปที่ต้องการตรวจสอบ
 * @param {string} transactionId - ID ของธุรกรรมที่เกี่ยวข้อง เพื่อใช้ในการบันทึก Log และอัปเดตสถานะเมื่อเกิดข้อผิดพลาด
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ผลลัพธ์ที่ได้จาก Verification API
 * @throws {Error} Re-throws ข้อผิดพลาดที่ได้รับจาก Axios หากการเชื่อมต่อ API ล้มเหลว
 */
declare function verfifySlip(slipImageUrl: string, transactionId: string): Promise<object>;
/**
 * อัปโหลดไฟล์สลิปไปยังเซิร์ฟเวอร์จัดเก็บรูปภาพภายนอก
 * @description รับไฟล์อ็อบเจกต์จาก Multer, สร้าง FormData ที่มี Buffer ของไฟล์และข้อมูลประกอบ,
 * จากนั้นส่ง HTTP POST request ไปยัง Image Upload API
 * @async
 * @param {object} fileObject - ไฟล์อ็อบเจกต์ที่ได้รับจาก Middleware ของ Multer (ต้องมี `buffer`, `originalname`, `mimetype`)
 * @param {string} identifier - ข้อมูลระบุตัวตน (เช่น userId หรือ walletId) ที่จะส่งไปพร้อมกับไฟล์
 * @returns {Promise<{fileId: string, fileName: string, url: string}>} Promise ที่จะ resolve เป็นอ็อบเจกต์ข้อมูลของไฟล์ที่อัปโหลดสำเร็จ ซึ่งมี URL ของรูปภาพ
 * @throws {ApiError} หากไม่มีไฟล์ส่งเข้ามา หรือเกิดข้อผิดพลาดระหว่างการอัปโหลด
 */
declare function uploadSlip(fileObject: object, identifier: string): Promise<{
    fileId: string;
    fileName: string;
    url: string;
}>;
//# sourceMappingURL=slip.service.d.ts.map