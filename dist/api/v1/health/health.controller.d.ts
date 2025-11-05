/**
 * @file Health check controller
 * @description Provides endpoints for monitoring system health, database connectivity, and service status
 */
declare const _default: {
    getHealth: (req: any, res: any, next: any) => void;
    getDetailedHealth: (req: any, res: any, next: any) => void;
    getReadiness: (req: any, res: any, next: any) => void;
    getLiveness: (req: any, res: any, next: any) => void;
};
export default _default;
//# sourceMappingURL=health.controller.d.ts.map