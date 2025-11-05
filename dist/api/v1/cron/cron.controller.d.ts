declare namespace _default {
    export { handleExpireMissions };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับจัดการกระบวนการอัปเดตสถานะภารกิจที่หมดอายุ
 * @description ทำหน้าที่เป็น Endpoint ที่ถูกเรียกโดย Scheduler ภายนอก (เช่น QStash)
 * โดยจะเรียกใช้ `userMissionService.expireOverdueMissions` เพื่อดำเนินการค้นหาและอัปเดตภารกิจ
 * ที่หมดอายุทั้งหมดในระบบ จากนั้นส่งผลสรุปการดำเนินการกลับไปเป็น JSON Response
 * @param {object} req - อ็อบเจกต์ Express Request (ควรมีการตรวจสอบ Header เพื่อยืนยันว่าเป็นคำขอจาก Scheduler ที่เชื่อถือได้)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const handleExpireMissions: (req: any, res: any, next: any) => void;
//# sourceMappingURL=cron.controller.d.ts.map