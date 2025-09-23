# Monitoring with Prometheus and Grafana

This document describes how to set up monitoring for QuantFlow using Prometheus and Grafana for metrics collection, visualization, and alerting.

## Overview

Monitoring is crucial for maintaining the health and performance of the QuantFlow platform. This setup includes:
- Prometheus for metrics collection
- Grafana for visualization and dashboarding
- Alerting for proactive issue detection
- Custom metrics for trading-specific insights

## Prometheus Integration

### Application Metrics Endpoint

First, let's add a metrics endpoint to the QuantFlow application:

```javascript
// server.js
const prometheus = require('prom-client');

// Create a Registry which registers the metrics
const register = new prometheus.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'quantflow'
});

// Enable the collection of default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const priceUpdatesTotal = new prometheus.Counter({
  name: 'quantflow_price_updates_total',
  help: 'Total number of price updates',
  registers: [register]
});

const activeSubscriptions = new prometheus.Gauge({
  name: 'quantflow_active_subscriptions',
  help: 'Number of active symbol subscriptions',
  registers: [register]
});

const websocketLatency = new prometheus.Histogram({
  name: 'quantflow_websocket_latency_seconds',
  help: 'WebSocket message latency in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

const backtestDuration = new prometheus.Histogram({
  name: 'quantflow_backtest_duration_seconds',
  help: 'Backtest execution time in seconds',
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register]
});

const tradingSignals = new prometheus.Counter({
  name: 'quantflow_trading_signals_total',
  help: 'Total number of trading signals generated',
  labelNames: ['symbol', 'signal'],
  registers: [register]
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    // Update gauge metrics
    activeSubscriptions.set(priceTracker.getSubscribedSymbols().length);
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});
```

### Instrumenting the WebSocket Client

```javascript
// src/core/binance-ws-client.js
class BinanceWebSocketClient {
  constructor() {
    this.messageCount = 0;
    this.latencyMeasurements = [];
  }

  handleMessage(data) {
    const startTime = Date.now();
    
    // Process message
    // ... existing message handling code ...
    
    // Record metrics
    priceUpdatesTotal.inc();
    
    const latency = Date.now() - startTime;
    websocketLatency.observe(latency / 1000); // Convert to seconds
    
    this.messageCount++;
    
    // Keep only last 1000 latency measurements
    this.latencyMeasurements.push(latency);
    if (this.latencyMeasurements.length > 1000) {
      this.latencyMeasurements.shift();
    }
  }

  getAverageLatency() {
    if (this.latencyMeasurements.length === 0) return 0;
    return this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / this.latencyMeasurements.length;
  }

  getMessageCount() {
    return this.messageCount;
  }
}
```

### Instrumenting the Backtesting Engine

```javascript
// src/backtesting/backtesting-engine.js
class BacktestingEngine {
  async backtest(strategyName, data, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!this.strategies.has(strategyName)) {
        throw new Error(`Strategy '${strategyName}' not found`);
      }

      const strategy = this.strategies.get(strategyName);
      const result = strategy(data, options);
      
      // Record metrics
      backtestDuration.observe((Date.now() - startTime) / 1000); // Convert to seconds
      
      return result;
    } catch (error) {
      // Record error metric if needed
      throw error;
    }
  }

  registerStrategy(name, strategyFunction) {
    // Wrap strategy function to add metrics
    const wrappedStrategy = (data, options = {}) => {
      const result = strategyFunction(data, options);
      
      // Record trading signals if available
      if (result.signals && Array.isArray(result.signals)) {
        result.signals.forEach(signal => {
          if (signal.signal) {
            tradingSignals.inc({
              symbol: signal.symbol || 'unknown',
              signal: signal.signal
            });
          }
        });
      }
      
      return result;
    };
    
    this.strategies.set(name, wrappedStrategy);
  }
}
```

## Prometheus Configuration

### Prometheus Configuration File

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert.rules.yml"

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
    - targets: ['localhost:9090']

  - job_name: 'quantflow'
    static_configs:
    - targets: ['quantflow-app:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'timescaledb'
    static_configs:
    - targets: ['timescaledb:9187']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
    - targets: ['redis-exporter:9121']
    metrics_path: '/metrics'

  - job_name: 'node-red'
    static_configs:
    - targets: ['nodered:1880']
    metrics_path: '/metrics'
```

### Alert Rules

```yaml
# alert.rules.yml
groups:
- name: quantflow-alerts
  rules:
  - alert: HighLatency
    expr: quantflow_websocket_latency_seconds > 0.5
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "High WebSocket latency detected"
      description: "WebSocket latency is above 500ms for more than 1 minute"

  - alert: LowMessageRate
    expr: rate(quantflow_price_updates_total[5m]) < 10
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Low price update rate"
      description: "Price updates rate is below 10 per minute"

  - alert: HighBacktestDuration
    expr: quantflow_backtest_duration_seconds > 60
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Long backtest execution time"
      description: "Backtest execution time exceeded 60 seconds"

  - alert: ServiceDown
    expr: up{job="quantflow"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "QuantFlow service is down"
      description: "QuantFlow service has been down for more than 1 minute"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes{job="quantflow"} > 500 * 1024 * 1024
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "QuantFlow memory usage exceeded 500MB"

  - alert: HighCPUUsage
    expr: rate(process_cpu_seconds_total{job="quantflow"}[5m]) > 0.8
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
      description: "QuantFlow CPU usage exceeded 80% for 5 minutes"
```

## Docker Compose Setup

### Enhanced docker-compose.yml with Monitoring

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

  prometheus:
    image: prom/prometheus:latest
    container_name: quantflow-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    depends_on:
      - quantflow-app

  grafana:
    image: grafana/grafana-enterprise
    container_name: quantflow-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    container_name: quantflow-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped
    depends_on:
      - prometheus

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: quantflow-postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://postgres:postgres@timescaledb:5432/quantflow?sslmode=disable"
    ports:
      - "9187:9187"
    restart: unless-stopped
    depends_on:
      - timescaledb

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: quantflow-redis-exporter
    environment:
      REDIS_ADDR: "redis://redis:6379"
    ports:
      - "9121:9121"
    restart: unless-stopped
    depends_on:
      - redis

volumes:
  timescaledb_data:
  redis_data:
  node_red_data:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

## Alertmanager Configuration

### Alertmanager Configuration File

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'webhook'

receivers:
- name: 'webhook'
  webhook_configs:
  - url: 'http://quantflow-app:3000/alerts/webhook'
    send_resolved: true

- name: 'email'
  email_configs:
  - to: 'alerts@quantflow.com'
    from: 'alertmanager@quantflow.com'
    smarthost: 'smtp.gmail.com:587'
    auth_username: 'alertmanager@quantflow.com'
    auth_password: 'your-email-password'
    send_resolved: true

- name: 'slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts'
    send_resolved: true
    title: '{{ template "slack.default.title" . }}'
    text: '{{ template "slack.default.text" . }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

## Grafana Dashboards

### QuantFlow Overview Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "QuantFlow Overview",
    "timezone": "browser",
    "schemaVersion": 16,
    "version": 0,
    "refresh": "10s",
    "panels": [
      {
        "id": 1,
        "type": "graph",
        "title": "Price Updates Rate",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(quantflow_price_updates_total[5m])",
            "legendFormat": "Updates per second"
          }
        ],
        "xaxis": {
          "mode": "time"
        },
        "yaxes": [
          {
            "format": "short",
            "label": "Updates/sec"
          },
          {
            "format": "short"
          }
        ]
      },
      {
        "id": 2,
        "type": "graph",
        "title": "WebSocket Latency",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "quantflow_websocket_latency_seconds",
            "legendFormat": "Latency (seconds)"
          }
        ],
        "xaxis": {
          "mode": "time"
        },
        "yaxes": [
          {
            "format": "s",
            "label": "Seconds"
          },
          {
            "format": "short"
          }
        ]
      },
      {
        "id": 3,
        "type": "stat",
        "title": "Active Subscriptions",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "quantflow_active_subscriptions",
            "legendFormat": "Active Subscriptions"
          }
        ],
        "options": {
          "reduceOptions": {
            "calcs": [
              "last"
            ]
          }
        }
      },
      {
        "id": 4,
        "type": "graph",
        "title": "Backtest Duration",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "quantflow_backtest_duration_seconds",
            "legendFormat": "Duration (seconds)"
          }
        ],
        "xaxis": {
          "mode": "time"
        },
        "yaxes": [
          {
            "format": "s",
            "label": "Seconds"
          },
          {
            "format": "short"
          }
        ]
      },
      {
        "id": 5,
        "type": "graph",
        "title": "Trading Signals",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(quantflow_trading_signals_total[5m])",
            "legendFormat": "{{signal}}"
          }
        ],
        "xaxis": {
          "mode": "time"
        },
        "yaxes": [
          {
            "format": "short",
            "label": "Signals/sec"
          },
          {
            "format": "short"
          }
        ]
      },
      {
        "id": 6,
        "type": "graph",
        "title": "System Memory Usage",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=\"quantflow\"}",
            "legendFormat": "Memory Usage"
          }
        ],
        "xaxis": {
          "mode": "time"
        },
        "yaxes": [
          {
            "format": "bytes",
            "label": "Bytes"
          },
          {
            "format": "short"
          }
        ]
      }
    ]
  }
}
```

## Custom Metrics for Trading

### Trading-Specific Metrics

```javascript
// Additional metrics for trading insights
const portfolioValue = new prometheus.Gauge({
  name: 'quantflow_portfolio_value',
  help: 'Current portfolio value',
  registers: [register]
});

const unrealizedPnL = new prometheus.Gauge({
  name: 'quantflow_unrealized_pnl',
  help: 'Unrealized profit and loss',
  registers: [register]
});

const realizedPnL = new prometheus.Counter({
  name: 'quantflow_realized_pnl_total',
  help: 'Total realized profit and loss',
  registers: [register]
});

const tradeCount = new prometheus.Counter({
  name: 'quantflow_trades_total',
  help: 'Total number of trades executed',
  labelNames: ['symbol', 'side'],
  registers: [register]
});

const positionSize = new prometheus.Gauge({
  name: 'quantflow_position_size',
  help: 'Current position size by symbol',
  labelNames: ['symbol'],
  registers: [register]
});

// Update these metrics in your trading logic
class PortfolioTracker {
  updateMetrics(portfolioState) {
    portfolioValue.set(portfolioState.totalValue);
    unrealizedPnL.set(portfolioState.unrealizedPnL);
    // Update other metrics as needed
  }
}
```

## Kubernetes Monitoring Setup

### Service Monitor for Kubernetes

```yaml
# service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: quantflow-monitor
  namespace: quantflow
  labels:
    app: quantflow
spec:
  selector:
    matchLabels:
      app: quantflow-app
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
```

### Pod Monitor for Additional Metrics

```yaml
# pod-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: quantflow-pod-monitor
  namespace: quantflow
spec:
  selector:
    matchLabels:
      app: quantflow-app
  podMetricsEndpoints:
  - port: http
    path: /metrics
    interval: 30s
```

## Alerting Integration

### Webhook Endpoint for Alerts

```javascript
// server.js
app.post('/alerts/webhook', express.json(), (req, res) => {
  try {
    const alert = req.body;
    
    // Log the alert
    console.log('Received alert:', JSON.stringify(alert, null, 2));
    
    // Process the alert (send to notification system, etc.)
    processAlert(alert);
    
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Error processing alert:', error);
    res.status(500).json({ error: error.message });
  }
});

function processAlert(alert) {
  // Send to notification channels
  // This could integrate with email, Slack, Telegram, etc.
  console.log('Processing alert:', alert);
  
  // Example: Send to console for now
  alert.alerts.forEach(a => {
    console.log(`ALERT: ${a.labels.alertname} - ${a.annotations.summary}`);
  });
}
```

## Performance Considerations

### Metric Collection Optimization

```javascript
// Optimize metric collection to avoid performance impact
class MetricsCollector {
  constructor() {
    this.collectionInterval = 10000; // 10 seconds
    this.lastCollection = 0;
    this.cachedMetrics = '';
  }

  async getMetrics() {
    const now = Date.now();
    
    // Return cached metrics if not enough time has passed
    if (now - this.lastCollection < this.collectionInterval) {
      return this.cachedMetrics;
    }
    
    // Collect fresh metrics
    this.cachedMetrics = await register.metrics();
    this.lastCollection = now;
    
    return this.cachedMetrics;
  }
}

const metricsCollector = new MetricsCollector();

// Use optimized metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await metricsCollector.getMetrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});
```

## Testing Monitoring Setup

### Monitoring Tests

```javascript
describe('Monitoring', () => {
  describe('Metrics Endpoint', () => {
    it('should expose metrics in Prometheus format', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('quantflow_price_updates_total');
    });
  });

  describe('Custom Metrics', () => {
    it('should increment price update counter', async () => {
      const initialResponse = await request(app).get('/metrics');
      const initialMetrics = initialResponse.text;
      
      // Simulate price update
      priceUpdatesTotal.inc();
      
      const updatedResponse = await request(app).get('/metrics');
      const updatedMetrics = updatedResponse.text;
      
      // Parse metrics to compare values
      // This would require a more sophisticated test
      expect(updatedMetrics).not.toEqual(initialMetrics);
    });
  });
});
```

## Best Practices

### Monitoring Best Practices

1. **Use appropriate metric types**: Counters for monotonically increasing values, Gauges for instantaneous values, Histograms for distributions
2. **Label efficiently**: Use labels for dimensions but avoid high cardinality
3. **Set appropriate retention**: Balance storage costs with monitoring needs
4. **Implement alerting hierarchies**: Critical alerts for immediate action, warnings for investigation
5. **Document metrics**: Clearly document what each metric represents and how it's calculated
6. **Test alerts**: Regularly test alerting rules to ensure they work as expected
7. **Monitor the monitors**: Ensure monitoring infrastructure itself is monitored
8. **Use dashboards effectively**: Create meaningful dashboards that provide actionable insights

### Security Considerations

1. **Protect metrics endpoints**: Restrict access to metrics endpoints in production
2. **Use authentication**: Implement authentication for Prometheus and Grafana
3. **Encrypt communications**: Use HTTPS/TLS for all monitoring communications
4. **Limit exposure**: Don't expose monitoring tools publicly without proper security measures
5. **Regular updates**: Keep monitoring tools updated with security patches