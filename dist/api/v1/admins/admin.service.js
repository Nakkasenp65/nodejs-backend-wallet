/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับส่วนของผู้ดูแลระบบ (Admin)
 * @description ไฟล์นี้รวบรวมฟังก์ชันที่ใช้ในการดึงข้อมูลสรุปและสถิติต่างๆ สำหรับแสดงผลใน Admin Dashboard
 * โดยมีการดึงข้อมูลจากหลายโมเดลพร้อมกันเพื่อประสิทธิภาพสูงสุด
 * @module services/admin
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 */
import { TransactionStatus, TransactionType, UserMissionStatus } from "../../../generated/prisma/index.js";
import prisma from "../../../libs/prisma.js";
/**
 * ดึงข้อมูลสรุปสำหรับ Admin Dashboard
 * @description ใช้ `Promise.all` เพื่อดึงข้อมูลสถิติหลายส่วนพร้อมกันในครั้งเดียวเพื่อประสิทธิภาพสูงสุด
 * สถิติที่ดึงมาประกอบด้วย: ยอดผู้ใช้ทั้งหมด, ยอดเงินออมในระบบ, จำนวนผู้ใช้ใหม่และยอดเงินฝากในเดือนปัจจุบัน,
 * จำนวนธุรกรรมที่รอตรวจสอบ, และข้อมูลสรุปเกี่ยวกับภารกิจและรางวัล
 * @async
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลสรุปสำหรับ Dashboard
 * @property {object} summary - ข้อมูลสรุปภาพรวมทั้งหมด
 * @property {number} summary.totalUsers - จำนวนผู้ใช้ทั้งหมดในระบบ
 * @property {number} summary.totalSavingsBalance - ยอดเงินออมคงเหลือรวมทั้งระบบ
 * @property {number} summary.pendingTransactionsCount - จำนวนธุรกรรมที่รอการตรวจสอบ
 * @property {number} summary.activeMissionsCount - จำนวนภารกิจที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
 * @property {object} monthlyActivity - ข้อมูลสรุปกิจกรรมในเดือนปัจจุบัน
 * @property {number} monthlyActivity.newUsersThisMonth - จำนวนผู้ใช้ใหม่ในเดือนนี้
 * @property {number} monthlyActivity.depositsThisMonth - ยอดเงินฝากที่สำเร็จในเดือนนี้
 * @property {number} monthlyActivity.rewardsPaidThisMonth - ยอดรางวัลที่จ่ายไปในเดือนนี้
 * @throws {Error} โยน `Error` หากเกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล
 */
const getDashboardData = async () => {
    try {
        // คำนวณวันแรกของเดือนปัจจุบัน
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // --- 1. รัน Query ทั้งหมดพร้อมกันเพื่อประสิทธิภาพสูงสุด ---
        const [totalUsers, totalWalletAggregate, newUsersThisMonth, successfulDepositsThisMonth, pendingTransactions, activeUserMissions, rewardsClaimedThisMonth,] = await Promise.all([
            // จำนวนผู้ใช้ทั้งหมด
            prisma.user.count(),
            // ยอดรวมเงินออม (balance) ในทุก Wallet
            prisma.wallet.aggregate({
                _sum: {
                    balance: true,
                },
            }),
            // จำนวนผู้ใช้ใหม่ในเดือนนี้
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: startOfMonth,
                    },
                },
            }),
            // ยอดเงินออมที่สำเร็จในเดือนนี้ (เฉพาะประเภท INCOME)
            prisma.transaction.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    status: TransactionStatus.SUCCESS,
                    type: TransactionType.INCOME,
                    to: "Aom-Down App",
                    createdAt: {
                        gte: startOfMonth,
                    },
                },
            }),
            // จำนวนธุรกรรมที่รอการตรวจสอบ (Actionable item)
            prisma.transaction.count({
                where: {
                    status: TransactionStatus.PENDING,
                },
            }),
            // จำนวนภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
            prisma.userMission.count({
                where: {
                    status: UserMissionStatus.ENROLLED,
                },
            }),
            // ยอดรวมรางวัลที่แจกไปในเดือนนี้ (จาก Transaction ที่เป็น REWARD)
            prisma.transaction.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    type: TransactionType.REWARD,
                    status: TransactionStatus.SUCCESS,
                    createdAt: {
                        gte: startOfMonth,
                    },
                },
            }),
        ]);
        // --- 2. จัดรูปแบบข้อมูลเพื่อส่งกลับ ---
        const dashboardData = {
            summary: {
                totalUsers: totalUsers ?? 0,
                totalSavingsBalance: totalWalletAggregate._sum.balance ?? 0,
                pendingTransactionsCount: pendingTransactions ?? 0,
                activeMissionsCount: activeUserMissions ?? 0,
            },
            monthlyActivity: {
                newUsersThisMonth: newUsersThisMonth ?? 0,
                depositsThisMonth: successfulDepositsThisMonth._sum.amount ?? 0,
                rewardsPaidThisMonth: rewardsClaimedThisMonth._sum.amount ?? 0,
            },
        };
        return dashboardData;
    }
    catch (error) {
        console.error("Error fetching dashboard data:", error);
        // ใน Production อาจจะ log error ลง service อื่นๆ
        // แล้ว re-throw หรือ return error object ที่จัดการแล้ว
        throw new Error("Could not fetch dashboard data.");
    }
};
export default {
    getDashboardData,
};
//# sourceMappingURL=admin.service.js.map