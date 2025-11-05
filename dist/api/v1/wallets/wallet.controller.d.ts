declare namespace _default {
    export { getUserWallet };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับยืนยันยอดเงินของธุรกรรม
 * @description รับ HTTP request เพื่อยืนยันยอดเงินของธุรกรรม โดยดึง `transactionId` จากพารามิเตอร์ URL
 * และข้อมูล `amount` จาก Request Body จากนั้นเรียกใช้ `walletService.confirmWalletAmount`
 * และส่งข้อมูลธุรกรรมที่อัปเดตแล้วกลับไปพร้อมสถานะ 200 (OK)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมี `req.params.transactionId` และ `req.body.amount`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getUserWallet: (req: any, res: any, next: any) => void;
//# sourceMappingURL=wallet.controller.d.ts.map