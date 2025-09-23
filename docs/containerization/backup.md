# Automated Backup Solutions for TimescaleDB

This document describes automated backup solutions for TimescaleDB in the QuantFlow platform to ensure data protection and disaster recovery.

## Overview

Data protection is critical for QuantFlow as it stores valuable historical price data and trading information. This document outlines backup strategies, implementation approaches, and recovery procedures for TimescaleDB.

## Backup Strategies

### Full Database Backups

Full database backups capture the entire database state at a point in time:

```bash
# Using pg_dump for full backup
pg_dump -h timescaledb -U postgres -F c -b -v -f /backup/quantflow-full-$(date +%Y%m%d-%H%M%S).sql quantflow
```

### Incremental Backups

Incremental backups capture only the changes since the last backup:

```bash
# Using WAL (Write-Ahead Logging) archiving
# Configure in postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /backup/wal/%f'
```

### Logical Backups

Logical backups export data in a portable format:

```bash
# Export specific tables
pg_dump -h timescaledb -U postgres -t prices -f /backup/prices-$(date +%Y%m%d).sql quantflow
```

## Docker-Based Backup Solution

### Backup Script

Create a backup script for Docker environments:

```bash
#!/bin/bash
# backup.sh

set -e

# Configuration
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="quantflow-backup-$DATE"
TIMESCALEDB_CONTAINER="quantflow-timescaledb"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform full database backup
echo "Starting backup: $BACKUP_NAME"
docker exec $TIMESCALEDB_CONTAINER pg_dump -U postgres -F c -b -v -f /tmp/$BACKUP_NAME.sql quantflow

# Copy backup from container to host
docker cp $TIMESCALEDB_CONTAINER:/tmp/$BACKUP_NAME.sql $BACKUP_DIR/$BACKUP_NAME.sql

# Remove temporary file from container
docker exec $TIMESCALEDB_CONTAINER rm /tmp/$BACKUP_NAME.sql

# Compress backup
gzip $BACKUP_DIR/$BACKUP_NAME.sql

# Remove backups older than retention period
find $BACKUP_DIR -name "quantflow-backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME.sql.gz"
```

### Scheduled Backup with Cron

Set up automated backups using cron:

```bash
# Add to crontab
# Daily backup at 2 AM
0 2 * * * /opt/quantflow/scripts/backup.sh >> /var/log/quantflow-backup.log 2>&1
```

## Kubernetes Backup Solution

### Backup CronJob

Create a Kubernetes CronJob for automated backups:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: timescaledb-backup
  namespace: quantflow
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
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
              echo "Starting backup..."
              pg_dump -h timescaledb -U postgres -F c -b -v -f /backup/quantflow-$(date +%Y%m%d-%H%M%S).sql quantflow
              echo "Backup completed"
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
      storage: 100Gi
```

### Backup with Volume Snapshots

Use Kubernetes VolumeSnapshots for efficient backups:

```yaml
# backup-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: timescaledb-snapshot-$(date +%Y%m%d)
  namespace: quantflow
  labels:
    backup-date: $(date +%Y%m%d)
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: timescaledb-data
```

## Cloud-Native Backup Solutions

### AWS Backup

For AWS deployments, use AWS Backup service:

```yaml
# aws-backup.yaml
Resources:
  BackupVault:
    Type: AWS::Backup::BackupVault
    Properties:
      BackupVaultName: quantflow-backup-vault
      
  BackupPlan:
    Type: AWS::Backup::BackupPlan
    Properties:
      BackupPlan:
        BackupPlanName: quantflow-backup-plan
        BackupPlanRule:
          - RuleName: daily-backup
            TargetBackupVault: !Ref BackupVault
            ScheduleExpression: cron(0 2 * * ? *)
            StartWindowMinutes: 60
            CompletionWindowMinutes: 120
            Lifecycle:
              DeleteAfterDays: 30
              
  BackupSelection:
    Type: AWS::Backup::BackupSelection
    Properties:
      BackupPlanId: !Ref BackupPlan
      BackupSelection:
        SelectionName: timescaledb-selection
        IamRoleArn: !GetAtt BackupRole.Arn
        Resources:
          - !Sub "arn:aws:ec2:${AWS::Region}:${AWS::AccountId}:volume/*"
```

### Google Cloud Backup

For GCP deployments, use Cloud Storage for backups:

```bash
#!/bin/bash
# gcp-backup.sh

PROJECT_ID="your-project-id"
BUCKET_NAME="quantflow-backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="quantflow-backup-$DATE.sql.gz"

# Perform backup
pg_dump -h timescaledb -U postgres quantflow | gzip > /tmp/$BACKUP_FILE

# Upload to Cloud Storage
gsutil cp /tmp/$BACKUP_FILE gs://$BUCKET_NAME/$BACKUP_FILE

# Remove local file
rm /tmp/$BACKUP_FILE

# Remove backups older than 30 days
gsutil ls gs://$BUCKET_NAME/ | grep "quantflow-backup-" | \
  while read file; do
    # Parse date from filename and compare with current date
    # Implementation depends on date format in filename
    # Remove if older than 30 days
  done
```

### Azure Backup

For Azure deployments, use Azure Backup service:

```bash
#!/bin/bash
# azure-backup.sh

RESOURCE_GROUP="quantflow-rg"
BACKUP_VAULT="quantflow-backup-vault"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="quantflow-backup-$DATE.sql"

# Perform backup
pg_dump -h timescaledb -U postgres quantflow > /tmp/$BACKUP_FILE

# Upload to Azure Storage
az storage blob upload \
  --account-name quantflowstorage \
  --container-name backups \
  --name $BACKUP_FILE \
  --file /tmp/$BACKUP_FILE

# Remove local file
rm /tmp/$BACKUP_FILE
```

## Backup Verification

### Backup Integrity Check

Create a script to verify backup integrity:

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check file size
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
if [ $FILE_SIZE -lt 1024 ]; then
  echo "Backup file is too small: $FILE_SIZE bytes"
  exit 1
fi

# For compressed files, try to decompress
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -t "$BACKUP_FILE"
  if [ $? -eq 0 ]; then
    echo "Backup file integrity check passed"
  else
    echo "Backup file integrity check failed"
    exit 1
  fi
else
  # For uncompressed files, try to restore to temporary database
  echo "Performing restore test (this may take a while)..."
  createdb -U postgres quantflow_test_restore
  pg_restore -U postgres -d quantflow_test_restore "$BACKUP_FILE"
  if [ $? -eq 0 ]; then
    echo "Backup file integrity check passed"
    dropdb -U postgres quantflow_test_restore
  else
    echo "Backup file integrity check failed"
    dropdb -U postgres quantflow_test_restore 2>/dev/null
    exit 1
  fi
fi
```

### Automated Backup Verification

```yaml
# backup-verification-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: quantflow
spec:
  schedule: "0 3 * * 0"  # Weekly on Sunday at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify-backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              # Find the latest backup
              LATEST_BACKUP=$(ls -t /backup/quantflow-backup-*.sql.gz | head -1)
              if [ -n "$LATEST_BACKUP" ]; then
                echo "Verifying backup: $LATEST_BACKUP"
                # Copy backup to temporary location
                cp "$LATEST_BACKUP" /tmp/latest-backup.sql.gz
                # Verify integrity
                gunzip -t /tmp/latest-backup.sql.gz
                if [ $? -eq 0 ]; then
                  echo "Backup verification successful"
                else
                  echo "Backup verification failed"
                  exit 1
                fi
                # Clean up
                rm /tmp/latest-backup.sql.gz
              else
                echo "No backup files found"
                exit 1
              fi
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

## Recovery Procedures

### Point-in-Time Recovery

Set up continuous archiving for point-in-time recovery:

```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'

# recovery.conf (for recovery)
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '2023-01-01 12:00:00'
```

### Complete Database Restore

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
TARGET_DB=${2:-quantflow}

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file> [target-database]"
  exit 1
fi

# Stop application services
echo "Stopping QuantFlow services..."
kubectl scale deployment quantflow-app --replicas=0 -n quantflow

# Drop existing database
echo "Dropping existing database..."
dropdb -U postgres $TARGET_DB

# Create new database
echo "Creating new database..."
createdb -U postgres $TARGET_DB

# Restore from backup
echo "Restoring from backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | pg_restore -U postgres -d $TARGET_DB
else
  pg_restore -U postgres -d $TARGET_DB "$BACKUP_FILE"
fi

# Restart application services
echo "Restarting QuantFlow services..."
kubectl scale deployment quantflow-app --replicas=2 -n quantflow

echo "Restore completed"
```

## Backup Monitoring and Alerting

### Backup Status Monitoring

```javascript
// backup-monitor.js
const fs = require('fs');
const path = require('path');

class BackupMonitor {
  constructor(backupDir, alertThresholdHours = 24) {
    this.backupDir = backupDir;
    this.alertThresholdHours = alertThresholdHours;
  }

  checkBackupStatus() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('quantflow-backup-') && file.endsWith('.sql.gz')
      );
      
      if (backupFiles.length === 0) {
        this.sendAlert('No backup files found');
        return;
      }
      
      // Sort by modification time (newest first)
      backupFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(this.backupDir, a));
        const statB = fs.statSync(path.join(this.backupDir, b));
        return statB.mtime - statA.mtime;
      });
      
      const latestBackup = backupFiles[0];
      const latestBackupPath = path.join(this.backupDir, latestBackup);
      const stat = fs.statSync(latestBackupPath);
      const ageHours = (Date.now() - stat.mtime) / (1000 * 60 * 60);
      
      if (ageHours > this.alertThresholdHours) {
        this.sendAlert(`Last backup is ${ageHours.toFixed(1)} hours old`);
      } else {
        console.log(`Backup status OK. Last backup: ${latestBackup} (${ageHours.toFixed(1)} hours ago)`);
      }
    } catch (error) {
      this.sendAlert(`Backup monitoring error: ${error.message}`);
    }
  }
  
  sendAlert(message) {
    console.error(`BACKUP ALERT: ${message}`);
    // Implementation for sending alerts (email, Slack, etc.)
  }
}

// Schedule periodic checks
const monitor = new BackupMonitor('/backup', 24);
setInterval(() => {
  monitor.checkBackupStatus();
}, 60 * 60 * 1000); // Check every hour
```

### Prometheus Metrics for Backups

```javascript
// Add to server.js for backup metrics
const backupLastSuccess = new prometheus.Gauge({
  name: 'quantflow_backup_last_success_timestamp_seconds',
  help: 'Timestamp of the last successful backup',
  registers: [register]
});

const backupFileSize = new prometheus.Gauge({
  name: 'quantflow_backup_file_size_bytes',
  help: 'Size of the latest backup file in bytes',
  registers: [register]
});

// Update these metrics in your backup process
function updateBackupMetrics() {
  try {
    const files = fs.readdirSync('/backup');
    const backupFiles = files.filter(file => 
      file.startsWith('quantflow-backup-') && file.endsWith('.sql.gz')
    );
    
    if (backupFiles.length > 0) {
      backupFiles.sort((a, b) => {
        const statA = fs.statSync(path.join('/backup', a));
        const statB = fs.statSync(path.join('/backup', b));
        return statB.mtime - statA.mtime;
      });
      
      const latestBackup = backupFiles[0];
      const latestBackupPath = path.join('/backup', latestBackup);
      const stat = fs.statSync(latestBackupPath);
      
      backupLastSuccess.set(stat.mtime.getTime() / 1000);
      backupFileSize.set(stat.size);
    }
  } catch (error) {
    console.error('Error updating backup metrics:', error);
  }
}
```

## Disaster Recovery Plan

### Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

Define clear RTO and RPO targets:

```yaml
# dr-plan.yaml
disasterRecovery:
  objectives:
    rto: "4 hours"  # Recovery Time Objective
    rpo: "24 hours" # Recovery Point Objective
  procedures:
    - name: "Database Recovery"
      steps:
        - "Identify the latest valid backup"
        - "Stop all application services"
        - "Restore database from backup"
        - "Verify data integrity"
        - "Restart application services"
        - "Validate application functionality"
    - name: "Full System Recovery"
      steps:
        - "Provision new infrastructure"
        - "Restore database from backup"
        - "Deploy application containers"
        - "Configure networking and security"
        - "Validate end-to-end functionality"
  testing:
    frequency: "quarterly"
    lastTest: "2023-01-15"
```

### Recovery Script

```bash
#!/bin/bash
# disaster-recovery.sh

set -e

echo "Starting disaster recovery process..."

# 1. Provision new infrastructure (example with Kubernetes)
echo "Provisioning infrastructure..."
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/configmap.yaml

# 2. Deploy database
echo "Deploying database..."
kubectl apply -f kubernetes/timescaledb.yaml
sleep 60 # Wait for database to be ready

# 3. Restore database from backup
echo "Restoring database..."
LATEST_BACKUP=$(ls -t /backup/quantflow-backup-*.sql.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  kubectl cp "$LATEST_BACKUP" quantflow/timescaledb-0:/tmp/backup.sql.gz
  kubectl exec quantflow/timescaledb-0 -- gunzip /tmp/backup.sql.gz
  kubectl exec quantflow/timescaledb-0 -- pg_restore -U postgres -d quantflow /tmp/backup.sql
  kubectl exec quantflow/timescaledb-0 -- rm /tmp/backup.sql
  echo "Database restored successfully"
else
  echo "No backup file found"
  exit 1
fi

# 4. Deploy application services
echo "Deploying application services..."
kubectl apply -f kubernetes/redis.yaml
kubectl apply -f kubernetes/quantflow-app.yaml
kubectl apply -f kubernetes/nodered.yaml

# 5. Wait for services to be ready
echo "Waiting for services to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/quantflow-app -n quantflow
kubectl wait --for=condition=ready --timeout=300s pod -l app=redis -n quantflow

echo "Disaster recovery completed successfully"
```

## Testing and Validation

### Backup Testing Procedures

```bash
#!/bin/bash
# test-backup.sh

echo "Testing backup and recovery procedures..."

# 1. Create test data
echo "Creating test data..."
psql -h timescaledb -U postgres -d quantflow -c "
  INSERT INTO prices (time, symbol, price, volume) 
  VALUES (NOW(), 'TEST', 100.00, 1000.00);
"

# 2. Perform backup
echo "Performing backup..."
./backup.sh

# 3. Verify backup
echo "Verifying backup..."
LATEST_BACKUP=$(ls -t /backup/quantflow-backup-*.sql.gz | head -1)
./verify-backup.sh "$LATEST_BACKUP"

# 4. Test restore to temporary database
echo "Testing restore..."
createdb -U postgres quantflow_test
gunzip -c "$LATEST_BACKUP" | pg_restore -U postgres -d quantflow_test

# 5. Verify restored data
echo "Verifying restored data..."
RESTORED_COUNT=$(psql -h localhost -U postgres -d quantflow_test -t -c "SELECT COUNT(*) FROM prices WHERE symbol = 'TEST';" | xargs)
if [ "$RESTORED_COUNT" -gt 0 ]; then
  echo "Restore test successful"
else
  echo "Restore test failed"
  exit 1
fi

# 6. Clean up
dropdb -U postgres quantflow_test
psql -h timescaledb -U postgres -d quantflow -c "DELETE FROM prices WHERE symbol = 'TEST';"

echo "Backup testing completed successfully"
```

## Best Practices

### Backup Best Practices

1. **Regular Testing**: Test backups regularly to ensure they can be restored
2. **Multiple Copies**: Keep multiple copies of backups in different locations
3. **Encryption**: Encrypt backups to protect sensitive data
4. **Compression**: Compress backups to save storage space
5. **Retention Policy**: Implement a clear retention policy for backups
6. **Monitoring**: Monitor backup processes and alert on failures
7. **Documentation**: Document backup and recovery procedures
8. **Security**: Secure backup storage and limit access to authorized personnel
9. **Automation**: Automate backup processes to reduce human error
10. **Validation**: Validate backup integrity after each backup operation

### Security Considerations

1. **Access Control**: Restrict access to backup files and systems
2. **Encryption**: Encrypt backups both in transit and at rest
3. **Audit Logging**: Log all backup and restore operations
4. **Credentials Management**: Secure database credentials used for backups
5. **Network Security**: Use secure connections for remote backups
6. **Compliance**: Ensure backups comply with relevant regulations