#!/bin/bash

# Install script for QuantFlow microservices

echo "Installing QuantFlow microservices dependencies..."

# Install main application dependencies
echo "Installing main application dependencies..."
npm install

# Install data ingestion service dependencies
echo "Installing data ingestion service dependencies..."
cd services/data-ingestion
npm install
cd ../..

# Install storage service dependencies
echo "Installing storage service dependencies..."
cd services/storage
npm install
cd ../..

# Install analysis service dependencies
echo "Installing analysis service dependencies..."
cd services/analysis
npm install
cd ../..

# Install trading service dependencies
echo "Installing trading service dependencies..."
cd services/trading
npm install
cd ../..

# Install AI agent service dependencies
echo "Installing AI agent service dependencies..."
cd services/ai-agent
npm install
cd ../..

# Install API gateway dependencies
echo "Installing API gateway dependencies..."
cd services/api-gateway
npm install
cd ../..

echo "All microservices dependencies installed successfully!"

echo "To start the microservices architecture, run:"
echo "docker-compose up -d"