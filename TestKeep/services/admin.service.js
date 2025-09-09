import { TransactionStatus, TransactionType, UserMissionStatus } from '../generated/prisma/index.js';
import prisma from '../libs/prisma.js';

/**
 * ดึงข้อมูลสรุปสำหรับ Admin Dashboard
 *
 * คืนค่า object ที่มีสถิติสำคัญต่างๆ เช่น:
 * - ยอดรวมผู้ใช้
 * - ยอดรวมเงินออมในระบบ
 * - จำนวนผู้ใช้ใหม่ในเดือนนี้
 * - ยอดเงินออมที่เข้ามาในเดือนนี้
 * - จำนวนภารกิจที่ผู้ใช้กำลังทำอยู่
 * - รางวัลที่แจกไปในเดือนนี้
 * - ธุรกรรมที่รอการตรวจสอบ
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
          to: 'Aom-Down App',
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
    console.error('Error fetching dashboard data:', error);
    // ใน Production อาจจะ log error ลง service อื่นๆ
    // แล้ว re-throw หรือ return error object ที่จัดการแล้ว
    throw new Error('Could not fetch dashboard data.');
  }
};

export default {
  // แสดงข้อมูลหน้าเว็บหลัก
  getDashboardData,
  // เพิ่มภารกิจเข้าไปในระบบ
  // ลบภารกิจออกจากระบบ
};
