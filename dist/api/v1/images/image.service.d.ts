declare namespace _default {
    export { uploadImage };
}
export default _default;
/**
 * อัปโหลดไฟล์รูปภาพไปยังเซิร์ฟเวอร์จัดเก็บรูปภาพภายนอก
 * @description รับไฟล์อ็อบเจกต์จาก Middleware (เช่น Multer), สร้าง FormData ที่มี Buffer ของไฟล์และข้อมูลระบุตัวตน,
 * จากนั้นส่ง HTTP POST request ไปยัง Image Upload API ที่กำหนดไว้ใน Environment Variables
 * @async
 * @param {object} fileObject - ไฟล์อ็อบเจกต์ที่ได้รับจาก Middleware (ต้องมี `buffer`, `originalname`, `mimetype`)
 * @param {string} identifier - ข้อมูลระบุตัวตน (เช่น userId หรือ productId) ที่จะส่งไปพร้อมกับไฟล์เพื่อใช้ในการอ้างอิง
 * @returns {Promise<{fileId: string, fileName: string, url: string}>} Promise ที่จะ resolve เป็นอ็อบเจกต์ข้อมูลของไฟล์ที่อัปโหลดสำเร็จ ซึ่งประกอบด้วย URL ของรูปภาพ
 * @throws {ApiError} หากไม่มีไฟล์ส่งเข้ามา หรือเกิดข้อผิดพลาดระหว่างการอัปโหลดไปยังบริการภายนอก
 */
declare function uploadImage(fileObject: object, identifier: string): Promise<{
    fileId: string;
    fileName: string;
    url: string;
}>;
//# sourceMappingURL=image.service.d.ts.map