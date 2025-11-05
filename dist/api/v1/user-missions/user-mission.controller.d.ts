declare namespace _default {
    export { enrollInMission };
    export { claimMissionReward };
    export { getMyMissions };
    export { getMyMissionDetails };
}
export default _default;
/**
 * คอนโทรลเลอร์สำหรับสมัครเข้าร่วมภารกิจ
 * @description รับ `missionId` และ `userId` จาก Request Body, เรียกใช้ Service เพื่อดำเนินการสมัคร,
 * และส่งข้อมูล UserMission ที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมี `req.body.missionId` และ `req.body.userId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const enrollInMission: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับกดรับรางวัลภารกิจ
 * @description รับ `userId` และ `userMissionId` จาก Request Body, เรียกใช้ Service เพื่อดำเนินการรับรางวัล,
 * และส่งข้อมูล UserMission ที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมี `req.body.userId` และ `req.body.userMissionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const claimMissionReward: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจของผู้ใช้
 * @description รับ `userId` จาก URL parameters และ `filter` จาก Query String,
 * เรียกใช้ Service เพื่อดึงข้อมูล, และส่งรายการภารกิจกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และอาจมี `req.query.filter`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
declare const getMyMissions: (req: any, res: any, next: any) => void;
/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลรายละเอียดภารกิจรายชิ้น
 * @description รับ `userMissionId` จาก URL parameters, เรียกใช้ Service, และส่งข้อมูลรายละเอียดกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userMissionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 * @throws {ApiError} หากไม่พบข้อมูล UserMission ตาม ID ที่ระบุ
 */
declare const getMyMissionDetails: (req: any, res: any, next: any) => void;
//# sourceMappingURL=user-mission.controller.d.ts.map