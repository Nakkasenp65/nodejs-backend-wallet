/**
 * @file เซอร์วิสสำหรับจัดการการเชื่อมต่อกับ API ภายนอกที่เกี่ยวข้องกับสลิป (Slip)
 * @description ไฟล์นี้รวบรวมฟังก์ชันที่ใช้ในการสื่อสารกับ External Services
 * โดยเฉพาะการอัปโหลดรูปภาพสลิปไปยังเซิร์ฟเวอร์จัดเก็บไฟล์ และการส่งสลิปไปตรวจสอบความถูกต้อง
 * @module services/slip
 * @requires axios - HTTP client สำหรับการยิง API request
 * @requires form-data - Library สำหรับสร้าง payload ประเภท multipart/form-data
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import httpStatus from "http-status";
import axios from "axios";
import FormData from "form-data";
import ApiError from "../../../utils/ApiError.js";
import walletService from "../wallets/wallet.service.js";
import transactionService from "../transactions/transaction.service.js";
// const mockSuccess = {
//   code: "200000",
//   message: "Slip verified successfully",
//   data: {
//     transRef: "015253144947DTF01773",
//     dateTime: "2025-09-10T14:49:47+07:00",
//     amount: 1,
//     ref1: null,
//     ref2: null,
//     ref3: null,
//     receiver: {
//       account: {
//         name: "นัมเบอร์วันมันนี่",
//         bank: {
//           account: "xxx-x-x2208-x",
//         },
//         proxy: null,
//       },
//       bank: {
//         id: "004",
//         name: "ธนาคารกสิกรไทย",
//       },
//     },
//     sender: {
//       account: {
//         name: "MR. Nakasen P",
//         bank: {
//           account: "xxx-x-x9320-x",
//         },
//       },
//       bank: {
//         id: "004",
//         name: "ธนาคารกสิกรไทย",
//       },
//     },
//     decode: "0041000600000101030040220015253144947DTF017735102TH9104F751",
//     referenceId: "049b727a-4006-4a92-9902-813e9e6e0452-1113",
//   },
// };
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
const verfifySlip = async (slipImageUrl, transactionId) => {
    const verificationApiUrl = process.env.SLIP2_GO_VERIFY_URL;
    try {
        const slipImageResponse = await axios.get(slipImageUrl, {
            responseType: "arraybuffer",
        });
        const imageBuffer = slipImageResponse.data;
        const mimeType = slipImageResponse.headers["content-type"] || "image/jpeg";
        const form = new FormData();
        form.append("file", imageBuffer, {
            filename: `slip_${transactionId}.${mimeType.split("/")[1] || "jpg"}`,
            contentType: mimeType,
        });
        const verifyResponse = await axios.post(verificationApiUrl, form, {
            headers: {
                ...form.getHeaders(),
            },
        });
        const verifyResult = verifyResponse.data;
        // const verifiedAmount = verifyResult?.data?.amount;
        // const verifiedAmount = mockResponse?.data?.amount;
        console.log(`[Verify Slip] Successfully verified \n${JSON.stringify(verifyResult)}`);
        return verifyResult;
    }
    catch (error) {
        await transactionService.updateTransaction(error.response?.data.code, transactionId, 0);
        console.error(`[Verify Slip] An error occurred during slip verification for TxID: ${transactionId}`, error.response?.data || error.message);
        throw error;
    }
};
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
const uploadSlip = async (fileObject, identifier) => {
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
    }
    catch (error) {
        console.error("Error uploading slip:", error.response?.data || error.message);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Could not upload slip image.");
    }
};
export default { verfifySlip, uploadSlip };
//# sourceMappingURL=slip.service.js.map