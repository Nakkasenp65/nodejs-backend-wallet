/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับภารกิจของผู้ใช้ (User Missions)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Client สำหรับการสมัครภารกิจ, การรับรางวัล, และการดึงข้อมูลภารกิจ
 * จากนั้นเรียกใช้ Service ที่เหมาะสม และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/user-mission
 * @requires services/user-mission.service - Service สำหรับจัดการตรรกะของ User Mission
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";
import userMissionService from "./user-mission.service.js";
import ApiError from "../../../utils/ApiError.js";

/**
 * คอนโทรลเลอร์สำหรับสมัครเข้าร่วมภารกิจ
 * @description รับ `missionId` และ `userId` จาก Request Body, เรียกใช้ Service เพื่อดำเนินการสมัคร,
 * และส่งข้อมูล UserMission ที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมี `req.body.missionId` และ `req.body.userId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const enrollInMission = catchAsync(async (req: Request, res: Response) => {
    const { missionId, userId } = req.body;
    const newUserMission = await userMissionService.enrollInMission(userId, missionId);
    console.log("ENROLLED MISSION", newUserMission);
    res.status(httpStatus.CREATED).json(newUserMission);
});

/**
 * คอนโทรลเลอร์สำหรับกดรับรางวัลภารกิจ
 * @description รับ `userId` และ `userMissionId` จาก Request Body, เรียกใช้ Service เพื่อดำเนินการรับรางวัล,
 * และส่งข้อมูล UserMission ที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมี `req.body.userId` และ `req.body.userMissionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const claimMissionReward = catchAsync(async (req: Request, res: Response) => {
    const { userId, userMissionId } = req.body;
    const claimedMission = await userMissionService.claimMissionReward(userId, userMissionId);
    res.status(httpStatus.OK).json(claimedMission);
});

/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจของผู้ใช้
 * @description รับ `userId` จาก URL parameters และ `filter` จาก Query String,
 * เรียกใช้ Service เพื่อดึงข้อมูล, และส่งรายการภารกิจกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และอาจมี `req.query.filter`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getMyMissions = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { filter } = req.query; // รับ filter จาก query string
    const myMissions = await userMissionService.getMyMissions(userId, { filter: filter as any });
    res.status(httpStatus.OK).json(myMissions);
});

/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลรายละเอียดภารกิจรายชิ้น
 * @description รับ `userMissionId` จาก URL parameters, เรียกใช้ Service, และส่งข้อมูลรายละเอียดกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userMissionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 * @throws {ApiError} หากไม่พบข้อมูล UserMission ตาม ID ที่ระบุ
 */
const getMyMissionDetails = catchAsync(async (req: Request, res: Response) => {
    const { userMissionId } = req.params;
    const missionDetails = await userMissionService.getMyMissionDetails(userMissionId);

    if (!missionDetails) {
        throw new ApiError(httpStatus.NOT_FOUND, "User mission not found");
    }

    res.status(httpStatus.OK).json(missionDetails);
});

/**
 * คอนโทรลเลอร์สำหรับลบ UserMission (สำหรับ Admin หรือการจัดการพิเศษ)
 * @description รับ `userMissionId` จาก URL parameters, เรียกใช้ Service เพื่อลบ, และส่งข้อมูลที่ลบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userMissionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const deleteUserMission = catchAsync(async (req: Request, res: Response) => {
    const { userMissionId } = req.params;
    const deletedMission = await userMissionService.deleteUserMission(userMissionId);
    res.status(httpStatus.OK).json(deletedMission);
});

export default {
    enrollInMission,
    claimMissionReward,
    getMyMissions,
    getMyMissionDetails,
    deleteUserMission,
};
