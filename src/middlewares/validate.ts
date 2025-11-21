import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { pick } from '../utils/pick.js';

const validate = (schema: Schema) => (req: Request, res: Response, next: NextFunction) => {
    const objectToValidate = pick(req, Object.keys(schema.describe().keys));

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
