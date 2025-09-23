#!/bin/bash

# Test script for n8n integration

echo "Testing n8n integration with Crypto Price Tracker"

# Check if the server is running
echo "Checking if the price tracker server is running..."

# Try to access the server
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)

if [ "$response" = "200" ]; then
    echo "✓ Price tracker server is running"
    
    # Get current prices
    echo "Current prices:"
    curl -s http://localhost:3000/prices | jq .
    
    echo ""
    echo "Example n8n HTTP Request node configuration:"
    echo "- Method: GET"
    echo "- URL: http://localhost:3000/prices"
    echo "- Response: JSON with current prices for all tracked symbols"
    
else
    echo "✗ Price tracker server is not running"
    echo "Please start the server with: npm run server"
fi