import Joi from 'joi';

const createUser = Joi.object().keys({
  body: Joi.object().keys({
    liffId: Joi.string().required().messages({
      'any.required': 'กรุณาระบุ liffId',
      'string.empty': 'liffId ห้ามเป็นค่าว่าง',
    }),
    displayName: Joi.string().required().min(2).messages({
      'any.required': 'กรุณาระบุ username',
      'string.empty': 'username ห้ามเป็นค่าว่าง',
      'string.min': 'username ต้องมีอย่างน้อย 2 ตัวอักษร',
    }),
    pictureUrl: Joi.string().uri().allow('').optional().messages({
      'string.uri': 'userProfilePicUrl ต้องเป็น URL ที่ถูกต้อง',
    }),
    occupation: Joi.string().required(),
    ageRange: Joi.string().required(),
    mobileId: Joi.string().required(),
    planId: Joi.string().required(),
    monthlyPayment: Joi.number().required(),
  }),
});

const getCurrentUser = Joi.object().keys({
  body: Joi.object().keys({
    liffId: Joi.string().required().messages({
      'any.required': 'กรุณาระบุ liffId',
      'string.empty': 'liffId ห้ามเป็นค่าว่าง',
    }),
  }),
});

export default { createUser, getCurrentUser };
