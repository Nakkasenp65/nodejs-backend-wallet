declare namespace _default {
    export { getDashboardData };
    export { getTransactions };
    export { editTransaction };
    export { deleteTransaction };
    export { editUser };
    export { getMissions };
    export { getWallets };
    export { getWalletDetails };
    export { updateWallet };
    export { getUserMissionDetails };
    export { getUserMisisonsByUserLineId };
    export { editUserMission };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลสรุปสำหรับ Admin Dashboard
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getDashboardData: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการธุรกรรมทั้งหมดในระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้า, การจัดเรียง, และการกรองจาก Query String
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getTransactions: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขธุรกรรม (สำหรับ Admin)
 * @description รับ `transactionId` จาก URL, ข้อมูลอัปเดตจาก Body, และไฟล์ (ถ้ามี)
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const editTransaction: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับลบธุรกรรม (สำหรับ Admin)
 * @description รับ `transactionId` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const deleteTransaction: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อมูลผู้ใช้ (สำหรับ Admin)
 * @description รับ `userId` จาก URL และข้อมูลอัปเดตจาก Body
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const editUser: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจหลักทั้งหมด (สำหรับ Admin)
 * @description รับเงื่อนไขการกรองและการแบ่งหน้าจาก Query String
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getMissions: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการ Wallet ทั้งหมดในระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการค้นหาและการแบ่งหน้าจาก Query String
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getWallets: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูล Wallet โดยละเอียด (สำหรับ Admin)
 * @description รับ `walletId` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getWalletDetails: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับอัปเดตข้อมูล Wallet (สำหรับ Admin)
 * @description รับ `walletId` จาก URL และข้อมูลอัปเดตจาก Body (เช่น balance)
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const updateWallet: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลภารกิจของผู้ใช้โดยละเอียด (สำหรับ Admin)
 * @description รับ `userMissionId` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getUserMissionDetails: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจทั้งหมดของผู้ใช้โดยใช้ LINE ID (สำหรับ Admin)
 * @description รับ `line_user_id` จาก URL parameters
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getUserMisisonsByUserLineId: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อมูลภารกิจของผู้ใช้ (สำหรับ Admin)
 * @description รับ `userMissionId` จาก URL และข้อมูลอัปเดตจาก Body
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const editUserMission: (req: any, res: any, next: any) => void;
//# sourceMappingURL=admin.controller.d.ts.map