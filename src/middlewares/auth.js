import axios from 'axios';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import prisma from '../libs/prisma.js';

const LINE_VERIFY_API = 'https://api.line.me/oauth2/v2.1/verify?access_token=';
const LINE_PROFILE_API = 'https://api.line.me/v2/profile';

const auth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please provide authentication token');
  }

  try {
    // --- 1. ตรวจสอบ Access Token กับ Line ---
    const verifyResponse = await axios.get(`${LINE_VERIFY_API}${token}`);

    // ตรวจสอบ Channel ID กับที่ได้รับมา
    if (verifyResponse.client_id !== process.env.LINE_CLIENT_ID) {
      throw new Error('Token is not for this application');
    }

    // --- 2. ดึง Profile จาก Line เพื่อเอา lineUserId ---
    const profileResponse = await axios.get(LINE_PROFILE_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { userId: line_user_id } = profileResponse.data;

    // --- 3. (ส่วนที่เพิ่มเข้ามา) ค้นหาผู้ใช้ใน Database ของเรา ---
    const role = await prisma.user.findUnique({
      where: {
        line_user_id: line_user_id,
      },
      select: {
        id: true,
        line_user_id: true,
        phone: true,
        role: true,
      },
    });

    if (!role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User not found in our system.');
    }

    // --- 4. แนบ Object ผู้ใช้ทั้งหมดจาก DB เข้าไปใน req object ---
    req.user = role;

    next();
  } catch (error) {
    console.error('Authentication Error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token or authentication failed');
  }
});

export default auth;
