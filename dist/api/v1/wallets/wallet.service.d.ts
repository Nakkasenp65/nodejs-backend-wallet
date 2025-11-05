declare namespace _default {
    export { confirmWalletAmount };
    export { getUserWallet };
    export { getWallets };
    export { getWalletDetails };
    export { updateWallet };
}
export default _default;
/**
 * ยืนยันยอดเงินของธุรกรรม, อัปเดตสถานะ, และปรับปรุงยอดเงินในกระเป๋าเงินที่เกี่ยวข้อง
 * @description ฟังก์ชันนี้เป็นกระบวนการสำคัญในการยืนยันธุรกรรมที่รอดำเนินการ (PENDING)
 * โดยจะทำงานภายใน Database Transaction (Atomicity) เพื่อรับประกันว่าการอัปเดตสถานะธุรกรรม
 * และการเพิ่มยอดเงินใน Wallet จะต้องสำเร็จทั้งหมดหรือไม่ก็ล้มเหลวทั้งหมด
 * มีการป้องกันการยืนยันซ้ำซ้อนโดยตรวจสอบสถานะของธุรกรรมก่อนดำเนินการเสมอ
 * @async
 * @param {any} transactionVerification - (ยังไม่ได้ใช้งานในปัจจุบัน) พารามิเตอร์ที่อาจใช้สำหรับการตรวจสอบเพิ่มเติมในอนาคต
 * @param {string} transactionId - รหัสเฉพาะ (ID) ของ Transaction ที่ต้องการยืนยัน
 * @param {number|string} amount - ยอดเงินที่ได้รับการตรวจสอบและยืนยันแล้ว (ต้องเป็นค่าบวก)
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Transaction ที่อัปเดตแล้ว ซึ่งมีข้อมูล Wallet ล่าสุดแนบมาด้วย
 * @throws {ApiError} ในกรณีที่ข้อมูล `amount` ไม่ถูกต้อง, ไม่พบ Transaction, หรือ Transaction ไม่อยู่ในสถานะ 'PENDING' ที่สามารถดำเนินการต่อได้
 */
declare function confirmWalletAmount(transactionVerification: any, transactionId: string, amount: number | string): Promise<object>;
/**
 * ดึงข้อมูลกระเป๋าเงิน (Wallet) ของผู้ใช้ LINE ที่ระบุ
 * @description ฟังก์ชันนี้ทำหน้าที่ค้นหาและดึงข้อมูล Wallet ที่เชื่อมโยงกับ `line_user_id` ที่ได้รับ
 * โดยจะคืนค่า Wallet อ็อบเจกต์แรกที่พบ หากมีหลาย Wallet ที่เชื่อมโยงกับ ID นั้น
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE (Line User ID) ของผู้ใช้ที่ต้องการดึง Wallet
 * @returns {Promise<object|null>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Wallet หากพบ หรือ `null` หากไม่พบ Wallet ที่เชื่อมโยง
 * @throws {ApiError} ในกรณีที่ไม่ได้ระบุ `line_user_id`
 */
declare function getUserWallet(line_user_id: string): Promise<object | null>;
/**
 * ดึงรายการกระเป๋าเงิน (Wallets) ทั้งหมดพร้อมระบบแบ่งหน้า (Pagination) และการกรองข้อมูล
 * @description ฟังก์ชันนี้ทำหน้าที่ค้นหาและดึงรายการ Wallets จากฐานข้อมูลตามเงื่อนไขที่กำหนดใน `filters`
 * รองรับการค้นหาจาก ID ของ Wallet, ชื่อไลน์, หรือเบอร์โทรศัพท์ของผู้ใช้
 * และคืนค่าข้อมูลในรูปแบบที่มีการแบ่งหน้าเรียบร้อยแล้ว
 * @async
 * @param {object} [filters={}] - อ็อบเจกต์สำหรับกำหนดเงื่อนไขการค้นหาและการแบ่งหน้า
 * @param {string} [filters.search] - คำค้นหา (search term) สำหรับกรองข้อมูลจาก `walletUniqueId`, `line_display_name`, หรือ `phone`
 * @param {number|string} [filters.page=1] - เลขหน้าปัจจุบันที่ต้องการดึงข้อมูล
 * @param {number|string} [filters.pageSize=10] - จำนวนรายการสูงสุดต่อหนึ่งหน้า
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ซึ่งประกอบด้วย `data` (อาร์เรย์ของ Wallets) และ `paging` (ข้อมูลการแบ่งหน้า)
 */
declare function getWallets(filters?: {
    search?: string;
    page?: number | string;
    pageSize?: number | string;
}): Promise<object>;
/**
 * ดึงข้อมูลรายละเอียดของกระเป๋าเงิน (Wallet) พร้อมข้อมูลที่เกี่ยวข้อง
 * @description ฟังก์ชันนี้ทำหน้าที่ค้นหาและดึงข้อมูลของ Wallet จากรหัสเฉพาะ (ID) ที่ระบุ
 * โดยจะแนบข้อมูลที่เกี่ยวข้องมาด้วย ได้แก่ ข้อมูลผู้ใช้ที่เป็นเจ้าของ (user)
 * และประวัติธุรกรรมการส่ง (sentTransaction) และการรับ (receieveTransaction) 10 รายการล่าสุด
 * @async
 * @param {string} walletId - รหัสเฉพาะ (ID) ของ Wallet ที่ต้องการดึงข้อมูล
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Wallet พร้อมข้อมูลผู้ใช้และประวัติธุรกรรมล่าสุด
 * @throws {ApiError} ในกรณีที่ไม่พบ Wallet ตาม `walletId` ที่ระบุ
 */
declare function getWalletDetails(walletId: string): Promise<object>;
/**
 * อัปเดตข้อมูลยอดเงินในกระเป๋าเงิน (Wallet) ที่ระบุ
 * @description ฟังก์ชันนี้ทำหน้าที่อัปเดตเฉพาะฟิลด์ `balance` และ/หรือ `bonusBalance` ของ Wallet ที่มีอยู่แล้วในระบบ
 * โดยจะค้นหา Wallet จาก `walletId` ที่ได้รับ และจะอัปเดตเฉพาะฟิลด์ที่มีการส่งค่ามาใน `updateBody` เท่านั้น
 * @async
 * @param {string} walletId - รหัสเฉพาะ (ID) ของ Wallet ที่ต้องการอัปเดต
 * @param {object} updateBody - อ็อบเจกต์ที่บรรจุข้อมูลสำหรับอัปเดต
 * @param {number} [updateBody.balance] - ยอดเงินคงเหลือใหม่ (ถ้ามี)
 * @param {number} [updateBody.bonusBalance] - ยอดโบนัสคงเหลือใหม่ (ถ้ามี)
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Wallet ที่ได้รับการอัปเดตข้อมูลล่าสุดแล้ว
 * @throws {ApiError} ในกรณีที่ไม่พบ Wallet หรือข้อมูลที่ส่งมาไม่ถูกต้อง (เช่น balance ไม่ใช่ตัวเลข, หรือไม่ได้ส่งฟิลด์ใดๆ มาเลย)
 */
declare function updateWallet(walletId: string, updateBody: {
    balance?: number;
    bonusBalance?: number;
}): Promise<object>;
//# sourceMappingURL=wallet.service.d.ts.map