/**
 * @file คอนโทรลเลอร์กลางสำหรับจัดการคำขอ (HTTP Requests) ทั้งหมดในส่วนของผู้ดูแลระบบ (Admin)
 * @description ไฟล์นี้ทำหน้าที่เป็น Facade Controller โดยรวบรวม Endpoint ทั้งหมดที่จำเป็นสำหรับ Admin Panel
 * และเรียกใช้ Service ที่เกี่ยวข้องจากโมดูลต่างๆ เช่น Transaction, User, Mission, Wallet
 * เพื่อจัดการตรรกะและส่งผลลัพธ์กลับไป
 * @module controllers/admin
 * @requires services/admin.service - Service สำหรับข้อมูล Dashboard
 * @requires services/transaction.service - Service สำหรับจัดการธุรกรรม
 * @requires services/user.service - Service สำหรับจัดการผู้ใช้
 * @requires services/mission.service - Service สำหรับจัดการภารกิจหลัก
 * @requires services/wallet.service - Service สำหรับจัดการกระเป๋าเงิน
 * @requires services/user-mission.service - Service สำหรับจัดการภารกิจของผู้ใช้
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาด
 */
import httpStatus from "http-status";
import adminService from "./admin.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import transactionService from "../transactions/transaction.service.js";
import userService from "../users/user.controller.js";
import missionService from "../missions/mission.service.js";
import walletService from "../wallets/wallet.service.js";
import userMissionService from "../user-missions/user-mission.service.js";
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลสรุปสำหรับ Admin Dashboard
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getDashboardData = catchAsync(async (req, res) => {
    const data = await adminService.getDashboardData();
    res.status(httpStatus.OK).json(data);
});
/**
 * คอนโทรลเลอร์สำหรับดึงรายการธุรกรรมทั้งหมดในระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้า, การจัดเรียง, และการกรองจาก Query String
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getTransactions = catchAsync(async (req, res) => {
    const transactions = await transactionService.getTransactions(req.query);
    res.status(httpStatus.OK).json(transactions);
});
/**
 * คอนโทรลเลอร์สำหรับแก้ไขธุรกรรม (สำหรับ Admin)
 * @description รับ `transactionId` จาก URL, ข้อมูลอัปเดตจาก Body, และไฟล์ (ถ้ามี)
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const editTransaction = catchAsync(async (req, res) => {
    const { transactionId } = req.params;
    const transactionPayload = req.body;
    const transaction = await transactionService.editTransaction(transactionId, req.file, transactionPayload);
    res.status(httpStatus.OK).json(transaction);
});
/**
 * คอนโทรลเลอร์สำหรับลบธุรกรรม (สำหรับ Admin)
 * @description รับ `transactionId` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const deleteTransaction = catchAsync(async (req, res) => {
    const { transactionId } = req.param;
    const transaction = await transactionService.deleteTransaction(transactionId);
    res.status(httpStatus.OK).json(transaction);
});
/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อมูลผู้ใช้ (สำหรับ Admin)
 * @description รับ `userId` จาก URL และข้อมูลอัปเดตจาก Body
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const editUser = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const user = await userService.updateUserByAdmin(userId, req.body);
    res.status(httpStatus.OK).json(user);
});
/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจหลักทั้งหมด (สำหรับ Admin)
 * @description รับเงื่อนไขการกรองและการแบ่งหน้าจาก Query String
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getMissions = catchAsync(async (req, res) => {
    const options = req.query;
    const missions = await missionService.getAllMissionsForAdmin(options);
    res.status(httpStatus.OK).json(missions);
});
/**
 * คอนโทรลเลอร์สำหรับดึงรายการ Wallet ทั้งหมดในระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการค้นหาและการแบ่งหน้าจาก Query String
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getWallets = catchAsync(async (req, res) => {
    const filters = req.query;
    const result = await walletService.getWallets(filters);
    res.status(httpStatus.OK).json(result);
});
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูล Wallet โดยละเอียด (สำหรับ Admin)
 * @description รับ `walletId` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getWalletDetails = catchAsync(async (req, res) => {
    const { walletId } = req.params;
    const wallet = await walletService.getWalletDetails(walletId);
    res.status(httpStatus.OK).json(wallet);
});
/**
 * คอนโทรลเลอร์สำหรับอัปเดตข้อมูล Wallet (สำหรับ Admin)
 * @description รับ `walletId` จาก URL และข้อมูลอัปเดตจาก Body (เช่น balance)
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const updateWallet = catchAsync(async (req, res) => {
    const { walletId } = req.params;
    const updatedPayload = req.body;
    const updatedWallet = await walletService.updateWallet(walletId, updatedPayload);
    res.status(httpStatus.OK).json(updatedWallet);
});
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลภารกิจของผู้ใช้โดยละเอียด (สำหรับ Admin)
 * @description รับ `userMissionId` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getUserMissionDetails = catchAsync(async (req, res) => {
    const { userMissionId } = req.params;
    const userMissionDetails = await userMissionService.getMyMissionDetails(userMissionId);
    res.status(httpStatus.OK).json(userMissionDetails);
});
/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจทั้งหมดของผู้ใช้โดยใช้ LINE ID (สำหรับ Admin)
 * @description รับ `line_user_id` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getUserMisisonsByUserLineId = catchAsync(async (req, res) => {
    const { line_user_id } = req.params;
    const userMissions = await userMissionService.getUserMissionByLineUserId(line_user_id);
    res.status(httpStatus.OK).json(userMissions);
});
/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อมูลภารกิจของผู้ใช้ (สำหรับ Admin)
 * @description รับ `userMissionId` จาก URL และข้อมูลอัปเดตจาก Body
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const editUserMission = catchAsync(async (req, res) => {
    const { userMissionId } = req.params;
    const updatedUserMission = await userMissionService.editUserMission(userMissionId, req.body);
    res.status(httpStatus.OK).json(updatedUserMission);
});
export default {
    getDashboardData,
    getTransactions,
    editTransaction,
    deleteTransaction,
    editUser,
    getMissions,
    getWallets,
    getWalletDetails,
    updateWallet,
    getUserMissionDetails,
    getUserMisisonsByUserLineId,
    editUserMission,
};
//# sourceMappingURL=admin.controller.js.map