import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
// Assuming Role is available in @prisma/client, if not we might need to adjust
import { Role } from '@prisma/client';
import prisma from '../libs/prisma.js';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string; // Ensure id is available
        role: Role;
        [key: string]: any;
    };
}

const adminAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Middleware นี้คาดหวังว่า `auth` middleware ได้ทำงานไปก่อนแล้ว
    // และได้แนบข้อมูลผู้ใช้ (จาก DB) มาใน `req.user`
    console.log('ADMIN AUTHORIZED');
    if (req.user && req.user.role === Role.ADMIN) {
        // ถ้ามีข้อมูลผู้ใช้ และ role คือ ADMIN ให้ผ่านไปได้

        // --- LOGGING ---
        try {
            // Serverless environment: Must await to ensure execution
            await prisma.log.create({
                data: {
                    adminId: req.user.id,
                    lineUserId: req.user.line_user_id,
                    lineDisplayName: req.user.line_display_name,
                    method: req.method,
                    path: req.originalUrl || req.path,
                    params: JSON.stringify(req.params),
                    query: JSON.stringify(req.query),
                    body: JSON.stringify(req.body), // Be careful with sensitive data
                    ip: req.ip || req.socket.remoteAddress,
                    userAgent: req.get('User-Agent'),
                }
            });
        } catch (error) {
            console.error("Failed to create admin log:", error);
        }
        // ---------------

        return next();
    }

    // ถ้าไม่ใช่ ให้ปฏิเสธการเข้าถึง
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Admins only');
};

export default adminAuth;
