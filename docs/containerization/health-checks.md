# Health Checks for All Services

This document describes the health check implementations for all services in the QuantFlow platform to ensure reliability and uptime.

## Overview

Health checks are essential for monitoring service status, enabling automatic recovery, and providing insights into system performance. QuantFlow implements comprehensive health checks for all services.

## Application Health Checks

### Main Application Health Endpoint

The main QuantFlow application provides a dedicated health check endpoint:

```javascript
// GET /health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'quantflow-app',
    version: process.env.APP_VERSION || '1.0.0'
  });
});
```

### Detailed Health Check

For more comprehensive health information:

```javascript
// GET /health/detailed
app.get('/health/detailed', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'quantflow-app',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external
      },
      dependencies: {}
    };

    // Check database connection
    try {
      await priceTracker.storage.pool.query('SELECT 1');
      healthStatus.dependencies.database = 'OK';
    } catch (error) {
      healthStatus.dependencies.database = 'ERROR';
      healthStatus.status = 'DEGRADED';
    }

    // Check Redis connection
    try {
      await priceTracker.storage.cache.client.ping();
      healthStatus.dependencies.redis = 'OK';
    } catch (error) {
      healthStatus.dependencies.redis = 'ERROR';
      healthStatus.status = 'DEGRADED';
    }

    // Check Binance WebSocket connection
    healthStatus.dependencies.binance = priceTracker.wsClient.isConnected() ? 'OK' : 'DISCONNECTED';

    res.status(healthStatus.status === 'OK' ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'quantflow-app',
      error: error.message
    });
  }
});
```

## Database Health Checks

### TimescaleDB Health Check

```javascript
class TimescaleDBHealthCheck {
  constructor(pool) {
    this.pool = pool;
  }

  async checkConnection() {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return { status: 'OK', message: 'Connected to TimescaleDB' };
      } finally {
        client.release();
      }
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async checkTableIntegrity() {
    try {
      const client = await this.pool.connect();
      try {
        // Check if required tables exist
        const result = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('prices')
        `);
        
        const tables = result.rows.map(row => row.table_name);
        const requiredTables = ['prices'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        
        if (missingTables.length > 0) {
          return { 
            status: 'ERROR', 
            message: `Missing tables: ${missingTables.join(', ')}` 
          };
        }
        
        return { status: 'OK', message: 'All required tables exist' };
      } finally {
        client.release();
      }
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async checkPerformance() {
    try {
      const client = await this.pool.connect();
      try {
        const start = Date.now();
        await client.query('SELECT COUNT(*) FROM prices');
        const duration = Date.now() - start;
        
        return { 
          status: 'OK', 
          message: 'Query performance test passed',
          duration: duration
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }
}
```

## Redis Health Checks

### Redis Cache Health Check

```javascript
class RedisHealthCheck {
  constructor(client) {
    this.client = client;
  }

  async checkConnection() {
    try {
      await this.client.ping();
      return { status: 'OK', message: 'Connected to Redis' };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async checkPerformance() {
    try {
      const testKey = `health-check-${Date.now()}`;
      const testValue = 'test';
      
      const start = Date.now();
      await this.client.set(testKey, testValue);
      await this.client.get(testKey);
      await this.client.del(testKey);
      const duration = Date.now() - start;
      
      return { 
        status: 'OK', 
        message: 'Redis performance test passed',
        duration: duration
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async checkMemoryUsage() {
    try {
      const info = await this.client.info('memory');
      const lines = info.split('\n');
      const usedMemoryLine = lines.find(line => line.startsWith('used_memory:'));
      const usedMemoryHumanLine = lines.find(line => line.startsWith('used_memory_human:'));
      
      if (usedMemoryLine && usedMemoryHumanLine) {
        const usedMemory = parseInt(usedMemoryLine.split(':')[1]);
        const usedMemoryHuman = usedMemoryHumanLine.split(':')[1];
        
        return { 
          status: 'OK', 
          message: 'Memory usage retrieved',
          usedMemory: usedMemory,
          usedMemoryHuman: usedMemoryHuman.trim()
        };
      }
      
      return { status: 'WARNING', message: 'Could not parse memory info' };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }
}
```

## WebSocket Client Health Checks

### Binance WebSocket Health Check

```javascript
class WebSocketHealthCheck {
  constructor(wsClient) {
    this.wsClient = wsClient;
  }

  checkConnection() {
    return {
      status: this.wsClient.isConnected() ? 'OK' : 'DISCONNECTED',
      message: this.wsClient.isConnected() ? 
        'Connected to Binance WebSocket' : 
        'Disconnected from Binance WebSocket',
      connectedSymbols: this.wsClient.getSubscribedSymbols().length
    };
  }

  checkMessageRate() {
    const messageCount = this.wsClient.getMessageCount();
    const messageRate = this.wsClient.getMessageRate();
    
    return {
      status: 'OK',
      messageCount: messageCount,
      messageRate: messageRate,
      message: `Processing ${messageRate.toFixed(2)} messages per second`
    };
  }

  checkLatency() {
    const latency = this.wsClient.getAverageLatency();
    
    let status = 'OK';
    if (latency > 500) {
      status = 'WARNING';
    } else if (latency > 1000) {
      status = 'ERROR';
    }
    
    return {
      status: status,
      latency: latency,
      message: `Average latency: ${latency.toFixed(2)}ms`
    };
  }
}
```

## Backtesting Engine Health Checks

### Backtesting Service Health Check

```javascript
class BacktestingHealthCheck {
  constructor(backtestingEngine) {
    this.engine = backtestingEngine;
  }

  checkStrategies() {
    try {
      const strategies = this.engine.getStrategies();
      return {
        status: 'OK',
        message: `Loaded ${strategies.length} strategies`,
        strategies: strategies
      };
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message
      };
    }
  }

  async checkPerformance() {
    try {
      // Run a simple test backtest
      const testData = [100, 101, 102, 101, 100, 99, 100];
      const start = Date.now();
      
      const result = this.engine.backtest('smaCrossover', testData, {
        shortPeriod: 2,
        longPeriod: 3
      });
      
      const duration = Date.now() - start;
      
      return {
        status: 'OK',
        message: 'Backtesting performance test passed',
        duration: duration,
        signalsGenerated: result.signals.length
      };
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message
      };
    }
  }
}
```

## Alerting System Health Checks

### Alerting Service Health Check

```javascript
class AlertingHealthCheck {
  constructor(alertSystem) {
    this.alertSystem = alertSystem;
  }

  checkNotificationChannels() {
    const channels = this.alertSystem.getNotificationChannels();
    const channelStatus = {};
    
    for (const [name, channel] of Object.entries(channels)) {
      try {
        // Test channel connectivity (without sending actual notifications)
        channelStatus[name] = {
          status: channel.isConnected() ? 'OK' : 'DISCONNECTED',
          message: channel.isConnected() ? 
            'Channel connected' : 
            'Channel disconnected'
        };
      } catch (error) {
        channelStatus[name] = {
          status: 'ERROR',
          message: error.message
        };
      }
    }
    
    return {
      status: Object.values(channelStatus).every(c => c.status === 'OK') ? 'OK' : 'DEGRADED',
      message: 'Notification channels status checked',
      channels: channelStatus
    };
  }

  checkAlertProcessing() {
    const queueSize = this.alertSystem.getAlertQueueSize();
    const processedAlerts = this.alertSystem.getProcessedAlertCount();
    
    return {
      status: queueSize > 1000 ? 'WARNING' : 'OK',
      message: 'Alert processing status',
      queueSize: queueSize,
      processedAlerts: processedAlerts
    };
  }
}
```

## Node-RED Integration Health Checks

### Node-RED Service Health Check

```javascript
class NodeREDHealthCheck {
  constructor(noderedUrl) {
    this.noderedUrl = noderedUrl;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.noderedUrl}/health`, {
        timeout: 5000
      });
      
      if (response.ok) {
        return {
          status: 'OK',
          message: 'Connected to Node-RED service'
        };
      } else {
        return {
          status: 'ERROR',
          message: `Node-RED returned status ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message
      };
    }
  }

  async checkFlows() {
    try {
      const response = await fetch(`${this.noderedUrl}/flows`, {
        headers: {
          'Authorization': `Bearer ${process.env.NODE_RED_TOKEN}`
        },
        timeout: 5000
      });
      
      if (response.ok) {
        const flows = await response.json();
        return {
          status: 'OK',
          message: 'Node-RED flows retrieved successfully',
          flowCount: flows.length
        };
      } else {
        return {
          status: 'ERROR',
          message: `Failed to retrieve flows: ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message
      };
    }
  }
}
```

## Centralized Health Check Service

### Health Check Aggregator

```javascript
class HealthCheckAggregator {
  constructor() {
    this.checks = new Map();
  }

  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  async runAllChecks() {
    const results = {};
    let overallStatus = 'OK';
    
    for (const [name, checkFunction] of this.checks) {
      try {
        const result = await checkFunction();
        results[name] = result;
        
        // Update overall status if any check fails
        if (result.status === 'ERROR' && overallStatus !== 'ERROR') {
          overallStatus = 'ERROR';
        } else if (result.status === 'WARNING' && overallStatus === 'OK') {
          overallStatus = 'WARNING';
        }
      } catch (error) {
        results[name] = {
          status: 'ERROR',
          message: error.message
        };
        overallStatus = 'ERROR';
      }
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}

// Initialize health check aggregator
const healthAggregator = new HealthCheckAggregator();

// Register all health checks
healthAggregator.registerCheck('application', () => {
  return Promise.resolve({
    status: 'OK',
    message: 'Application is running'
  });
});

healthAggregator.registerCheck('database', async () => {
  const dbHealth = new TimescaleDBHealthCheck(priceTracker.storage.pool);
  return await dbHealth.checkConnection();
});

healthAggregator.registerCheck('redis', async () => {
  const redisHealth = new RedisHealthCheck(priceTracker.storage.cache.client);
  return await redisHealth.checkConnection();
});

// GET /health/aggregate
app.get('/health/aggregate', async (req, res) => {
  try {
    const result = await healthAggregator.runAllChecks();
    res.status(result.status === 'OK' ? 200 : 503).json(result);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});
```

## Docker Health Checks

### Dockerfile Health Check Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

## Docker Compose Health Checks

### Enhanced docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    container_name: quantflow-timescaledb
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: quantflow
    ports:
      - "5432:5432"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  redis:
    image: redis:latest
    container_name: quantflow-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  quantflow-app:
    build: .
    container_name: quantflow-app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@timescaledb:5432/quantflow
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      timescaledb:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  node-red:
    image: nodered/node-red:latest
    container_name: quantflow-nodered
    ports:
      - "1880:1880"
    volumes:
      - node_red_data:/data
    depends_on:
      quantflow-app:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:1880"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  timescaledb_data:
  redis_data:
  node_red_data:
```

## Kubernetes Health Checks

### Kubernetes Probes Configuration

```yaml
# In Kubernetes deployment files
spec:
  template:
    spec:
      containers:
      - name: quantflow-app
        image: your-registry/quantflow:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
```

## Monitoring and Alerting

### Health Check Monitoring

```javascript
class HealthMonitor {
  constructor() {
    this.healthHistory = [];
    this.alertThresholds = {
      consecutiveFailures: 3,
      responseTime: 5000, // 5 seconds
      downtime: 300 // 5 minutes
    };
  }

  async monitorHealth() {
    try {
      const healthResult = await healthAggregator.runAllChecks();
      
      // Store health result
      this.healthHistory.push({
        timestamp: new Date(),
        status: healthResult.status,
        details: healthResult
      });
      
      // Keep only last 100 health checks
      if (this.healthHistory.length > 100) {
        this.healthHistory.shift();
      }
      
      // Check for alerts
      this.checkForAlerts(healthResult);
      
      return healthResult;
    } catch (error) {
      console.error('Health monitoring error:', error);
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  checkForAlerts(healthResult) {
    // Check for service failures
    for (const [serviceName, serviceCheck] of Object.entries(healthResult.checks)) {
      if (serviceCheck.status === 'ERROR') {
        this.sendAlert(`Service ${serviceName} is failing: ${serviceCheck.message}`);
      }
    }
    
    // Check for degraded status
    if (healthResult.status === 'WARNING') {
      this.sendAlert(`System is degraded: ${JSON.stringify(healthResult.checks)}`);
    }
  }

  sendAlert(message) {
    // Send alert through configured channels
    console.error('HEALTH ALERT:', message);
    // Implementation would integrate with alerting system
  }

  getHealthTrends(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.healthHistory.filter(check => 
      check.timestamp >= cutoffTime
    );
  }
}

// Initialize health monitor
const healthMonitor = new HealthMonitor();

// Schedule periodic health checks
setInterval(() => {
  healthMonitor.monitorHealth();
}, 60000); // Check every minute
```

## Testing Health Checks

### Health Check Tests

```javascript
describe('Health Checks', () => {
  describe('Application Health', () => {
    it('should return OK status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
    });
  });

  describe('Detailed Health Check', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/health/detailed');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('database');
      expect(response.body.dependencies).toHaveProperty('redis');
    });
  });

  describe('Aggregate Health Check', () => {
    it('should aggregate all health checks', async () => {
      const response = await request(app).get('/health/aggregate');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });
  });
});
```

## Best Practices

### Health Check Design Principles

1. **Keep health checks lightweight**: Avoid heavy operations that could impact performance
2. **Use appropriate timeouts**: Set reasonable timeouts to prevent hanging checks
3. **Provide meaningful status codes**: Use HTTP status codes that reflect the actual health state
4. **Include relevant metadata**: Add timestamps, service names, and version information
5. **Implement circuit breakers**: Prevent cascading failures when dependencies are unhealthy
6. **Log health check results**: Track health status changes for debugging and monitoring
7. **Test health checks**: Ensure health checks themselves are reliable and accurate
8. **Document health endpoints**: Clearly document what each health endpoint checks and returns

### Health Check Response Format

```javascript
{
  "status": "OK|WARNING|ERROR|DEGRADED",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "service": "service-name",
  "version": "1.0.0",
  "checks": {
    "check-name": {
      "status": "OK|WARNING|ERROR",
      "message": "Descriptive message",
      "details": {
        // Additional check-specific details
      }
    }
  }
}
```