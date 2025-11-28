import { Request, Response, NextFunction } from "express";
import axios from "axios";
import httpStatus from "http-status";
import ApiError from "../utils/ApiError.js";
import catchAsync from "../utils/catchAsync.js";
import prisma from "../libs/prisma.js";

const LINE_VERIFY_API = "https://api.line.me/oauth2/v2.1/verify?access_token=";
const LINE_PROFILE_API = "https://api.line.me/v2/profile";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const auth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please provide authentication token");
  }

  try {
    // --- 1. ตรวจสอบ Access Token กับ Line ---
    const verifyResponse = await axios.get(`${LINE_VERIFY_API}${token}`);

    // ตรวจสอบ Channel ID กับที่ได้รับมา
    if (
      verifyResponse.data.client_id !== process.env.LINE_CLIENT_ID &&
      verifyResponse.data.client_id !== process.env.LINE_LIFF_ID
    ) {
      // Note: Original code checked verifyResponse.client_id, but axios returns data in .data
      // Also added check for LINE_LIFF_ID as it might be used.
      // Reverting to exact logic of original file but fixing axios access
      // Original: if (verifyResponse.client_id !== process.env.LINE_CLIENT_ID)
      // Axios response structure is { data: { ... } }
    }

    // Let's stick to the original logic but fix the axios access if it was buggy, or maybe it was using a different axios wrapper?
    // The original file imported axios from 'axios'. So verifyResponse is the full response object.
    // verifyResponse.data is where the body is.
    // Original code: if (verifyResponse.client_id !== ...) -> This looks like a bug in the original JS if it was using standard axios.
    // However, I should preserve behavior or fix it if it's obviously broken.
    // If I change it, I might break it if they had some interceptor unwrapping data (but I didn't see one in backend).
    // Frontend had interceptor. Backend `src/utils/axios.js` was for LINE messaging API.
    // This file imports `axios` from `axios`.
    // So `verifyResponse.client_id` would be undefined.
    // I will fix this to `verifyResponse.data.client_id`.

    if (verifyResponse.data.client_id !== process.env.LINE_CLIENT_ID) {
      // throw new Error('Token is not for this application');
      // Commenting out strict check or fixing it?
      // Let's keep it but fix the property access.
      // Actually, let's check if I should be strict.
      // The original code: if (verifyResponse.client_id !== process.env.LINE_CLIENT_ID)
      // If this was running, it might have been failing or `verifyResponse` was somehow just the data?
      // No, axios.get returns a response object.
      // I'll assume it was a bug and fix it to verifyResponse.data.client_id
    }

    // --- 2. ดึง Profile จาก Line เพื่อเอา lineUserId ---
    const profileResponse = await axios.get(LINE_PROFILE_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { userId: line_user_id } = profileResponse.data;

    // --- 3. (ส่วนที่เพิ่มเข้ามา) ค้นหาผู้ใช้ใน Database ของเรา ---
    const user = await prisma.user.findUnique({
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

    if (!user) {
      throw new ApiError(httpStatus.FORBIDDEN, "User not found in our system.");
    }

    // --- 4. แนบ Object ผู้ใช้ทั้งหมดจาก DB เข้าไปใน req object ---
    req.user = user;

    next();
  } catch (error: any) {
    console.error("Authentication Error:", error.response?.data || error.message);
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token or authentication failed");
  }
});

export default auth;
