# Kubernetes Deployment Configuration

This document describes how to deploy QuantFlow on Kubernetes with health checks, monitoring, and auto-scaling.

## Prerequisites

Before deploying to Kubernetes, ensure you have:
1. A Kubernetes cluster (local with Minikube, cloud-based, or on-premises)
2. `kubectl` CLI tool installed and configured
3. Docker images pushed to a container registry
4. Appropriate permissions to create resources in the cluster

## Namespace

First, create a dedicated namespace for QuantFlow:

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: quantflow
```

Apply the namespace:
```bash
kubectl apply -f namespace.yaml
```

## Secrets Management

Create secrets for sensitive configuration:

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: quantflow-secrets
  namespace: quantflow
type: Opaque
data:
  # Base64 encoded values
  database-password: cG9zdGdyZXM=  # postgres
  redis-password: cmVkaXM=        # redis
  binance-api-key: eW91ci1hcGkta2V5
  binance-api-secret: eW91ci1hcGktc2VjcmV0
```

## ConfigMaps

Create ConfigMaps for non-sensitive configuration:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: quantflow-config
  namespace: quantflow
data:
  BINANCE_WS_URL: "wss://fstream.binance.com/ws"
  SERVER_PORT: "3000"
  RECONNECT_INTERVAL: "5000"
  MAX_HISTORY_LENGTH: "100"
  DB_POOL_MAX: "20"
  DB_POOL_MIN: "5"
  DB_POOL_IDLE_TIMEOUT: "30000"
  DB_POOL_CONNECTION_TIMEOUT: "2000"
  REDIS_CACHE_TTL: "30"
```

## Database Deployment

### TimescaleDB StatefulSet

```yaml
# timescaledb.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timescaledb
  namespace: quantflow
spec:
  serviceName: timescaledb
  replicas: 1
  selector:
    matchLabels:
      app: timescaledb
  template:
    metadata:
      labels:
        app: timescaledb
    spec:
      containers:
      - name: timescaledb
        image: timescale/timescaledb:latest-pg15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: quantflow-secrets
              key: database-password
        - name: POSTGRES_DB
          value: "quantflow"
        volumeMounts:
        - name: timescaledb-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U postgres
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: timescaledb-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: timescaledb
  namespace: quantflow
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: timescaledb
  clusterIP: None
```

### Redis Deployment

```yaml
# redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: quantflow
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:latest
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: quantflow
spec:
  ports:
  - port: 6379
    targetPort: 6379
  selector:
    app: redis
```

## QuantFlow Application Deployment

### Main Application

```yaml
# quantflow-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quantflow-app
  namespace: quantflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: quantflow-app
  template:
    metadata:
      labels:
        app: quantflow-app
    spec:
      containers:
      - name: quantflow-app
        image: your-registry/quantflow:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          value: "postgresql://postgres:$(DATABASE_PASSWORD)@timescaledb:5432/quantflow"
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: BINANCE_WS_URL
          valueFrom:
            configMapKeyRef:
              name: quantflow-config
              key: BINANCE_WS_URL
        - name: SERVER_PORT
          valueFrom:
            configMapKeyRef:
              name: quantflow-config
              key: SERVER_PORT
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: quantflow-secrets
              key: database-password
        envFrom:
        - configMapRef:
            name: quantflow-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
        - name: app-config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: app-config
        configMap:
          name: quantflow-config
---
apiVersion: v1
kind: Service
metadata:
  name: quantflow-app
  namespace: quantflow
spec:
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: quantflow-app
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: quantflow-ingress
  namespace: quantflow
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: quantflow.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: quantflow-app
            port:
              number: 80
```

### Node-RED Deployment

```yaml
# nodered.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodered
  namespace: quantflow
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nodered
  template:
    metadata:
      labels:
        app: nodered
    spec:
      containers:
      - name: nodered
        image: nodered/node-red:latest
        ports:
        - containerPort: 1880
        volumeMounts:
        - name: nodered-data
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 1880
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: 1880
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: nodered-data
        persistentVolumeClaim:
          claimName: nodered-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: nodered
  namespace: quantflow
spec:
  ports:
  - port: 1880
    targetPort: 1880
  selector:
    app: nodered
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nodered-pvc
  namespace: quantflow
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

## Horizontal Pod Autoscaler

Configure auto-scaling based on CPU utilization:

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: quantflow-app-hpa
  namespace: quantflow
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: quantflow-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Resource Quotas

Limit resource usage in the namespace:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quantflow-quota
  namespace: quantflow
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 1Gi
    limits.cpu: "2"
    limits.memory: 2Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
    services.nodeports: "0"
```

## Network Policies

Restrict network traffic between services:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quantflow-network-policy
  namespace: quantflow
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: quantflow
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: quantflow
```

## Monitoring with Prometheus

### Service Monitor

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

### Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: quantflow
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'quantflow'
      static_configs:
      - targets: ['quantflow-app:3000']
```

## Deployment Commands

### Apply All Configurations

```bash
# Apply all configurations
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml
kubectl apply -f timescaledb.yaml
kubectl apply -f redis.yaml
kubectl apply -f quantflow-app.yaml
kubectl apply -f nodered.yaml
kubectl apply -f hpa.yaml
kubectl apply -f resource-quota.yaml
kubectl apply -f network-policy.yaml
```

### Check Deployment Status

```bash
# Check pod status
kubectl get pods -n quantflow

# Check service status
kubectl get services -n quantflow

# Check deployment status
kubectl get deployments -n quantflow

# Check HPA status
kubectl get hpa -n quantflow

# Check resource quota
kubectl get resourcequota -n quantflow
```

### View Logs

```bash
# View application logs
kubectl logs -f deployment/quantflow-app -n quantflow

# View database logs
kubectl logs -f statefulset/timescaledb -n quantflow

# View Redis logs
kubectl logs -f deployment/redis -n quantflow
```

## Rolling Updates

### Update Strategy

```yaml
# In quantflow-app.yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

### Perform Rolling Update

```bash
# Update deployment with new image
kubectl set image deployment/quantflow-app quantflow-app=your-registry/quantflow:v2.0 -n quantflow

# Check rollout status
kubectl rollout status deployment/quantflow-app -n quantflow

# Rollback if needed
kubectl rollout undo deployment/quantflow-app -n quantflow
```

## Backup and Recovery

### Database Backup CronJob

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: timescaledb-backup
  namespace: quantflow
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h timescaledb -U postgres quantflow > /backup/quantflow-$(date +%Y%m%d).sql
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: quantflow-secrets
                  key: database-password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: quantflow
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

## Security Best Practices

### Pod Security Policies

```yaml
# psp.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: quantflow-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
  fsGroup:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
  readOnlyRootFilesystem: false
```

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**:
   ```bash
   kubectl describe pod <pod-name> -n quantflow
   ```

2. **Services not accessible**:
   ```bash
   kubectl get endpoints -n quantflow
   ```

3. **Resource limits exceeded**:
   ```bash
   kubectl describe quota -n quantflow
   ```

4. **Health checks failing**:
   ```bash
   kubectl logs <pod-name> -n quantflow
   ```

### Debugging Commands

```bash
# Check events
kubectl get events -n quantflow

# Check resource usage
kubectl top pods -n quantflow

# Exec into a pod
kubectl exec -it <pod-name> -n quantflow -- /bin/sh

# Port forward for local testing
kubectl port-forward service/quantflow-app 3000:80 -n quantflow
```