import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
// Assuming Role is available in @prisma/client, if not we might need to adjust
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
    user?: {
        role: Role;
        [key: string]: any;
    };
}

const adminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Middleware นี้คาดหวังว่า `auth` middleware ได้ทำงานไปก่อนแล้ว
    // และได้แนบข้อมูลผู้ใช้ (จาก DB) มาใน `req.user`
    console.log('ADMIN AUTHORIZED');
    if (req.user && req.user.role === Role.ADMIN) {
        // ถ้ามีข้อมูลผู้ใช้ และ role คือ ADMIN ให้ผ่านไปได้
        return next();
    }

    // ถ้าไม่ใช่ ให้ปฏิเสธการเข้าถึง
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Admins only');
};

export default adminAuth;
