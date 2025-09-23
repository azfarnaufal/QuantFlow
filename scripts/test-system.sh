#!/bin/bash

# Test script for the crypto price tracking system

echo "=== Crypto Price Tracker Test Script ==="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

echo "✓ Node.js is installed"

# Check if the application files exist
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found"
    exit 1
fi

echo "✓ Application files found"
echo

# Install dependencies
echo "Installing dependencies..."
npm install > /dev/null 2>&1
echo "✓ Dependencies installed"
echo

# Test the WebSocket connection
echo "Testing WebSocket connection to Binance..."
node test-connection.js
if [ $? -eq 0 ]; then
    echo "✓ WebSocket connection test passed"
else
    echo "✗ WebSocket connection test failed"
fi
echo

# Show how to run the application
echo "=== How to Run the Application ==="
echo "1. Run directly: npm run server"
echo "2. Test API: curl http://localhost:3000/"
echo "3. Access price data: curl http://localhost:3000/prices"
echo
echo "=== Integration with Your Stack ==="
echo "1. n8n: Import workflow from n8n-example-workflow.json"
echo "2. Huginn: Use configuration from huginn-example-config.txt"
echo "3. Node-RED: Import flow from node-red-example-flow.json"
echo "4. Telegram: Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars"
echo "5. TimescaleDB: Uncomment service in docker-compose.yml"