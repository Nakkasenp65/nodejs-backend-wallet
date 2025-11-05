/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับภารกิจของผู้ใช้ (User Missions)
 * @description ไฟล์นี้รวบรวมฟังก์ชันสำหรับการสมัครภารกิจ, การอัปเดตความคืบหน้า, การรับรางวัล,
 * และการจัดการสถานะภารกิจที่หมดอายุโดยอัตโนมัติผ่าน Cron Job
 * @module services/user-mission
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import prisma from "../../../libs/prisma.js";
import httpStatus from "http-status";
import ApiError from "../../../utils/ApiError.js";
import { UserMissionStatus } from "../../../generated/prisma/index.js";
/**
 * ดำเนินการสมัครเข้าร่วมภารกิจใหม่ให้ผู้ใช้ภายใต้ Atomic Transaction
 * @description มีการตรวจสอบเงื่อนไขหลายชั้น เช่น ภารกิจหมดอายุ, การสมัครซ้ำ,
 * หรือการมีภารกิจประเภทเดียวกันที่ยังไม่เสร็จสิ้น เพื่อป้องกันข้อมูลที่ไม่สอดคล้องกัน
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการสมัครภารกิจ
 * @param {string} missionId - ID ของภารกิจที่ต้องการสมัคร
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission ที่ถูกสร้างขึ้นใหม่
 * @throws {ApiError} ในกรณีที่ไม่พบภารกิจ, ภารกิจหมดอายุ, สมัครซ้ำ, หรือมีภารกิจประเภทเดียวกันที่ยังดำเนินอยู่
 */
const enrollInMission = async (userId, missionId) => {
    const BLOCKING_STATUSES = ["ENROLLED", "AWAITING_CLAIM"];
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        // 1) โหลด mission ที่จะสมัคร (ต้องการ type/duration/config)
        const mission = await tx.mission.findUnique({
            where: { id: missionId },
            select: {
                id: true,
                title: true,
                type: true,
                webExpiresAt: true,
                durationDays: true,
                completeProgress: true,
            },
        });
        if (!mission) {
            throw new ApiError(httpStatus.NOT_FOUND, "Mission not found");
        }
        // ยังสมัครได้ ถ้าไม่มีวันหมดอายุ หรือยังไม่หมด
        if (mission.webExpiresAt && now > mission.webExpiresAt) {
            throw new ApiError(httpStatus.BAD_REQUEST, "This mission is no longer available for enrollment.");
        }
        // 2) กันรับซ้ำภารกิจเดียวกัน
        const existingSameMission = await tx.userMission.findUnique({
            where: { userId_missionId: { userId, missionId } },
            select: { id: true },
        });
        if (existingSameMission) {
            throw new ApiError(httpStatus.CONFLICT, "User is already enrolled in this mission");
        }
        // 3) กันชนประเภทเดียวกันที่กำลังทำ/รอเคลมอยู่
        const activeSameType = await tx.userMission.findFirst({
            where: {
                userId,
                status: { in: BLOCKING_STATUSES },
                mission: { type: mission.type },
            },
            select: { id: true, status: true, missionId: true },
        });
        if (activeSameType) {
            throw new ApiError(httpStatus.CONFLICT, "You already have an active mission of this type.");
        }
        // 4) คำนวณ config ที่ต้องมี (กันค่า null)
        const durationDays = Number.isFinite(mission.durationDays) ? mission.durationDays : 7; // fallback หรือโยน error ถ้าอยาก strict
        const completeProgress = Number.isFinite(mission.completeProgress) && mission.completeProgress > 0 ? mission.completeProgress : 1;
        const userExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        // 5) สร้าง UserMission
        const newUserMission = await tx.userMission.create({
            data: {
                userId,
                missionId,
                status: "ENROLLED",
                userExpiresAt,
                completeProgress,
            },
            include: {
                mission: true,
            },
        });
        return newUserMission;
    });
};
/**
 * ดำเนินการให้ผู้ใช้รับรางวัลจากภารกิจที่อยู่ในสถานะ 'AWAITING_CLAIM' ภายใต้ Atomic Transaction
 * @description จะมีการตรวจสอบสิทธิ์, วันหมดอายุการรับรางวัล, จากนั้นสร้าง Transaction รางวัล,
 * เพิ่มโบนัสใน Wallet, และเปลี่ยนสถานะภารกิจเป็น 'CLAIMED'
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่กดรับรางวัล
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการรับรางวัล
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission ที่อัปเดตสถานะแล้ว
 * @throws {ApiError} หากไม่พบภารกิจ, ไม่มีสิทธิ์, สถานะไม่ถูกต้อง, หรือหมดเวลาการรับรางวัล
 */
const claimMissionReward = async (userId, userMissionId) => {
    const now = new Date();
    const missionToClaim = await prisma.userMission.findUnique({
        where: { id: userMissionId },
        include: {
            mission: true,
            user: { include: { wallet: true } }, // get user's wallet
        },
    });
    if (!missionToClaim || missionToClaim.userId !== userId) {
        throw new ApiError(httpStatus.NOT_FOUND, "Mission not found or you don't have permission.");
    }
    if (missionToClaim.status !== "AWAITING_CLAIM") {
        throw new ApiError(httpStatus.BAD_REQUEST, "This mission is not available for claiming.");
    }
    const { claimExpiresAt } = missionToClaim;
    if (!claimExpiresAt || now > claimExpiresAt) {
        await prisma.userMission.update({
            where: { id: userMissionId },
            data: { status: "CLAIM_EXPIRED" },
        });
        throw new ApiError(httpStatus.BAD_REQUEST, "The claim period for this mission has expired.");
    }
    const rewardAmount = Number(missionToClaim.mission?.rewardAmount ?? 0);
    if (!(rewardAmount > 0)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "This mission has no reward amount configured.");
    }
    return prisma.$transaction(async (tx) => {
        // ensure wallet
        let wallet = missionToClaim.user.wallet;
        if (!wallet) {
            // either create one or error (choose what fits your app)
            wallet = await tx.wallet.create({
                data: { userId: missionToClaim.userId },
            });
        }
        const rewardTransaction = await tx.transaction.create({
            data: {
                name: `รางวัลภารกิจ: ${missionToClaim.mission?.title ?? ""}`,
                type: "REWARD",
                status: "SUCCESS",
                amount: rewardAmount,
                walletId: wallet.id,
            },
        });
        await tx.wallet.update({
            where: { id: wallet.id },
            data: { bonusBalance: { increment: rewardAmount } },
        });
        // NOTE: your schema has no rewardTransactionId on UserMission.
        // If you want to link it, add the field (see below).
        const updated = await tx.userMission.update({
            where: { id: userMissionId },
            data: {
                status: "CLAIMED",
                claimedAt: now,
                // rewardTransactionId: rewardTransaction.id, // only if you add it to the schema
            },
        });
        return updated;
    });
};
/**
 * ดึงรายการภารกิจทั้งหมดของผู้ใช้ปัจจุบัน พร้อมตัวเลือกในการกรองข้อมูล
 * @description สามารถกรองข้อมูลตามสถานะได้ผ่าน `options.filter`:
 * - ไม่ระบุ filter (default): แสดงเฉพาะภารกิจที่ "กำลังทำ" (ENROLLED, AWAITING_CLAIM) เพื่อประสบการณ์ผู้ใช้ที่ดีที่สุด
 * - 'all': แสดงภารกิจทั้งหมด รวมถึงที่หมดอายุ
 * - 'history': แสดงเฉพาะภารกิจที่จบแล้ว (CLAIMED, EXPIRED, CLAIM_EXPIRED)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกเพิ่มเติม
 * @param {'all'|'history'} [options.filter] - ตัวกรองสถานะภารกิจ
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของ UserMissions
 */
const getMyMissions = async (userId, options = {}) => {
    const { filter } = options;
    // 1. สร้างเงื่อนไขพื้นฐานของ where clause
    const whereClause = {
        userId: userId,
    };
    // 2. เพิ่มเงื่อนไขการกรองตาม filter ที่ส่งเข้ามา
    // BEST PRACTICE: Default behavior shows only active missions (better UX)
    switch (filter) {
        // กรณีต้องการดูภารกิจทั้งหมด (รวมที่หมดอายุ)
        case "all":
            // ไม่เพิ่มเงื่อนไข status เพิ่ม = ดึงมาทั้งหมด
            break;
        // กรณีต้องการเฉพาะภารกิจที่ "จบไปแล้ว" (สำเร็จ, หมดอายุ) - สำหรับหน้าประวัติ
        case "history":
            whereClause.status = {
                in: ["CLAIMED", "EXPIRED", "CLAIM_EXPIRED"],
            };
            break;
        // DEFAULT: แสดงเฉพาะภารกิจที่ "กำลังดำเนินการ" (UX Best Practice)
        // ซ่อนภารกิจที่หมดอายุออกจากหน้าหลักโดยอัตโนมัติ
        default:
            whereClause.status = {
                in: ["ENROLLED", "AWAITING_CLAIM"],
            };
            break;
    }
    // 3. ดึงข้อมูลจากฐานข้อมูลด้วย where clause ที่สร้างขึ้น
    const missions = await prisma.userMission.findMany({
        where: whereClause,
        orderBy: [
            { status: "asc" }, // 1. เรียงตามสถานะก่อน (AWAITING_CLAIM จะมาก่อน ENROLLED)
            { enrolledAt: "desc" }, // 2. ถ้าสถานะเหมือนกัน ให้เรียงตามวันที่เข้าร่วมล่าสุด
        ],
        include: {
            mission: true,
        },
    });
    return missions;
};
/**
 * ดึงข้อมูลรายละเอียดของ UserMission รายการเดียว
 * @async
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการดูรายละเอียด
 * @returns {Promise<object|null>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission หรือ `null` หากไม่พบ
 */
const getMyMissionDetails = async (userMissionId) => {
    const userMissionDetails = await prisma.userMission.findUnique({
        where: { id: userMissionId },
        include: {
            mission: true,
        },
    });
    return userMissionDetails;
};
/**
 * ดึงรายการภารกิจทั้งหมดของผู้ใช้โดยใช้ `line_user_id`
 * @description ออกแบบมาเพื่อประสิทธิภาพโดยการค้นหา `userId` จาก `line_user_id` ก่อน แล้วจึงค้นหาภารกิจ
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของ UserMissions (เป็นอาร์เรย์ว่างหากไม่พบผู้ใช้)
 */
const getUserMissionByLineUserId = async (line_user_id) => {
    // --- STAGE 1: การค้นหา ID หลัก (Primary Key Lookup) ---
    // "เดินไปที่คอมพิวเตอร์ค้นหา": ค้นหา `userId` จาก `line_user_id` ก่อน
    // นี่คือปฏิบัติการที่รวดเร็วมาก เพราะ `line_user_id` มี `@unique` index
    const user = await prisma.user.findUnique({
        where: {
            line_user_id,
        },
        select: {
            id: true, // <-- ดึงมาแค่ ID เท่านั้น
        },
    });
    // Structural Safeguard: หากไม่พบผู้ใช้, ไม่จำเป็นต้องค้นหาภารกิจต่อ
    if (!user) {
        console.warn(`[DATA_NOT_FOUND] No user found for line_user_id: ${line_user_id}. Returning empty mission list.`);
        return []; // คืนค่าอาร์เรย์ว่าง ซึ่งเป็นผลลัพธ์ที่ถูกต้อง
    }
    // --- STAGE 2: การดึงข้อมูลตาม Foreign Key (Foreign Key-based Retrieval) ---
    // "เดินไปที่ชั้นหนังสือที่มีรหัสแปะอยู่": ค้นหา UserMission ทั้งหมดที่ตรงกับ `userId`
    // นี่คือปฏิบัติการที่รวดเร็วมาก เพราะเรากำลัง Query โดยใช้ Foreign Key โดยตรง
    const userMissions = await prisma.userMission.findMany({
        where: {
            userId: user.id, // <-- ใช้ `userId` ที่ได้มาจาก Stage 1
        },
        // [RECOMMENDED] เพิ่ม include เพื่อให้ข้อมูลสมบูรณ์สำหรับ Frontend
        include: {
            mission: true, // ดึงข้อมูลของ Mission ต้นแบบมาด้วย
        },
    });
    return userMissions;
};
/**
 * แก้ไขข้อมูล UserMission โดย Admin
 * @description ฟังก์ชันนี้ใช้หลัก "Whitelist" เพื่ออนุญาตให้อัปเดตเฉพาะฟิลด์ที่กำหนด (เช่น status, currentProgress)
 * และมีตรรกะอัตโนมัติในการกำหนด `completedAt` และ `claimExpiresAt` เมื่อสถานะเปลี่ยนเป็น `AWAITING_CLAIM`
 * @async
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการแก้ไข
 * @param {object} updateBody - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ UserMission ที่อัปเดตแล้ว
 * @throws {ApiError} หากข้อมูลนำเข้าไม่ถูกต้อง หรือไม่พบ UserMission
 */
const editUserMission = async (userMissionId, updateBody) => {
    // --- STAGE 1: การตรวจสอบความสมบูรณ์ของโครงสร้าง (Structural Integrity Check) ---
    if (!userMissionId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "UserMission ID is required.");
    }
    if (!updateBody || Object.keys(updateBody).length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Update payload cannot be empty.");
    }
    // --- STAGE 2: การสืบสวนเบื้องต้น (Initial Investigation) ---
    // ดึงข้อมูลปัจจุบันมาตรวจสอบก่อนทำการแก้ไข
    const existingUserMission = await prisma.userMission.findUnique({
        where: { id: userMissionId },
    });
    // Structural Safeguard 1: ป้องกันเป้าหมายที่ไม่มีอยู่จริง
    if (!existingUserMission) {
        throw new ApiError(httpStatus.NOT_FOUND, "UserMission not found.");
    }
    // --- STAGE 3: การชำระล้างและสร้างแฟ้มข้อมูล (Data Sanitization & Payload Construction) ---
    // "The Whitelist": เราจะสร้าง object ใหม่ที่มีเฉพาะฟิลด์ที่ "อนุญาต" ให้แก้ไขได้เท่านั้น
    // เพื่อป้องกันการส่งข้อมูลที่ไม่พึงประสงค์เข้ามา (เช่น พยายามแก้ไข userId)
    const dataToUpdate = {};
    if (updateBody.currentProgress !== undefined) {
        const progress = parseInt(updateBody.currentProgress, 10);
        if (isNaN(progress) || progress < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid currentProgress. Must be a non-negative number.");
        }
        dataToUpdate.currentProgress = progress;
    }
    if (updateBody.status !== undefined) {
        // ตรวจสอบว่า status ที่ส่งมาเป็นค่าที่ถูกต้องใน Enum หรือไม่
        if (!Object.values(UserMissionStatus).includes(updateBody.status)) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status value: ${updateBody.status}`);
        }
        dataToUpdate.status = updateBody.status;
        // [Business Logic] หากมีการเปลี่ยนสถานะเป็น AWAITING_CLAIM
        // เราควรจะกำหนดเวลา completedAt และ claimExpiresAt โดยอัตโนมัติ
        if (updateBody.status === UserMissionStatus.AWAITING_CLAIM && !existingUserMission.completedAt) {
            dataToUpdate.completedAt = new Date();
            const claimExpirationDate = new Date();
            claimExpirationDate.setDate(claimExpirationDate.getDate() + 1); // หมดอายุใน 24 ชั่วโมง
            dataToUpdate.claimExpiresAt = claimExpirationDate;
        }
    }
    // Structural Safeguard 2: ป้องกันการส่ง Payload ที่ว่างเปล่าหลังจากการกรอง
    if (Object.keys(dataToUpdate).length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Payload contains no valid fields to update for UserMission.");
    }
    // --- STAGE 4: การปฏิบัติการ (The Operation) ---
    console.log(`[AUDIT] Updating UserMission ${userMissionId} with data:`, dataToUpdate);
    const updatedUserMission = await prisma.userMission.update({
        where: { id: userMissionId },
        data: dataToUpdate,
    });
    return updatedUserMission;
};
/**
 * ตรวจสอบและอัปเดตความคืบหน้าของภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ตาม Event ที่เกิดขึ้น
 * @description ฟังก์ชันนี้ทำหน้าที่เป็น Event Handler หลัก จะค้นหาภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
 * และคำนวณ Progress ที่จะเพิ่มขึ้นตามประเภทของ Event (eventType) และประเภทของภารกิจ
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่เกิด Event
 * @param {string} eventType - ประเภทของ Event (เช่น 'DEPOSIT_SUCCESS', 'NEWCOMER_FIRST_DEPOSIT')
 * @param {object} eventData - ข้อมูลเพิ่มเติมเกี่ยวกับ Event (เช่น `{ amount: 100 }`)
 * @returns {Promise<void>}
 */
const checkAndUpdateMissionProgress = async (userId, eventType, eventData) => {
    // 1. ค้นหาภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
    const activeUserMissions = await prisma.userMission.findMany({
        where: {
            userId: userId,
            status: "ENROLLED",
        },
        include: {
            mission: true, // ดึงข้อมูล Mission ต้นแบบมาด้วยเพื่อตรวจสอบเงื่อนไข
        },
    });
    if (activeUserMissions.length === 0) {
        console.log(`No active missions found for user ${userId}.`);
        return; // ไม่มีภารกิจให้ทำ, จบการทำงาน
    }
    console.log(`Found ${activeUserMissions.length} active missions for user ${userId}. Checking progress...`);
    // 2. สร้าง Array ของ Promises สำหรับการอัปเดตแต่ละภารกิจ
    const updatePromises = activeUserMissions.map(async (userMission) => {
        let progressIncrement = 0;
        // --- 3. Logic การคำนวณ Progress ตามประเภทภารกิจและ Event ---
        // เราจะใช้ switch-case ที่ซ้อนกันเพื่อความชัดเจน
        switch (eventType) {
            case "DEPOSIT_SUCCESS": {
                switch (userMission.mission.type) {
                    // ภารกิจ Onboarding (เช่น ออมครั้งแรก)
                    case "ONBOARDING":
                        progressIncrement = 1; // นับเป็น 1 ครั้ง
                        break;
                    // ภารกิจทั่วไป (อาจจะเป็นนับครั้ง หรือนับยอด)
                    case "RECURRING":
                        // ตัวอย่าง: ถ้า completeProgress > 100 ให้ถือว่าเป็นภารกิจ "สะสมยอด"
                        if (userMission.mission.completeProgress > 100) {
                            progressIncrement = eventData.amount; // เพิ่มตามจำนวนเงิน
                        }
                        else {
                            progressIncrement = 1; // เพิ่ม 1 ครั้ง
                        }
                        break;
                }
                break;
            }
            case "NEWCOMER_FIRST_DEPOSIT": {
                // This event should only affect missions of type 'REFERRAL'
                if (userMission.mission.type === "REFERRAL") {
                    // Increment the counter by 1, representing one successful referral.
                    progressIncrement = 1;
                    console.log(`[Mission] User ${userId}'s REFERRAL mission progress will be incremented.`);
                }
                break;
            }
        }
        // --- 4. ถ้ามีการเปลี่ยนแปลง Progress, ให้อัปเดตฐานข้อมูล ---
        if (progressIncrement > 0) {
            const updatedMission = await prisma.userMission.update({
                where: { id: userMission.id },
                data: {
                    currentProgress: { increment: progressIncrement },
                },
            });
            // --- 5. ตรวจสอบการสำเร็จภารกิจโดยอัตโนมัติ ---
            await checkForCompletion(updatedMission);
        }
    });
    // 6. รอให้การอัปเดตทั้งหมดเสร็จสิ้น
    await Promise.all(updatePromises);
    console.log(`Finished checking mission progress for user ${userId}.`);
};
/**
 * ตรวจสอบและเปลี่ยนสถานะภารกิจเป็น 'สำเร็จ' โดยอัตโนมัติ (Helper Function)
 * @description ถูกเรียกหลังจากความคืบหน้าของภารกิจมีการอัปเดต หาก progress ถึงเป้าหมาย
 * จะเปลี่ยนสถานะเป็น `AWAITING_CLAIM` และกำหนดวันหมดอายุการรับรางวัล
 * @async
 * @param {object} userMission - อ็อบเจกต์ UserMission ที่ต้องการตรวจสอบ
 * @returns {Promise<void>}
 */
const checkForCompletion = async (userMission) => {
    // ตรวจสอบว่า progress ปัจจุบันถึงเป้าหมายแล้ว และสถานะยังเป็น ENROLLED อยู่
    if (userMission.currentProgress >= userMission.completeProgress && userMission.status === "ENROLLED") {
        const claimExpiresAt = new Date();
        claimExpiresAt.setHours(claimExpiresAt.getHours() + 24);
        await prisma.userMission.update({
            where: { id: userMission.id },
            data: {
                status: "AWAITING_CLAIM",
                completedAt: new Date(),
                claimExpiresAt: claimExpiresAt,
            },
        });
        console.log(`Mission ${userMission.id} completed! Status is now AWAITING_CLAIM.`);
        // (Optional) ส่ง Notification แจ้งเตือนผู้ใช้ว่าทำภารกิจสำเร็จแล้ว
    }
};
/**
 * จัดการภารกิจที่หมดอายุ (สำหรับ Cron Job)
 * @description ฟังก์ชันนี้ถูกออกแบบมาเพื่อเรียกใช้งานโดย Cron Job เพื่อเปลี่ยนสถานะภารกิจที่หมดอายุ
 * โดยจะจัดการ 2 กรณี: 1) ENROLLED -> EXPIRED และ 2) AWAITING_CLAIM -> CLAIM_EXPIRED
 * @async
 * @returns {Promise<{expiredCount: number, claimExpiredCount: number}>} Promise ที่ resolve เป็นอ็อบเจกต์สรุปจำนวนภารกิจที่อัปเดต
 * @throws {ApiError} หากเกิดข้อผิดพลาดระหว่างการประมวลผล
 */
const expireOverdueMissions = async () => {
    const now = new Date();
    console.log(`[Cron Job] Running expireOverdueMissions at ${now.toISOString()}`);
    try {
        // --- 1. จัดการภารกิจที่ทำไม่สำเร็จ (ENROLLED -> EXPIRED) ---
        // ใช้ `updateMany` เพื่ออัปเดตหลาย record ในครั้งเดียว ซึ่งมีประสิทธิภาพสูงมาก
        const expiredResult = await prisma.userMission.updateMany({
            where: {
                // เงื่อนไข: สถานะต้องเป็น ENROLLED "และ" เวลาหมดอายุ (userExpiresAt) ต้องผ่านไปแล้ว
                status: "ENROLLED",
                userExpiresAt: {
                    lt: now,
                },
            },
            data: {
                status: "EXPIRED",
            },
        });
        // --- 2. จัดการภารกิจที่ไม่ได้กดรับรางวัล (AWAITING_CLAIM -> CLAIM_EXPIRED) ---
        const claimExpiredResult = await prisma.userMission.updateMany({
            where: {
                status: "AWAITING_CLAIM",
                claimExpiresAt: {
                    lt: now,
                },
            },
            data: {
                status: "CLAIM_EXPIRED",
            },
        });
        const result = {
            expiredCount: expiredResult.count,
            claimExpiredCount: claimExpiredResult.count,
        };
        console.log("[Cron Job] Finished expiring missions:", result);
        return result;
    }
    catch (error) {
        console.error("[Cron Job] An error occurred during expireOverdueMissions:", error);
        // โยน Error ต่อไปเพื่อให้ระบบ Scheduler (เช่น QStash) รู้ว่างานล้มเหลวและอาจจะลองใหม่ (retry)
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to process overdue missions.");
    }
};
export default {
    enrollInMission,
    claimMissionReward,
    getMyMissions,
    getMyMissionDetails,
    getUserMissionByLineUserId,
    editUserMission,
    expireOverdueMissions,
    checkAndUpdateMissionProgress,
};
//# sourceMappingURL=user-mission.service.js.map