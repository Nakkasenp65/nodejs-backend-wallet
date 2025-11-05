declare namespace _default {
    export { createMission };
    export { updateMission };
    export { getAllMissionsForAdmin };
    export { getMissionDetails };
    export { getAvailableMissions };
    export { deleteMission };
    export { editMission };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับสร้างภารกิจใหม่ (สำหรับ Admin)
 * @description รับข้อมูลภารกิจจาก Request Body, เรียกใช้ Service เพื่อสร้างภารกิจ,
 * และส่งข้อมูลภารกิจที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลภารกิจใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const createMission: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขภารกิจ (สำหรับ Admin)
 * @description รับ `missionId` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service เพื่ออัปเดตข้อมูล, และส่งข้อมูลภารกิจที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.missionId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const updateMission: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจทั้งหมด (สำหรับ Admin)
 * @description รับเงื่อนไขการกรอง, การจัดเรียง, และการแบ่งหน้าจาก Query String, เรียกใช้ Service,
 * และส่งรายการภารกิจพร้อมข้อมูลการแบ่งหน้าและสถิติกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getAllMissionsForAdmin: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลภารกิจเชิงลึก (สำหรับ Admin)
 * @description รับ `missionId` จาก URL parameters และตัวเลือกการแบ่งหน้าสำหรับรายชื่อผู้เข้าร่วมจาก Query String,
 * เรียกใช้ Service, และส่งข้อมูลเชิงลึกทั้งหมดกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.missionId` และ `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getMissionDetails: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลλεอร์สำหรับดึงรายการภารกิจที่ผู้ใช้สามารถเข้าร่วมได้
 * @description รับ `userId` จาก URL parameters, เรียกใช้ Service เพื่อค้นหาภารกิจที่เข้าเงื่อนไข,
 * และส่งรายการภารกิจกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getAvailableMissions: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับลบภารกิจ (สำหรับ Admin)
 * @description รับ `missionId` จาก URL parameters, เรียกใช้ Service เพื่อลบภารกิจ,
 * และส่งข้อมูลภารกิจที่ถูกลบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.missionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const deleteMission: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับแก้ไขภารกิจ (สำหรับ Admin - รับ Payload เต็ม)
 * @description รับข้อมูลภารกิจทั้งหมดรวมถึง ID จาก Request Body, เรียกใช้ Service,
 * และส่งข้อมูลภารกิจที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลภารกิจทั้งหมดใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const editMission: (req: any, res: any, next: any) => void;
//# sourceMappingURL=mission.controller.d.ts.map