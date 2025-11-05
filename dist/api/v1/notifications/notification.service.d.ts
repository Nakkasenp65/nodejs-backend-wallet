declare namespace _default {
    export { createUserNotification };
    export { createSystemNotification };
    export { getNotificationsByUserId };
    export { getSystemNotifications };
    export { editNotification };
    export { deleteNotification };
    export { markNotificationAsRead };
    export { clearNotificationsByType };
    export { sendDepositSuccess };
    export { sendDepositRejected };
    export { sendMissionCompleted };
    export { sendRewardClaimed };
    export { sendWelcomeNotification };
    export { sendWithdrawSuccessNotification };
    export { sendTransferReceived };
    export { sendTransferSent };
    export { sendGoalCreated };
    export { sendGoalMilestone };
    export { sendGoalDueReminder };
    export { sendGoalAchieved };
    export { sendInactivityReminder };
    export { createWelcomeNotifications };
}
export default _default;
/**
 * (Core) สร้างการแจ้งเตือนที่เชื่อมโยงกับผู้ใช้รายบุคคล
 * @description ฟังก์ชันพื้นฐานสำหรับสร้างการแจ้งเตือนทุกประเภทที่ต้องมีผู้รับชัดเจน
 * สามารถเชื่อมโยงการแจ้งเตือนเข้ากับธุรกรรมที่เกี่ยวข้องได้ผ่าน `transactionId`
 * ถูกออกแบบมาให้ไม่โยน Error เพื่อป้องกันไม่ให้ Flow การทำงานหลัก (เช่น การลงทะเบียน) ล้มเหลว
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่จะได้รับการแจ้งเตือน
 * @param {object} payload - อ็อบเจกต์ข้อมูลการแจ้งเตือน
 * @param {string} payload.title - หัวข้อการแจ้งเตือน
 * @param {string} [payload.body] - เนื้อหาการแจ้งเตือน
 * @param {NotificationType} payload.type - ประเภทของการแจ้งเตือน (จาก Prisma Enum)
 * @param {string} [payload.transactionId] - (Optional) ID ของธุรกรรมที่เกี่ยวข้อง
 * @returns {Promise<object|undefined>} Promise ที่ resolve เป็นอ็อบเจกต์ Notification ที่สร้างขึ้น หรือ undefined หากเกิดข้อผิดพลาด
 */
declare function createUserNotification(userId: string, payload: {
    title: string;
    body?: string;
    type: NotificationType;
    transactionId?: string;
}): Promise<object | undefined>;
declare function createSystemNotification(payload: any): Promise<{
    id: string;
    createdAt: Date;
    type: import("../../../generated/prisma/index.js").$Enums.NotificationType;
    userId: string;
    transactionId: string | null;
    title: string;
    body: string | null;
    imageUrl: string | null;
    isRead: boolean;
}>;
/**
 * ดึงรายการการแจ้งเตือนทั้งหมดของผู้ใช้ที่ระบุ
 * @description ดึงข้อมูลโดยเรียงจากใหม่สุดไปเก่าสุด และแนบข้อมูลธุรกรรมที่เกี่ยวข้องมาด้วย (ถ้ามี)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของการแจ้งเตือน
 * @throws {ApiError} หากไม่ได้ระบุ `userId`
 */
declare function getNotificationsByUserId(userId: string): Promise<Array<object>>;
/**
 * ดึงรายการการแจ้งเตือนของระบบ (สำหรับ Admin)
 * @description ดึงเฉพาะการแจ้งเตือนประเภท 'SYSTEM' พร้อมรองรับการแบ่งหน้าและการค้นหา
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือก
 * @param {number} [options.page=1] - เลขหน้า
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.search] - คำค้นหาสำหรับ title และ body
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลและสถานะการแบ่งหน้า
 */
declare function getSystemNotifications(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
}): Promise<{
    data: Array<object>;
    paging: object;
}>;
/**
 * แก้ไขข้อมูลการแจ้งเตือน (สำหรับ Admin)
 * @description ใช้หลัก "Whitelist" เพื่ออนุญาตให้อัปเดตเฉพาะฟิลด์ที่กำหนด (title, body, type, isRead)
 * @async
 * @param {string} notificationId - ID ของการแจ้งเตือนที่ต้องการแก้ไข
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์การแจ้งเตือนที่อัปเดตแล้ว
 * @throws {ApiError} หากไม่พบการแจ้งเตือน หรือข้อมูลนำเข้าไม่ถูกต้อง
 */
declare function editNotification(notificationId: string, payload: object): Promise<object>;
/**
 * ลบการแจ้งเตือน
 * @async
 * @param {string} notificationId - ID ของการแจ้งเตือนที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของการแจ้งเตือนที่ถูกลบไป
 * @throws {ApiError} หากไม่พบการแจ้งเตือน
 */
declare function deleteNotification(notificationId: string): Promise<object>;
/**
อัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว"
@async
@param {string} notificationId - ID ของการแจ้งเตือน
@returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์การแจ้งเตือนที่อัปเดตแล้ว
*/
declare function markNotificationAsRead(notificationId: string): Promise<object>;
/**
 * ลบการแจ้งเตือนทั้งหมดของผู้ใช้ตามประเภทที่ระบุ
 * @description ฟังก์ชันนี้ใช้ `deleteMany` เพื่อลบการแจ้งเตือนหลายรายการพร้อมกันในครั้งเดียว
 * ซึ่งมีประสิทธิภาพสูง เหมาะสำหรับใช้ในกรณีที่ผู้ใช้ต้องการ "ล้าง" การแจ้งเตือนประเภทใดประเภทหนึ่ง
 * เช่น ลบการแจ้งเตือนเกี่ยวกับ Wallet ทั้งหมด
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการล้างการแจ้งเตือน
 * @param {NotificationType} type - ประเภทของการแจ้งเตือนที่ต้องการลบ (จาก Prisma Enum)
 * @returns {Promise<{count: number}>} Promise ที่ resolve เป็นอ็อบเจกต์ซึ่งมี property `count`
 * ที่ระบุจำนวนการแจ้งเตือนที่ถูกลบไป
 */
declare function clearNotificationsByType(userId: string, type: NotificationType): Promise<{
    count: number;
}>;
/**
 * ส่งการแจ้งเตือนเมื่อการฝากเงินสำเร็จ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {number} amount - จำนวนเงิน
 * @param {string} transactionId - ID ธุรกรรม
 * @returns {Promise<object|undefined>}
 */
declare function sendDepositSuccess(userId: string, amount: number, transactionId: string): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อรายการฝากเงินถูกปฏิเสธ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {string} reason - เหตุผลที่รายการถูกปฏิเสธ (มักจะมาจาก description ของ transaction)
 * @param {string} transactionId - ID ธุรกรรมที่เกี่ยวข้อง
 * @returns {Promise<object|undefined>}
 */
declare function sendDepositRejected(userId: string, reason: string, transactionId: string): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้ทำภารกิจสำเร็จ (สถานะเปลี่ยนเป็น AWAITING_CLAIM)
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {string} missionTitle - ชื่อของภารกิจที่ทำสำเร็จ
 * @returns {Promise<object|undefined>}
 */
declare function sendMissionCompleted(userId: string, missionTitle: string): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้กดรับรางวัลจากภารกิจสำเร็จ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {number} rewardAmount - จำนวนเงินรางวัลที่ได้รับ
 * @param {string} transactionId - ID ธุรกรรมของรางวัลที่ถูกสร้างขึ้น
 * @returns {Promise<object|undefined>}
 */
declare function sendRewardClaimed(userId: string, rewardAmount: number, transactionId: string): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนต้อนรับผู้ใช้ใหม่ (เวอร์ชันย่อ)
 * @async
 * @param {string} userId - ID ของผู้ใช้ใหม่
 * @returns {Promise<object|undefined>}
 */
declare function sendWelcomeNotification(userId: string): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อรายการถอนเงินสำเร็จ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {number} amount - จำนวนเงินที่ถอน
 * @param {string} transactionId - ID ธุรกรรมที่เกี่ยวข้อง
 * @returns {Promise<object|undefined>}
 */
declare function sendWithdrawSuccessNotification(userId: string, amount: number, transactionId: string): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อได้รับเงินโอน
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดการโอน
 * @param {number} details.amount - จำนวนเงิน
 * @param {string} [details.fromName] - ชื่อผู้ส่ง
 * @param {string} [details.transactionId] - ID ธุรกรรม
 * @returns {Promise<object|undefined>}
 */
declare function sendTransferReceived(userId: string, { amount, fromName, fromPhone, note, transactionId }?: {
    amount: number;
    fromName?: string;
    transactionId?: string;
}): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อทำการโอนเงินสำเร็จ (ส่งให้ฝั่งผู้โอน)
 * @async
 * @param {string} userId - ID ผู้ส่ง
 * @param {object} details - รายละเอียดการโอน
 * @param {number} details.amount - จำนวนเงิน
 * @param {string} [details.toName] - ชื่อผู้รับ
 * @param {string} [details.transactionId] - ID ธุรกรรม
 * @returns {Promise<object|undefined>}
 */
declare function sendTransferSent(userId: string, { amount, toName, toPhone, note, transactionId }?: {
    amount: number;
    toName?: string;
    transactionId?: string;
}): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้สร้างเป้าหมายการออมใหม่
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดของเป้าหมายที่สร้างขึ้น
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @param {number} details.targetAmount - ยอดเงินเป้าหมาย
 * @param {string|Date} [details.deadline] - วันครบกำหนดเป้าหมาย (ถ้ามี)
 * @returns {Promise<object|undefined>}
 */
declare function sendGoalCreated(userId: string, { goalTitle, targetAmount, deadline }?: {
    goalTitle: string;
    targetAmount: number;
    deadline?: string | Date;
}): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้ออมเงินถึงจุดสำคัญ (Milestone)
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดความคืบหน้า
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @param {number} details.percent - เปอร์เซ็นต์ความสำเร็จ
 * @param {number} [details.currentAmount] - ยอดออมปัจจุบัน
 * @param {number} [details.targetAmount] - ยอดเป้าหมายรวม
 * @returns {Promise<object|undefined>}
 */
declare function sendGoalMilestone(userId: string, { goalTitle, percent, currentAmount, targetAmount }?: {
    goalTitle: string;
    percent: number;
    currentAmount?: number;
    targetAmount?: number;
}): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเพื่อเตือนให้ผู้ใช้ออมเงินตามแผน
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดการแจ้งเตือน
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @param {number} details.amountDue - ยอดเงินที่ควรออม
 * @param {number} details.daysLeft - จำนวนวันที่เหลือก่อนถึงกำหนด
 * @returns {Promise<object|undefined>}
 */
declare function sendGoalDueReminder(userId: string, { goalTitle, amountDue, daysLeft }?: {
    goalTitle: string;
    amountDue: number;
    daysLeft: number;
}): Promise<object | undefined>;
/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้ออมเงินบรรลุเป้าหมาย
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดเป้าหมาย
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @returns {Promise<object|undefined>}
 */
declare function sendGoalAchieved(userId: string, { goalTitle }?: {
    goalTitle: string;
}): Promise<object | undefined>;
/**
 * แจ้งเตือนเมื่อไม่มีการออมมาระยะหนึ่ง (ป้องกันหลุดแผน)
 * @param {string} userId
 * @param {object} data
 * @param {number} data.days - เว้นไปกี่วันแล้วที่ไม่ได้ออม
 * @param {string} [data.goalTitle]
 */
declare function sendInactivityReminder(userId: string, { days, goalTitle }?: {
    days: number;
    goalTitle?: string;
}): Promise<any>;
/**
 * สร้างชุดการแจ้งเตือนต้อนรับมาตรฐานสำหรับผู้ใช้ใหม่
 * @description ฟังก์ชันนี้จะสร้างการแจ้งเตือน 2 รายการพร้อมกันโดยใช้ `prisma.createMany` เพื่อประสิทธิภาพ:
 * 1. การแจ้งเตือนเรื่องโบนัสต้อนรับ 100 บาท (ประเภท REWARD)
 * 2. การแจ้งเตือนข้อเสนอโบนัส 2 เท่าสำหรับการฝากเงินครั้งแรก (ประเภท SYSTEM)
 * @async
 * @param {string} userId - ID ของผู้ใช้ใหม่ที่ต้องการสร้างการแจ้งเตือนให้
 * @param {string} [welcomeTransactionId] - (ยังไม่ได้ใช้งาน) ID ของธุรกรรมโบนัสต้อนรับ (ถ้ามี)
 * @returns {Promise<void>} ฟังก์ชันนี้ไม่คืนค่าใดๆ
 * @throws {Error} ในกรณีที่การสร้างข้อมูลในฐานข้อมูลล้มเหลว
 */
declare function createWelcomeNotifications(userId: string, welcomeTransactionId?: string): Promise<void>;
import { NotificationType } from "../../../generated/prisma/index.js";
//# sourceMappingURL=notification.service.d.ts.map