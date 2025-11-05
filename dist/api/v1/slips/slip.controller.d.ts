declare namespace _default {
    export { slipVerify };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับจัดการกระบวนการตรวจสอบสลิปและอัปเดตสถานะธุรกรรม
 * @description ทำหน้าที่เป็นตัวกลางในการรับคำขอตรวจสอบสลิป โดยจะส่ง `slipImageUrl`
 * ไปยัง `slipService` เพื่อตรวจสอบความถูกต้อง จากนั้นจะแปลผลลัพธ์ที่ได้ (success/fail)
 * และเรียกใช้ `transactionService` ที่เหมาะสม (`approveDeposit` หรือ `rejectDeposit`)
 * เพื่อปิดกระบวนการธุรกรรมอย่างสมบูรณ์
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลใน `req.body`
 * @param {string} req.body.userId - ID ของผู้ใช้เจ้าของธุรกรรม
 * @param {string} req.body.slipImageUrl - URL ของรูปภาพสลิปที่ต้องการตรวจสอบ
 * @param {string} req.body.transactionId - ID ของธุรกรรมที่ต้องการอัปเดตสถานะ
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const slipVerify: (req: any, res: any, next: any) => void;
//# sourceMappingURL=slip.controller.d.ts.map