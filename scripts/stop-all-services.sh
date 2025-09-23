#!/bin/bash

# Script to stop all services related to the crypto price tracker project

echo "Stopping all crypto price tracker services..."

# Function to kill processes by name
kill_process() {
    local process_name=$1
    local process_count=$(ps aux | grep "$process_name" | grep -v grep | wc -l)
    
    if [ $process_count -gt 0 ]; then
        echo "Stopping $process_name processes..."
        pkill -f "$process_name"
        sleep 2
        
        # Check if processes are still running
        local remaining_count=$(ps aux | grep "$process_name" | grep -v grep | wc -l)
        if [ $remaining_count -gt 0 ]; then
            echo "Force killing remaining $process_name processes..."
            pkill -9 -f "$process_name"
        else
            echo "$process_name processes stopped successfully."
        fi
    else
        echo "No $process_name processes found."
    fi
}

# Stop Node-RED integration server
kill_process "nodered-integration.js"

# Stop Node-RED
kill_process "node-red"

# Stop npm processes related to the project
kill_process "npm run nodered"

echo "All services stopped."

# Verify no processes are left running
echo ""
echo "Verifying no processes are left running..."
echo "Node processes still running:"
ps aux | grep node | grep -v grep | grep -v Qoder | grep -v Trae || echo "No relevant node processes found."

echo ""
echo "Script completed."