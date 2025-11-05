# 🏥 Health Check Routes Documentation

## Overview

Health check endpoints have been implemented in **TypeScript** to monitor the application's status, database connectivity, and system metrics. These endpoints are essential for:

- ✅ Production monitoring
- ✅ Kubernetes/Docker health probes
- ✅ Load balancer health checks
- ✅ Vercel deployment monitoring
- ✅ Debugging and troubleshooting

---

## 📍 Available Endpoints

### 1. **Basic Health Check**

```
GET /v1/health
```

**Purpose:** Quick check if the service is running

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2025-11-05T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

**Use Case:**

- Simple liveness check
- Load balancer monitoring
- Quick status verification

---

### 2. **Detailed Health Check**

```
GET /v1/health/detailed
```

**Purpose:** Comprehensive health check with database connectivity and system metrics

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-05T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "connected",
      "responseTime": "45ms"
    },
    "memory": {
      "usage": "128MB",
      "total": "256MB"
    },
    "process": {
      "pid": 12345,
      "platform": "darwin",
      "nodeVersion": "v20.0.0"
    }
  },
  "responseTime": "52ms"
}
```

**Use Case:**

- Monitoring dashboards
- Debugging performance issues
- Database connectivity verification
- System resource monitoring

---

### 3. **Readiness Probe**

```
GET /v1/health/readiness
```

**Purpose:** Kubernetes readiness probe - checks if service is ready to accept traffic

**Response when ready (200 OK):**

```json
{
  "status": "ready",
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

**Response when not ready (503 Service Unavailable):**

```json
{
  "status": "not ready",
  "timestamp": "2025-11-05T10:30:00.000Z",
  "error": "Database connection failed"
}
```

**Use Case:**

- Kubernetes readiness probe
- Load balancer health check
- Determines when to route traffic to this instance

---

### 4. **Liveness Probe**

```
GET /v1/health/liveness
```

**Purpose:** Kubernetes liveness probe - checks if service is alive

**Response (200 OK):**

```json
{
  "status": "alive",
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

**Use Case:**

- Kubernetes liveness probe
- Determines if container should be restarted
- Always returns OK if process is running

---

## 🔧 Technical Details

### File Structure

```
src/api/v1/health/
├── health.controller.ts  ← TypeScript controller
└── health.route.ts       ← TypeScript routes
```

### Database Check Method

For MongoDB (via Prisma), the health check uses:

```typescript
await prisma.user.findFirst({ take: 1 });
```

This is lightweight and compatible with MongoDB's query structure.

---

## 🚀 Integration Examples

### 1. **Vercel Health Check**

Add to `vercel.json`:

```json
{
  "healthCheckPath": "/v1/health"
}
```

### 2. **Kubernetes Probes**

Add to your deployment YAML:

```yaml
livenessProbe:
  httpGet:
    path: /v1/health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /v1/health/readiness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 3. **Docker Health Check**

Add to `Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:3000/v1/health || exit 1
```

### 4. **Load Balancer (e.g., Nginx)**

```nginx
upstream backend {
  server backend1:3000 max_fails=3 fail_timeout=30s;
  server backend2:3000 max_fails=3 fail_timeout=30s;
}

location /v1/health {
  proxy_pass http://backend;
  # Health check configuration
}
```

---

## 📊 Monitoring Integration

### Uptime Monitoring (e.g., UptimeRobot, Pingdom)

- **URL:** `https://your-domain.com/v1/health`
- **Method:** GET
- **Expected Status:** 200
- **Interval:** 1-5 minutes

### APM Tools (e.g., New Relic, Datadog)

Use `/v1/health/detailed` to collect:

- Response time metrics
- Database latency
- Memory usage
- Uptime statistics

### Custom Dashboards

Fetch `/v1/health/detailed` periodically and visualize:

```javascript
// Example: Fetch health data
const response = await fetch("/v1/health/detailed");
const health = await response.json();

console.log(`DB Response: ${health.checks.database.responseTime}`);
console.log(`Memory: ${health.checks.memory.usage}`);
```

---

## 🧪 Testing

### Using cURL

```bash
# Basic health check
curl http://localhost:3000/v1/health

# Detailed health check
curl http://localhost:3000/v1/health/detailed

# Readiness probe
curl http://localhost:3000/v1/health/readiness

# Liveness probe
curl http://localhost:3000/v1/health/liveness
```

### Using HTTPie

```bash
http GET http://localhost:3000/v1/health
http GET http://localhost:3000/v1/health/detailed
```

### Using JavaScript/Fetch

```javascript
// Check if API is healthy
async function checkHealth() {
  try {
    const response = await fetch("/v1/health");
    const data = await response.json();
    console.log("API Status:", data.status);
    return data.status === "ok";
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}
```

---

## 🔒 Security Considerations

### Public Endpoints

- `/v1/health` - ✅ Safe to expose publicly
- `/v1/health/liveness` - ✅ Safe to expose publicly
- `/v1/health/readiness` - ✅ Safe to expose publicly

### Sensitive Endpoint

- `/v1/health/detailed` - ⚠️ Consider adding authentication

The detailed endpoint exposes system information. In production, you may want to:

1. **Add Authentication:**

```typescript
// In health.route.ts
import authMiddleware from "../../../middlewares/auth.js";

healthRouter.get("/detailed", authMiddleware, healthController.getDetailedHealth);
```

2. **Restrict by IP:**

```typescript
// Example middleware
const restrictToInternalIPs = (req, res, next) => {
  const allowedIPs = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];
  // Check if req.ip is in allowed range
  if (isAllowed(req.ip)) {
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
};
```

---

## 📈 Response Time Guidelines

| Endpoint            | Expected Response Time             |
| ------------------- | ---------------------------------- |
| `/health`           | < 10ms                             |
| `/health/liveness`  | < 10ms                             |
| `/health/readiness` | < 100ms (includes DB check)        |
| `/health/detailed`  | < 200ms (includes multiple checks) |

If response times exceed these values, investigate:

- Database connection issues
- High server load
- Network latency

---

## 🐛 Troubleshooting

### Database Status Shows "error"

**Possible Causes:**

1. MongoDB connection string incorrect
2. Network issue to database
3. Database credentials expired
4. Database server down

**Debug Steps:**

```bash
# Check database connectivity
curl http://localhost:3000/v1/health/detailed

# Check logs
npm run dev
# Look for "Database health check failed" in logs
```

### Readiness Probe Failing

**Impact:** Load balancer won't route traffic to this instance

**Check:**

```bash
curl http://localhost:3000/v1/health/readiness
# Should return 200, not 503
```

**Fix:**

1. Ensure database is accessible
2. Check Prisma connection
3. Verify environment variables

---

## 🎯 Best Practices

1. **Monitor All Endpoints**
   - Use `/health` for basic checks
   - Use `/health/detailed` for debugging
   - Use Kubernetes probes for orchestration

2. **Set Appropriate Timeouts**
   - Health checks should respond quickly
   - Database queries should have timeouts
   - Don't perform heavy operations

3. **Log Health Check Failures**
   - Currently logs database errors
   - Consider adding alerting for repeated failures

4. **Version Your API**
   - Health checks are under `/v1/health`
   - Allows for future API changes

---

## 🔄 Comparison: Health vs. Root Endpoint

| Feature               | `/` (Root)         | `/v1/health`          |
| --------------------- | ------------------ | --------------------- |
| Purpose               | Basic API test     | Production monitoring |
| Database Check        | ❌ No              | ✅ Yes (in detailed)  |
| System Metrics        | ❌ No              | ✅ Yes (in detailed)  |
| Kubernetes Compatible | ❌ No              | ✅ Yes                |
| Response Time         | ~5ms               | ~10ms                 |
| Production Use        | ❌ Not recommended | ✅ Recommended        |

---

## ✅ Implementation Checklist

- [x] Health controller created in TypeScript
- [x] Health routes created in TypeScript
- [x] Routes registered in v1 router
- [x] Basic health endpoint (`/health`)
- [x] Detailed health endpoint (`/health/detailed`)
- [x] Readiness probe (`/health/readiness`)
- [x] Liveness probe (`/health/liveness`)
- [x] MongoDB-compatible database check
- [x] System metrics included
- [x] TypeScript compilation verified
- [ ] Add authentication to `/health/detailed` (optional)
- [ ] Configure Vercel health check path
- [ ] Set up monitoring alerts
- [ ] Add custom metrics (optional)

---

## 📚 Additional Resources

- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Express Health Check Best Practices](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html)
- [Prisma Health Checks](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management)

---

**🎉 Health check routes are now live! Test them at:**

- `http://localhost:3000/v1/health`
- `http://localhost:3000/v1/health/detailed`
- `http://localhost:3000/v1/health/readiness`
- `http://localhost:3000/v1/health/liveness`
