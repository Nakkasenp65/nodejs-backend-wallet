declare namespace _default {
    export { sendRegisterFlexMessage };
    export { sendDepositFlexMessage };
    export { sendWithdrawSuccessFlex };
    export { sendSenderFlex };
    export { sendReceiverFlex };
}
export default _default;
/**
 * ส่ง Flex Message ต้อนรับผู้ใช้ใหม่หลังลงทะเบียนสำเร็จ
 * @description ดึงข้อมูลผู้ใช้จากฐานข้อมูล, จัดรูปแบบข้อมูล, สร้าง Flex Message,
 * และส่งไปยังผู้ใช้ผ่าน LINE Messaging API
 * @async
 * @param {string} line_user_id - Line User ID ของผู้ใช้ใหม่
 * @returns {Promise<object>} Promise ที่ resolve เป็นข้อมูลการตอบกลับจาก LINE API
 * @throws {ApiError} หากไม่พบผู้ใช้หรือการส่งข้อความล้มเหลว
 */
declare function sendRegisterFlexMessage(line_user_id: string): Promise<object>;
/**
 * ส่ง Flex Message แจ้งเตือนการฝากเงินสำเร็จ
 * @description จัดรูปแบบข้อมูลวันที่, จำนวนเงิน, และข้อมูลธนาคาร, จากนั้นสร้างและส่ง Flex Message
 * @async
 * @param {string} line_user_id - Line User ID ของผู้รับ
 * @param {number} amount - จำนวนเงินที่ฝาก
 * @param {number} balance - ยอดเงินคงเหลือล่าสุด
 * @param {string} walletUniqueId - รหัส Wallet ของผู้ใช้
 * @param {string} senderName - ชื่อผู้โอน
 * @param {string} senderBankNumber - เลขบัญชีผู้โอน
 * @param {string} senderBankName - ชื่อธนาคารผู้โอน
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @returns {Promise<object>} Promise ที่ resolve เป็นข้อมูลการตอบกลับจาก LINE API
 */
declare function sendDepositFlexMessage(line_user_id: string, amount: number, balance: number, walletUniqueId: string, senderName: string, senderBankNumber: string, senderBankName: string, updatedDate: Date): Promise<object>;
/**
 * ส่ง Flex Message แจ้งเตือนการถอนเงินสำเร็จ
 * @description จัดรูปแบบข้อมูลวันที่, จำนวนเงิน, และข้อมูลผู้รับ, จากนั้นสร้างและส่ง Flex Message
 * @async
 * @param {string} line_user_id - Line User ID ของผู้รับ
 * @param {number} amount - จำนวนเงินที่ถอน
 * @param {number} balance - ยอดเงินคงเหลือล่าสุด
 * @param {string} walletUniqueId - รหัส Wallet ของผู้ใช้
 * @param {string} fullname - ชื่อเต็มของผู้ใช้
 * @param {string} to - ข้อมูลบัญชีผู้รับ (เช่น 'ธนาคารไทยพาณิชย์ - 1234567890')
 * @param {string} bank - ชื่อธนาคารผู้รับ
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @returns {Promise<object>} Promise ที่ resolve เป็นข้อมูลการตอบกลับจาก LINE API
 */
declare function sendWithdrawSuccessFlex(line_user_id: string, amount: number, balance: number, walletUniqueId: string, fullname: string, to: string, bank: string, updatedDate: Date): Promise<object>;
/**
 * ส่ง Flex Message สรุปรายการให้ "ผู้ส่ง" ในการโอนเงินภายในระบบ
 * @async
 * @param {string} senderLineId - Line User ID ของผู้ส่ง
 * @param {number} sendingAmount - จำนวนเงินที่โอน
 * @param {string} senderWalletUniqueId - รหัส Wallet ของผู้ส่ง
 * @param {string} receiverWalletUniqueId - รหัส Wallet ของผู้รับ
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @param {number} senderBalance - ยอดเงินคงเหลือล่าสุดของผู้ส่ง
 * @param {string} liffUrlHistory - URL ไปยังหน้าประวัติการทำรายการใน LIFF
 * @returns {Promise<void>}
 */
declare function sendSenderFlex(senderLineId: string, sendingAmount: number, senderWalletUniqueId: string, receiverWalletUniqueId: string, updatedDate: Date, senderBalance: number, liffUrlHistory: string): Promise<void>;
/**
 * ส่ง Flex Message แจ้งเตือนการได้รับเงินให้ "ผู้รับ" ในการโอนเงินภายในระบบ
 * @async
 * @param {string} receiverLineId - Line User ID ของผู้รับ
 * @param {number} receivingAmount - จำนวนเงินที่ได้รับ
 * @param {string} senderWalletUniqueId - รหัส Wallet ของผู้ส่ง
 * @param {string} receiverWalletUniqueId - รหัส Wallet ของผู้รับ
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @param {number} receiverBalance - ยอดเงินคงเหลือล่าสุดของผู้รับ
 * @param {string} liffUrlHistory - URL ไปยังหน้าประวัติการทำรายการใน LIFF
 * @returns {Promise<void>}
 */
declare function sendReceiverFlex(receiverLineId: string, receivingAmount: number, senderWalletUniqueId: string, receiverWalletUniqueId: string, updatedDate: Date, receiverBalance: number, liffUrlHistory: string): Promise<void>;
//# sourceMappingURL=line.service.d.ts.map