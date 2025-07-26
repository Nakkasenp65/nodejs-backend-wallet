import Joi from 'joi';

const validPlanNames = ['DAILY', 'WEEKLY', 'HALF_MONTH', 'MONTHLY'];

const createGoal = Joi.object({
  body: Joi.object({
    mobileId: Joi.string().required().messages({
      'any.required': 'กรุณาระบุ modelId',
      'string.empty': 'modelId ห้ามเป็นค่าว่าง',
    }),
    planId: Joi.string().required().messages({
      'any.required': 'กรุณาระบุ planId',
      'string.empty': 'planId ห้ามเป็นค่าว่าง',
    }),
  }),
  params: Joi.object({
    userId: Joi.string().required().messages({
      'any.required': 'กรุณาระบุ userId ใน URL',
      'string.empty': 'userId ห้ามเป็นค่าว่าง',
    }),
  }),
});

const updateGoal = Joi.object({
  body: Joi.object({
    targetModelId: Joi.string().optional().messages({
      'string.empty': 'targetModelId ห้ามเป็นค่าว่าง (ถ้ามี)',
    }),
    planName: Joi.string()
      .valid(...validPlanNames)
      .optional()
      .messages({
        'string.empty': 'planName ห้ามเป็นค่าว่าง (ถ้ามี)',
        'any.only': `planName ต้องเป็นหนึ่งในค่าต่อไปนี้: ${validPlanNames.join(', ')}`,
      }),
  })
    .min(1)
    .messages({
      'object.min': 'กรุณาส่งข้อมูลที่ต้องการอัปเดตอย่างน้อย 1 รายการ',
    }),
  params: Joi.object({
    userId: Joi.string().required().messages({
      'any.required': 'กรุณาระบุ userId ใน URL',
      'string.empty': 'userId ห้ามเป็นค่าว่าง',
    }),
  }),
});

export default { createGoal, updateGoal };
