declare namespace _default {
    export { getWalletTransaction };
    export { createInternalTransfer };
    export { getTransactionsWithThaiStatus };
    export { createSavingTransaction };
    export { createSuccessedTransaction };
    export { createWithdrawTransaction };
    export { getSuccessTransaction };
    export { updateTransaction };
    export { exportToPdf };
    export { getTransactions };
    export { editTransaction };
    export { deleteTransaction };
    export { approveDeposit };
    export { rejectDeposit };
}
export default _default;
/**
 * ดึงประวัติธุรกรรมทั้งหมดที่เกี่ยวข้องกับ Wallet ที่ระบุ พร้อมตัวเลือกในการกรองตามเดือนและปี
 * @async
 * @param {string} walletId - ID ของ Wallet ที่ต้องการดูประวัติ
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกเพิ่มเติม
 * @param {number|string} [options.year] - ปีที่ต้องการกรองข้อมูล (ค.ศ.)
 * @param {number|string} [options.month] - เดือนที่ต้องการกรองข้อมูล (0-11)
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของธุรกรรม
 */
declare function getWalletTransaction(walletId: string, options?: {
    year?: number | string;
    month?: number | string;
}): Promise<Array<object>>;
/**
 * ดำเนินการโอนเงินระหว่างผู้ใช้สองคนภายในระบบแบบ Atomic Operation
 * @description เป็นกระบวนการที่สำคัญซึ่งมีการตรวจสอบ PIN, อัปเดตยอดเงินของผู้ส่งและผู้รับ,
 * สร้างบันทึกธุรกรรม, และส่งการแจ้งเตือน (Notification และ LINE Flex Message) ทั้งหมดพร้อมกัน
 * @async
 * @param {string} senderUserId - ID ของผู้ส่ง
 * @param {object} transferData - อ็อบเจกต์ข้อมูลการโอน (recipientUserId, amount, pin)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมการโอนที่สร้างขึ้น
 * @throws {ApiError} หากข้อมูลไม่ถูกต้อง, ยอดเงินไม่เพียงพอ, ไม่พบผู้ใช้, หรือ PIN ไม่ถูกต้อง
 */
declare function createInternalTransfer(senderUserId: string, transferData: object): Promise<object>;
declare function getTransactionsWithThaiStatus(walletId: any): Promise<import("../../../generated/prisma/runtime/library.js").JsonObject>;
/**
 * สร้างธุรกรรมการออมเงิน (ฝากเงิน) ใหม่ในสถานะ 'รอตรวจสอบ' (PENDING)
 * @description ฟังก์ชันนี้ใช้สำหรับบันทึกรายการฝากเงินเริ่มต้นที่ผู้ใช้แจ้งเข้ามา โดยจะแนบ URL ของรูปสลิปไปด้วย
 * @async
 * @param {object} transactionBody - อ็อบเจกต์ข้อมูลธุรกรรมจากผู้ใช้
 * @param {string} imageUrl - URL ของรูปสลิปที่อัปโหลดแล้ว
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Transaction ที่ถูกสร้างขึ้นใหม่
 * @throws {ApiError} หากไม่ได้ระบุ `walletId` หรือไม่พบ Wallet ดังกล่าวในระบบ
 */
declare function createSavingTransaction(transactionBody: object, imageUrl: string): Promise<object>;
/**
 * (Helper) สร้างธุรกรรมประเภท REWARD ที่มีสถานะเป็น SUCCESS ทันที
 * @description ใช้สำหรับสร้างรายการธุรกรรมที่เป็นผลสำเร็จโดยสมบูรณ์แล้ว เช่น การให้โบนัส
 * @async
 * @param {string} name - ชื่อธุรกรรม
 * @param {number} amount - จำนวนเงิน
 * @param {string} status - สถานะ (ปกติคือ 'SUCCESS')
 * @param {string} from - แหล่งที่มาของเงิน (เช่น 'SYSTEM_BONUS')
 * @param {string} to - ชื่อผู้รับ
 * @param {string} description - คำอธิบายธุรกรรม
 * @param {string} walletId - ID ของ Wallet ผู้รับ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Transaction ที่ถูกสร้างขึ้น
 */
declare function createSuccessedTransaction(name: string, amount: number, status: string, from: string, to: string, description: string, walletId: string): Promise<object>;
/**
 * สร้างคำขอถอนเงินใหม่ในสถานะ 'รอเจ้าหน้าที่ดำเนินการ' (PENDING)
 * @description ดำเนินการภายใน Database Transaction เพื่อความปลอดภัย แม้จะเป็นการสร้างรายการเดียวก็ตาม
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการถอนเงิน
 * @param {number|string} amount - จำนวนเงินที่ต้องการถอน
 * @param {object} withdrawalDetails - อ็อบเจกต์ข้อมูลบัญชีธนาคารสำหรับรับเงิน
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมการถอนเงินที่สร้างขึ้นใหม่
 * @throws {ApiError} หากข้อมูลนำเข้าไม่ถูกต้อง หรือไม่พบ Wallet ของผู้ใช้
 */
declare function createWithdrawTransaction(userId: string, amount: number | string, withdrawalDetails: object): Promise<object>;
declare function getSuccessTransaction(walletId: any, options?: {}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string | null;
    amount: number | null;
    type: import("../../../generated/prisma/index.js").$Enums.TransactionType | null;
    status: import("../../../generated/prisma/index.js").$Enums.TransactionStatus;
    from: string | null;
    fromWalletId: string | null;
    toWalletId: string | null;
    to: string | null;
    description: string | null;
    slipImageUrl: string | null;
    bank: string | null;
    verified: boolean;
    verifiedAmount: number | null;
    externalSource: string | null;
}[]>;
declare function updateTransaction(code: any, transactionId: any, verifyAmount?: number, senderName?: string, sendBankName?: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string | null;
    amount: number | null;
    type: import("../../../generated/prisma/index.js").$Enums.TransactionType | null;
    status: import("../../../generated/prisma/index.js").$Enums.TransactionStatus;
    from: string | null;
    fromWalletId: string | null;
    toWalletId: string | null;
    to: string | null;
    description: string | null;
    slipImageUrl: string | null;
    bank: string | null;
    verified: boolean;
    verifiedAmount: number | null;
    externalSource: string | null;
}>;
/**
 * สร้างไฟล์ PDF รายการเดินบัญชีสำหรับ Wallet ที่ระบุ และส่งไปยังอีเมลของผู้ใช้
 * @async
 * @param {string} email - อีเมลของผู้รับ
 * @param {string} walletId - ID ของ Wallet ที่ต้องการสร้างรายการ
 * @param {string} [startDate] - วันที่เริ่มต้น (ISO format)
 * @param {string} [endDate] - วันที่สิ้นสุด (ISO format)
 * @returns {Promise<{count: number, emailId: string|null}>} Promise ที่ resolve เป็นอ็อบเจกต์สรุปผลการส่ง
 * @throws {Error} หากไม่พบ Wallet
 */
declare function exportToPdf(email: string, walletId: string, startDate?: string, endDate?: string): Promise<{
    count: number;
    emailId: string | null;
}>;
/**
 * ดึงรายการธุรกรรมทั้งหมด (สำหรับ Admin) พร้อมระบบแบ่งหน้า, จัดเรียง, และกรองตามสถานะ
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือก
 * @param {number} [options.page=1] - เลขหน้า
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.status] - สถานะที่ต้องการกรอง (เช่น 'PENDING', 'SUCCESS')
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลและสถานะการแบ่งหน้า
 */
declare function getTransactions(options?: {
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<{
    data: Array<object>;
    paging: object;
}>;
/**
 * ฟังก์ชันหลักสำหรับแก้ไขธุรกรรมโดย Admin ทำหน้าที่เป็นตัวกระจายงาน (Dispatcher)
 * @description ทำหน้าที่เตรียมและกรองข้อมูล จากนั้นจะวิเคราะห์เจตนาของการแก้ไข หากเป็นการอนุมัติ
 * (เปลี่ยนสถานะเป็น SUCCESS) จะส่งต่อไปให้ `handleApproval` เพื่อจัดการแบบ Atomic
 * หากเป็นการแก้ไขทั่วไป จะส่งต่อไปให้ `handleGenericUpdate`
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการแก้ไข
 * @param {object} [file] - ไฟล์รูปภาพสลิป (ถ้ามี)
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่อัปเดตแล้ว
 */
declare function editTransaction(transactionId: string, file?: object, payload: object): Promise<object>;
/**
 * ลบธุรกรรมออกจากระบบอย่างถาวร (สำหรับ Admin)
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่ถูกลบไป
 * @throws {ApiError} หากไม่ได้ระบุ `transactionId`
 */
declare function deleteTransaction(transactionId: string): Promise<object>;
/**
 * อนุมัติรายการฝากเงินที่รอดำเนินการ (PENDING) แบบ Atomic Operation
 * @description กระบวนการที่สมบูรณ์ซึ่งประกอบด้วย 3 ขั้นตอน:
 * 1. Pre-condition Validation: ตรวจสอบสถานะและสิทธิ์ก่อนดำเนินการ
 * 2. Atomic Operation: อัปเดต Wallet, จัดการโบนัสฝากครั้งแรก, อัปเดต Transaction, และกระตุ้นระบบ Referral ทั้งหมดพร้อมกัน
 * 3. Post-Commit Operations: ส่งการแจ้งเตือนและอัปเดตภารกิจหลังจากที่ Transaction สำเร็จแล้วเท่านั้น
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการอนุมัติ
 * @param {object} approvalData - ข้อมูลการอนุมัติ (userId, amount, sender)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่อนุมัติแล้ว
 * @throws {ApiError} หากไม่พบธุรกรรม, สถานะไม่ถูกต้อง, หรือสิทธิ์ไม่ตรงกัน
 */
declare function approveDeposit(transactionId: string, approvalData: object): Promise<object>;
/**
 * ปฏิเสธรายการฝากเงินที่รอดำเนินการ (PENDING)
 * @description ตรวจสอบสถานะก่อนดำเนินการ จากนั้นอัปเดตสถานะเป็น 'REJECTED' พร้อมบันทึกเหตุผล
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการปฏิเสธ
 * @param {object} rejectionData - ข้อมูลการปฏิเสธ (code, reason)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่ปฏิเสธแล้ว
 */
declare function rejectDeposit(transactionId: string, rejectionData: object): Promise<object>;
//# sourceMappingURL=transaction.service.d.ts.map