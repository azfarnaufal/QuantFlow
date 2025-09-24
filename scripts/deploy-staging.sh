#!/bin/bash

# QuantFlow Staging Deployment Script

echo "Starting QuantFlow Staging Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Navigate to the project root directory
cd "$(dirname "$0")"/..

# Build the Docker images
echo "Building Docker images..."
docker-compose -f docker-compose.staging.yml build

# Start the staging environment
echo "Starting staging environment..."
docker-compose -f docker-compose.staging.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check if services are running
echo "Checking service status..."
docker-compose -f docker-compose.staging.yml ps

echo "Staging deployment completed!"
echo "Access the application at http://localhost:3001"
echo "Access Node-RED at http://localhost:1881"
echo "TimescaleDB is available at localhost:5433"
echo "Redis is available at localhost:6380"