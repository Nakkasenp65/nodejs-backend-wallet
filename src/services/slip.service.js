import httpStatus from 'http-status';
import axios from 'axios';
import FormData from 'form-data';
import ApiError from '../utils/ApiError.js';
import walletService from './wallet.service.js';
import transactionService from './transaction.service.js';

/**
 * ดาวน์โหลดรูปภาพสลิปจาก URL และส่งไปตรวจสอบที่ API ภายนอก
 * @param {string} slipImageUrl - URL ของรูปภาพสลิป
 * @param {string} transactionId - ID ของ Transaction เพื่อใช้ในการตั้งชื่อไฟล์
 * @returns {Promise<number>} - จำนวนเงินที่ตรวจสอบได้จากสลิป
 * @throws {Error} - หากการตรวจสอบล้มเหลวหรือคืนค่าไม่ถูกต้อง
 */
async function verfifySlip(slipImageUrl, transactionId) {
  const mockResponse = {
    code: '200000',
    message: 'Slip verified successfully',
    data: {
      transRef: '015218185151CTF00170',
      dateTime: '2025-08-06T18:51:51+07:00',
      amount: 1,
      ref1: null,
      ref2: null,
      ref3: null,
      receiver: { account: [Object], bank: [Object] },
      sender: { account: [Object], bank: [Object] },
      decode: '0041000600000101030040220015218185151CTF001705102TH910436A7',
      referenceId: '0fb03a9d-9427-4353-8a5a-7051a93e8025-1113',
    },
  };

  const verificationApiUrl = process.env.SLIP2_GO_VERIFY_URL;

  try {
    // --- 1. ดาวน์โหลดรูปภาพสลิปในรูปแบบ Buffer ---
    const slipImageResponse = await axios.get(slipImageUrl, {
      responseType: 'arraybuffer', // <-- บอกให้ axios คืนค่าเป็น ArrayBuffer
    });

    const imageBuffer = slipImageResponse.data; // <-- Buffer จะอยู่ใน .data
    const mimeType = slipImageResponse.headers['content-type'] || 'image/jpeg'; // <-- เข้าถึง header แบบ object

    // --- 2. เตรียม FormData เพื่อส่งไปตรวจสอบ ---
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename: `slip_${transactionId}.${mimeType.split('/')[1] || 'jpg'}`,
      contentType: mimeType,
    });

    // --- 3. ส่งข้อมูลไปตรวจสอบที่ API ---
    const verifyResponse = await axios.post(verificationApiUrl, form, {
      headers: {
        ...form.getHeaders(), // <-- (สำคัญ) ใช้ getHeaders() เพื่อสร้าง Content-Type ที่ถูกต้อง
      },
    });

    // --- 4. ประมวลผลและตรวจสอบผลลัพธ์ ---
    const verifyResult = verifyResponse.data; // <-- ข้อมูล JSON จะอยู่ใน .data
    const verifiedAmount = verifyResult?.data?.amount;
    // const verifiedAmount = mockResponse?.data?.amount;

    console.log(`[Verify Slip] Successfully verified \n${JSON.stringify(verifyResult)}`);
    // console.log('DATA: ', verifyResponse.data);
    // console.log('RECEIVER: ', verifyResponse.data.receiver);
    // console.log('RECEIVER NAME: ', verifyResponse.data.receiver.account.name);
    // console.log('RECEIVER BANK ACCOUNT: ', verifyResponse.data.receiver.account.bank.account);
    // console.log('DATA BANK: ', verifyResponse.data.bank);
    // console.log('SENDER ACCOUNT NAME: ', verifyResponse.data.sender.account.name);
    await transactionService.updateTransaction(verifyResult.code, transactionId, verifiedAmount);

    // --- 5. คืนค่าเฉพาะจำนวนเงินที่ตรวจสอบได้ ---
    return verifyResult;
  } catch (error) {
    await transactionService.updateTransaction(error.response?.data.code, transactionId, 0);
    console.error(
      `[Verify Slip] An error occurred during slip verification for TxID: ${transactionId}`,
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * อัพโหลดรูปภาพสลิป URL
 */
async function uploadSlip(fileObject, identifier) {
  const uploadApiUrl = process.env.UPLOAD_IMAGE_API_URL;

  // 1. ตรวจสอบว่ามีไฟล์และ buffer อยู่จริง
  if (!fileObject || !fileObject.buffer) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No file buffer provided for upload.');
  }

  // 2. สร้าง instance ของ FormData จาก library
  const formData = new FormData();

  // 3. (สำคัญมาก) Append Buffer ของไฟล์เข้าไป พร้อมกับระบุชื่อไฟล์
  //    API ปลายทางต้องการชื่อไฟล์เพื่อประมวลผล
  //    - key คือ 'myFile' ตามที่ API กำหนด
  //    - value คือ Buffer ของไฟล์
  //    - options คือ object ที่มี filename
  formData.append('myFile', fileObject.buffer, {
    filename: fileObject.originalname,
    contentType: fileObject.mimetype,
  });

  // 4. Append userId เข้าไปตามปกติ
  formData.append('userId', identifier);

  try {
    if (!uploadApiUrl) {
      throw new Error('UPLOAD_IMAGE_API_URL is not defined in .env');
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
      throw new Error('Invalid response format from image upload service');
    }

    // คืนค่าเฉพาะส่วน data ที่มี fileId, fileName, url
    return data.data;
  } catch (error) {
    console.error('Error uploading slip:', error.response?.data || error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not upload slip image.');
  }
}

export default { verfifySlip, uploadSlip };
