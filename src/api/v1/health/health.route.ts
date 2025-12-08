/**
 * @file Health check routes
 * @description Routes for monitoring system health and readiness
 */

import { Router } from "express";
import healthController from "./health.controller.js";

const healthRouter = Router();

/**
 * @route GET /health
 * @description Basic health check - returns OK if service is running
 * @access Public
 */
healthRouter.get("/", healthController.getHealth);

/**
 * @route GET /health/detailed
 * @description Detailed health check with database status and system metrics
 * @access Public (consider adding authentication in production)
 */
healthRouter.get("/detailed", healthController.getDetailedHealth);

/**
 * @route GET /health/readiness
 * @description Kubernetes readiness probe - checks if service is ready to accept traffic
 * @access Public
 */
healthRouter.get("/readiness", healthController.getReadiness);

/**
 * @route GET /health/liveness
 * @description Kubernetes liveness probe - checks if service is alive
 * @access Public
 */
healthRouter.get("/liveness", healthController.getLiveness);

export default healthRouter;
