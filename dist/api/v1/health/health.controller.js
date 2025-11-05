/**
 * @file Health check controller
 * @description Provides endpoints for monitoring system health, database connectivity, and service status
 */
import catchAsync from '../../../utils/catchAsync.js';
import httpStatus from 'http-status';
import prisma from '../../../libs/prisma.js';
/**
 * Basic health check endpoint
 * @description Returns 200 OK if the service is running
 */
const getHealth = catchAsync(async (req, res) => {
    res.status(httpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});
/**
 * Detailed health check with database connectivity
 * @description Checks database connection and returns detailed system info
 */
const getDetailedHealth = catchAsync(async (req, res) => {
    const startTime = Date.now();
    // Check database connectivity
    let dbStatus = 'disconnected';
    let dbResponseTime = 0;
    try {
        const dbStart = Date.now();
        // MongoDB-compatible health check - simple findFirst query
        await prisma.user.findFirst({ take: 1 });
        dbResponseTime = Date.now() - dbStart;
        dbStatus = 'connected';
    }
    catch (error) {
        dbStatus = 'error';
        console.error('Database health check failed:', error);
    }
    const responseTime = Date.now() - startTime;
    res.status(httpStatus.OK).json({
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        checks: {
            database: {
                status: dbStatus,
                responseTime: `${dbResponseTime}ms`,
            },
            memory: {
                usage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            },
            process: {
                pid: process.pid,
                platform: process.platform,
                nodeVersion: process.version,
            },
        },
        responseTime: `${responseTime}ms`,
    });
});
/**
 * Readiness check for Kubernetes/container orchestration
 * @description Returns 200 if service is ready to accept traffic
 */
const getReadiness = catchAsync(async (req, res) => {
    try {
        // Check if database is accessible
        await prisma.user.findFirst({ take: 1 });
        res.status(httpStatus.OK).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
        });
    }
});
/**
 * Liveness check for Kubernetes/container orchestration
 * @description Returns 200 if service is alive (even if not fully operational)
 */
const getLiveness = catchAsync(async (req, res) => {
    res.status(httpStatus.OK).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
});
export default {
    getHealth,
    getDetailedHealth,
    getReadiness,
    getLiveness,
};
//# sourceMappingURL=health.controller.js.map