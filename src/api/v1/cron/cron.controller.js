import httpStatus from 'http-status';
import catchAsync from '../../../utils/catchAsync.js';
import userMissionService from '../user-missions/user-mission.service.js';

/**
 * @description Endpoint ที่ถูกเรียกโดย Scheduler เพื่อจัดการภารกิจที่หมดอายุ
 * @route POST /v1/cron/expire-missions
 */
const handleExpireMissions = catchAsync(async (req, res) => {
  // (สำคัญ) เพิ่มการตรวจสอบความปลอดภัย
  // ตรวจสอบว่า request มาจาก QStash จริงๆ ไม่ใช่จากผู้ใช้ทั่วไป
  const bearerToken = req.headers.authorization?.split(' ')[1];
  if (bearerToken !== process.env.QSTASH_CRON_TOKEN) {
    return res.status(httpStatus.UNAUTHORIZED).send('Unauthorized');
  }

  const result = await userMissionService.expireOverdueMissions();

  res.status(httpStatus.OK).json({
    message: 'Successfully processed overdue missions.',
    ...result,
  });
});

export default {
  handleExpireMissions,
};
