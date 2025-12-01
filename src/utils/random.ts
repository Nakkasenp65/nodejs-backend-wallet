import { customAlphabet } from "nanoid";
import { PrismaClient } from "@prisma/client";

// --- STAGE 1: สร้าง "โรงงานผลิต ID" ที่ด้านบนสุดของไฟล์ ---
// เราสร้าง "พิมพ์เขียว" สำหรับ ID แต่ละประเภทเพียงครั้งเดียว

// พิมพ์เขียวสำหรับ Wallet ID: ตัวเลข 6 หลัก
const walletIdGenerator = customAlphabet("0123456789", 6);

// พิมพ์เขียวสำหรับ Referral Code: ตัวอักษรพิมพ์ใหญ่และตัวเลข (ไม่มีตัวที่สับสน เช่น O, 0, I, l)
const referralCodeGenerator = customAlphabet(
    "ABCDEFGHJKMNPQRSTUVWXYZ23456789",
    8,
);

// --- STAGE 2: สร้าง "หน่วยปฏิบัติการ" ที่ใช้โรงงานเหล่านี้ ---

export const generateUniqueWalletId = async (prisma: PrismaClient): Promise<string> => {
    let walletId: string = "";
    let isUnique = false;

    while (!isUnique) {
        // ใช้ "โรงงาน" ที่สร้างไว้แล้ว
        const generatedId = walletIdGenerator();
        walletId = `1WL-${generatedId}`;

        const existingWallet = await prisma.wallet.findUnique({
            where: { walletUniqueId: walletId }, // <-- [MINOR FIX] แก้ไขให้ตรงกับ schema
        });

        if (!existingWallet) {
            isUnique = true;
        }
    }
    return walletId;
};

export const generateUniqueReferralCode = async (prisma: PrismaClient): Promise<string> => {
    let referralCode: string = "";
    let isUnique = false;

    while (!isUnique) {
        // [CRITICAL FIX] ใช้ "โรงงาน" ที่สร้างไว้แล้ว
        referralCode = referralCodeGenerator(); // ไม่จำเป็นต้อง .toUpperCase() อีกต่อไป

        const existingUser = await prisma.user.findUnique({
            where: { referralCode: referralCode },
        });

        if (!existingUser) {
            isUnique = true;
        }
    }
    return referralCode;
};

export default { generateUniqueWalletId, generateUniqueReferralCode };
