/**
 * @file เซอร์วิสสำหรับจัดการการอัปโหลดรูปภาพไปยังบริการจัดเก็บภายนอก
 * @description ไฟล์นี้ทำหน้าที่เป็น Abstraction Layer ในการสื่อสารกับ External Image Upload Service
 * เพื่อซ่อนความซับซ้อนในการสร้าง FormData และการส่ง HTTP Request ทำให้ส่วนอื่นๆ ของแอปพลิเคชัน
 * (เช่น ProductService) สามารถเรียกใช้งานการอัปโหลดรูปภาพได้อย่างสะดวกและเป็นมาตรฐาน
 * @module services/image
 * @requires form-data - Library สำหรับสร้าง payload ประเภท multipart/form-data
 * @requires axios - HTTP client สำหรับการยิง API request
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import FormData from "form-data";
import axios from "axios";
import httpStatus from "http-status";
import ApiError from "../../../utils/ApiError.js";

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
const uploadImage = async (fileObject: Express.Multer.File, identifier: string) => {
    const uploadApiUrl = process.env.UPLOAD_IMAGE_API_URL;

    // 1. ตรวจสอบว่ามีไฟล์และ buffer อยู่จริง
    if (!fileObject || !fileObject.buffer) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No file buffer provided for upload.");
    }

    // 2. สร้าง instance ของ FormData จาก library
    const formData = new FormData();

    // 3. (สำคัญมาก) Append Buffer ของไฟล์เข้าไป พร้อมกับระบุชื่อไฟล์
    //    API ปลายทางต้องการชื่อไฟล์เพื่อประมวลผล
    //    - key คือ 'myFile' ตามที่ API กำหนด
    //    - value คือ Buffer ของไฟล์
    //    - options คือ object ที่มี filename
    formData.append("myFile", fileObject.buffer, {
        filename: fileObject.originalname,
        contentType: fileObject.mimetype,
    });

    // 4. Append userId เข้าไปตามปกติ
    formData.append("userId", identifier);

    try {
        if (!uploadApiUrl) {
            throw new Error("UPLOAD_IMAGE_API_URL is not defined in .env");
        }

        console.log(`Uploading slip for identifier: ${identifier} to ${uploadApiUrl}`);

        // 5. (สำคัญมาก) ส่ง Request ด้วย axios พร้อมกับ Header ที่ถูกต้องจาก FormData
        const { data } = await axios.post(uploadApiUrl, formData, {
            headers: {
                ...formData.getHeaders(), // <-- ใช้ getHeaders() เพื่อสร้าง Content-Type ที่มี boundary ถูกต้อง
            },
        });

        // 6. ตรวจสอบ Response และคืนค่าเฉพาะส่วน data ตามที่คู่มือกำหนด
        if (!data || !data.data?.url) {
            throw new Error("Invalid response format from image upload service");
        }

        // คืนค่าเฉพาะส่วน data ที่มี fileId, fileName, url
        return data.data;
    } catch (error: any) {
        console.error("Error uploading slip:", error.response?.data || error.message);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Could not upload slip image.");
    }
};

export default {
    uploadImage,
};
