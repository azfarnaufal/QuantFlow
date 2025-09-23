#!/bin/bash

# Crypto Price Tracker Deployment Script

# Exit on any error
set -e

echo "Crypto Price Tracker Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if TimescaleDB is configured
if [ "$1" = "timescaledb" ]; then
    echo "Setting up TimescaleDB storage..."
    export STORAGE_TYPE="timescaledb"
    
    # Check if PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        echo "Warning: PostgreSQL not found. Please install PostgreSQL with TimescaleDB extension."
        echo "Falling back to in-memory storage..."
        export STORAGE_TYPE="memory"
    else
        echo "PostgreSQL found. Please ensure TimescaleDB extension is installed and configured."
        echo "Database name should be 'crypto_prices'"
    fi
else
    echo "Using in-memory storage (default)"
    export STORAGE_TYPE="memory"
fi

# Start the server
echo "Starting the price tracker server..."
echo "Server will be available at http://localhost:3000"
echo "Press Ctrl+C to stop the server"

# Run the server with the selected storage type
STORAGE_TYPE=$STORAGE_TYPE npm run server