import { Request, Response, NextFunction } from 'express';
import Joi, { ObjectSchema } from 'joi';
import { pick } from '../utils/pick.js';

const validate = (schema: ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
    // 1. Get the schema definition
    // We cast to 'any' because Joi's describe() return type is complex and varies by version
    const description = schema.describe() as any;

    // 2. Cast the keys to (keyof Request)[] to satisfy the 'pick' function types
    const validKeys = Object.keys(description.keys) as Array<keyof Request>;

    const objectToValidate = pick(req, validKeys);

    const { value, error } = schema.validate(objectToValidate, {
        abortEarly: false,
        allowUnknown: true,
    });

    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        return res.status(400).json({ message: errorMessage });
    }

    Object.assign(req, value);

    return next();
};

export default validate;