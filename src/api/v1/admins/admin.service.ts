/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับส่วนของผู้ดูแลระบบ (Admin)
 * @description ไฟล์นี้รวบรวมฟังก์ชันที่ใช้ในการดึงข้อมูลสรุปและสถิติต่างๆ สำหรับแสดงผลใน Admin Dashboard
 * โดยมีการดึงข้อมูลจากหลายโมเดลพร้อมกันเพื่อประสิทธิภาพสูงสุด
 * @module services/admin
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 */
import { TransactionStatus, TransactionType, UserMissionStatus } from "@prisma/client";
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
        const [
            totalUsers,
            totalWalletAggregate,
            newUsersThisMonth,
            successfulDepositsThisMonth,
            pendingTransactions,
            activeUserMissions,
            rewardsClaimedThisMonth,
        ] = await Promise.all([
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
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // ใน Production อาจจะ log error ลง service อื่นๆ
        // แล้ว re-throw หรือ return error object ที่จัดการแล้ว
        throw new Error("Could not fetch dashboard data.");
    }
};

/**
 * ตัดยอดเงินจาก Wallet เพื่อแลกสินค้า (Redeem)
 * @description ตัดยอดเงินจาก Bonus Balance ก่อน ถ้าไม่พอจึงตัดจาก Balance
 * และสร้าง Transaction บันทึกการใช้งาน
 * @async
 * @param {string} walletId - ID ของ Wallet
 * @param {number} productPrice - ราคาสินค้า
 * @param {string} description - คำอธิบาย
 * @returns {Promise<object>} Transaction ที่เกิดขึ้น
 */
const redeemProduct = async (walletId: string, productPrice: number, description: string) => {
    if (!walletId || !productPrice || productPrice <= 0) {
        throw new Error("Invalid input data");
    }

    return await prisma.$transaction(async (tx) => {
        // 1. ดึงข้อมูล Wallet ล่าสุด
        const wallet = await tx.wallet.findUnique({
            where: { id: walletId },
            include: { user: true }
        });

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const totalBalance = wallet.balance + wallet.bonusBalance;
        if (totalBalance < productPrice) {
            throw new Error("Insufficient funds");
        }

        // 2. คำนวณการตัดเงิน (Bonus ก่อน, แล้วค่อย Balance)
        let deductBonus = 0;
        let deductBalance = 0;

        if (wallet.bonusBalance >= productPrice) {
            // Bonus พอจ่ายทั้งหมด
            deductBonus = productPrice;
        } else {
            // Bonus ไม่พอ, ใช้ Bonus หมดแล้วส่วนต่างตัดจาก Balance
            deductBonus = wallet.bonusBalance;
            deductBalance = productPrice - wallet.bonusBalance;
        }

        // 3. อัปเดต Wallet
        await tx.wallet.update({
            where: { id: walletId },
            data: {
                bonusBalance: { decrement: deductBonus },
                balance: { decrement: deductBalance },
            },
        });

        // 4. สร้าง Transaction
        const transaction = await tx.transaction.create({
            data: {
                name: "แลกสินค้า/บริการ",
                type: TransactionType.REDEEMED, // หรือใช้ประเภทอื่นที่เหมาะสม
                status: TransactionStatus.SUCCESS,
                amount: productPrice,
                from: wallet.user.fullname || wallet.user.line_display_name || "Unknown User",
                to: "1Wallet", // ตามที่วางแผนไว้
                description: description,
                fromWalletId: wallet.id,
                verified: true,
                verifiedAmount: productPrice,
            },
        });

        return transaction;
    });
};

export default {
    getDashboardData,
    redeemProduct,
};
