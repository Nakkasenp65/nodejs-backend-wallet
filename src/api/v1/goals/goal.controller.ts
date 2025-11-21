/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับเป้าหมายการออม (Goal)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Client, ดึงข้อมูลที่จำเป็นจาก Request (params, body),
 * เรียกใช้ Goal Service ที่เหมาะสมเพื่อจัดการตรรกะ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/goal
 * @requires services/goal.service - Service สำหรับจัดการตรรกะของ Goal
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import { Request, Response } from "express";
import goalService from "./goal.service.js";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";

/**
 * คอนโทรลเลอร์สำหรับสร้างเป้าหมายการออมใหม่
 * @description รับ `userId` จาก URL parameters และข้อมูลเป้าหมาย (mobileId, planId) จาก Request Body,
 * เรียกใช้ Service เพื่อสร้างเป้าหมาย, และส่งข้อมูลเป้าหมายที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createGoal = catchAsync(async (req: Request, res: Response) => {
    console.log("Log Check: ", req.params.userId, " Body: ", req.body);
    const { userId } = req.params;
    const newGoal = await goalService.createGoalForUser(parseInt(userId), req.body);
    res.status(httpStatus.CREATED).json(newGoal);
});

/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลเป้าหมายการออมของผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อดึงข้อมูล,
 * และส่งข้อมูลเป้าหมายกลับไปเป็น JSON response
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getUserGoal = catchAsync(async (req: Request, res: Response) => {
    const { line_user_id } = req.params;
    const goal = await goalService.getUserGoal(line_user_id);
    res.status(httpStatus.OK).json(goal);
});

/**
 * คอนโทรลเลอร์สำหรับอัปเดตเป้าหมายการออม
 * @description รับ `userId` จาก URL parameters และข้อมูลสำหรับอัปเดต (planId, productId) จาก Request Body,
 * เรียกใช้ Service เพื่ออัปเดตข้อมูล, และส่งข้อมูลเป้าหมายที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const updateGoal = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { planId, productId } = req.body;
    const updatedGoal = await goalService.updateGoalForUser(parseInt(userId), {
        planId,
        productId,
    });
    res.status(httpStatus.OK).json(updatedGoal);
});

export default {
    createGoal,
    updateGoal,
    getUserGoal,
};
