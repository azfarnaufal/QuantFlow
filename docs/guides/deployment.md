# Deployment Guide

This guide explains how to deploy QuantFlow on different cloud platforms.

## Prerequisites

Before deploying, ensure you have:
1. Docker and Docker Compose installed
2. Appropriate cloud platform account and CLI tools
3. Required environment variables configured

## Environment Variables

The following environment variables can be configured:

```bash
# Database configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Redis configuration
REDIS_URL=redis://host:port

# Server configuration
PORT=3000
NODE_ENV=production

# Binance WebSocket configuration
BINANCE_WS_URL=wss://fstream.binance.com/ws
```

## Docker Deployment

QuantFlow is designed to run in Docker containers. The provided `docker-compose.yml` file includes all necessary services:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## AWS Deployment

### Using AWS ECS

1. Create an ECS cluster
2. Build and push the Docker image to ECR:

```bash
# Login to ECR
aws ecr get-login-password --region region | docker login --username AWS --password-stdin account.dkr.ecr.region.amazonaws.com

# Build the image
docker build -t quantflow .

# Tag the image
docker tag quantflow:latest account.dkr.ecr.region.amazonaws.com/quantflow:latest

# Push the image
docker push account.dkr.ecr.region.amazonaws.com/quantflow:latest
```

3. Create ECS task definition with the following containers:
   - QuantFlow app
   - TimescaleDB
   - Redis
   - Node-RED

### Using AWS Elastic Beanstalk

1. Create a new Elastic Beanstalk application
2. Prepare your application package:

```bash
# Create a zip file with your application
zip -r quantflow.zip . -x "*.git*" "node_modules/*" "docs/*"
```

3. Upload the zip file to Elastic Beanstalk

## Google Cloud Platform Deployment

### Using Google Kubernetes Engine (GKE)

1. Create a GKE cluster
2. Build and push the Docker image to Google Container Registry:

```bash
# Build the image
docker build -t gcr.io/project-id/quantflow .

# Push the image
docker push gcr.io/project-id/quantflow
```

3. Deploy to GKE using Kubernetes manifests

### Using Google Cloud Run

1. Build and push the Docker image to Google Container Registry
2. Deploy to Cloud Run:

```bash
gcloud run deploy quantflow \
  --image gcr.io/project-id/quantflow \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Azure Deployment

### Using Azure Container Instances (ACI)

1. Build and push the Docker image to Azure Container Registry
2. Deploy to ACI:

```bash
az container create \
  --resource-group myResourceGroup \
  --name quantflow \
  --image myregistry.azurecr.io/quantflow:latest \
  --dns-name-label quantflow-app \
  --ports 3000
```

### Using Azure Kubernetes Service (AKS)

1. Create an AKS cluster
2. Build and push the Docker image to Azure Container Registry
3. Deploy to AKS using Kubernetes manifests

## Heroku Deployment

1. Create a new Heroku app
2. Add the Heroku Postgres and Heroku Redis add-ons
3. Deploy using Git:

```bash
# Add Heroku remote
heroku git:remote -a your-app-name

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Deploy
git push heroku main
```

## DigitalOcean Deployment

### Using DigitalOcean App Platform

1. Fork the repository to GitHub
2. Create a new app in DigitalOcean App Platform
3. Connect to your GitHub repository
4. Configure the app to use the Dockerfile
5. Add the required environment variables

### Using DigitalOcean Kubernetes

1. Create a Kubernetes cluster
2. Build and push the Docker image to Docker Hub or DigitalOcean Container Registry
3. Deploy to the cluster using Kubernetes manifests

## Monitoring and Logging

### Health Checks

QuantFlow provides a health check endpoint at `/health` that returns:

```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Metrics

The application exposes metrics through the `/metrics` endpoint (when configured).

### Logging

All services log to stdout/stderr, which can be collected by cloud platform logging services.

## Scaling

### Horizontal Scaling

The QuantFlow application can be scaled horizontally by running multiple instances behind a load balancer.

### Database Scaling

TimescaleDB can be scaled using:
- Read replicas for read-heavy workloads
- Partitioning for large datasets
- Connection pooling for better performance

## Backup and Recovery

### Database Backup

TimescaleDB data is persisted in Docker volumes. For cloud deployments, use the cloud provider's backup solutions:

- AWS RDS automated backups
- Google Cloud SQL backups
- Azure Database for PostgreSQL backups

### Configuration Backup

Regularly backup your configuration files and environment variables.

## Security Considerations

1. Use secure passwords for database connections
2. Restrict access to sensitive endpoints
3. Use HTTPS in production
4. Regularly update Docker images
5. Scan images for vulnerabilities
6. Implement proper authentication and authorization

## Troubleshooting

### Common Issues

1. **Database connection failures**: Check DATABASE_URL environment variable
2. **Redis connection failures**: Check REDIS_URL environment variable
3. **Port conflicts**: Ensure ports are available or change PORT environment variable
4. **Insufficient memory**: Increase memory allocation for containers

### Logs

Check container logs for error messages:

```bash
# Docker Compose
docker-compose logs service-name

# Kubernetes
kubectl logs pod-name

# Cloud platforms
# Use the platform's logging interface
```

### Performance Issues

1. Monitor resource usage (CPU, memory, disk I/O)
2. Check database query performance
3. Review application logs for errors
4. Consider scaling horizontally or vertically