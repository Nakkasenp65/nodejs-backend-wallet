import Joi from 'joi';

// แก้ไขโดยการครอบด้วย Joi.object()
const enrollInMission = Joi.object({
  body: Joi.object().keys({
    missionId: Joi.string().hex().length(24).required().messages({
      'any.required': 'กรุณาระบุ missionId',
      'string.empty': 'missionId ห้ามเป็นค่าว่าง',
      'string.hex': 'missionId ต้องเป็น ObjectId ที่ถูกต้อง',
      'string.length': 'missionId ต้องมี 24 ตัวอักษร',
    }),
  }),
});

// แก้ไขโดยการครอบด้วย Joi.object()
const getUserMissionDetails = Joi.object({
  params: Joi.object().keys({
    userMissionId: Joi.string().hex().length(24).required().messages({
      'any.required': 'กรุณาระบุ userMissionId',
      'string.empty': 'userMissionId ห้ามเป็นค่าว่าง',
      'string.hex': 'userMissionId ต้องเป็น ObjectId ที่ถูกต้อง',
      'string.length': 'userMissionId ต้องมี 24 ตัวอักษร',
    }),
  }),
});

export default {
  enrollInMission,
  getUserMissionDetails,
};
