#!/bin/bash

# Script to manage all services for the crypto price tracker project
# Usage: ./manage-services.sh [start|stop|restart|status]

ACTION=${1:-"status"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/Users/azfar.naufal/Documents/projects/crypto-price-tracker"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[STATUS]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a process is running (more specific)
is_process_running() {
    local process_name=$1
    # Use pgrep for more accurate process detection
    if pgrep -f "$process_name" > /dev/null 2>&1; then
        return 0  # Process is running
    else
        return 1  # Process is not running
    fi
}

# Function to get process PID
get_process_pid() {
    local process_name=$1
    pgrep -f "$process_name" 2>/dev/null
}

# Function to check if a port is in use
is_port_in_use() {
    local port=$1
    if lsof -i :$port -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is not in use
    fi
}

# Function to start services
start_services() {
    print_info "Starting all services..."
    
    # Check if services are already running
    if is_process_running "nodered-integration.js"; then
        print_status "Node-RED integration server is already running (PID: $(get_process_pid "nodered-integration.js"))"
    else
        print_info "Starting Node-RED integration server..."
        cd $PROJECT_DIR
        nohup npm run nodered > /tmp/nodered-integration.log 2>&1 &
        sleep 3
        
        if is_process_running "nodered-integration.js"; then
            print_status "Node-RED integration server started successfully (PID: $(get_process_pid "nodered-integration.js"))"
        else
            print_error "Failed to start Node-RED integration server"
            if [ -f /tmp/nodered-integration.log ]; then
                tail -10 /tmp/nodered-integration.log
            fi
            return 1
        fi
    fi
    
    # Check if Node-RED is already running
    if is_process_running "node-red"; then
        print_status "Node-RED is already running (PID: $(get_process_pid "node-red"))"
    else
        print_info "Starting Node-RED..."
        nohup node-red > /tmp/node-red.log 2>&1 &
        sleep 5
        
        if is_process_running "node-red"; then
            print_status "Node-RED started successfully (PID: $(get_process_pid "node-red"))"
        else
            print_error "Failed to start Node-RED"
            if [ -f /tmp/node-red.log ]; then
                tail -10 /tmp/node-red.log
            fi
            return 1
        fi
    fi
    
    print_status "All services started"
}

# Function to stop services
stop_services() {
    print_info "Stopping all services..."
    
    # Function to kill processes by name
    kill_process() {
        local process_name=$1
        if is_process_running "$process_name"; then
            print_info "Stopping $process_name processes..."
            pkill -f "$process_name"
            sleep 2
            
            # Check if processes are still running
            if is_process_running "$process_name"; then
                print_info "Force killing remaining $process_name processes..."
                pkill -9 -f "$process_name"
                sleep 1
            else
                print_status "$process_name processes stopped successfully."
            fi
        else
            print_status "No $process_name processes found."
        fi
    }
    
    # Stop Node-RED integration server
    kill_process "nodered-integration.js"
    
    # Stop Node-RED
    kill_process "node-red"
    
    print_status "All services stopped."
}

# Function to show status
show_status() {
    print_info "Checking service status..."
    
    # Check Node-RED integration server
    if is_process_running "nodered-integration.js"; then
        local pid=$(get_process_pid "nodered-integration.js")
        print_status "Node-RED integration server: RUNNING (PID: $pid)"
        if is_port_in_use 3001; then
            print_status "Port 3001: IN USE"
        else
            print_error "Port 3001: NOT IN USE (but process is running)"
        fi
    else
        print_status "Node-RED integration server: STOPPED"
        if is_port_in_use 3001; then
            print_error "Port 3001: IN USE (but process not found)"
        else
            print_status "Port 3001: AVAILABLE"
        fi
    fi
    
    # Check Node-RED
    if is_process_running "node-red"; then
        local pid=$(get_process_pid "node-red")
        print_status "Node-RED: RUNNING (PID: $pid)"
        if is_port_in_use 1880; then
            print_status "Port 1880: IN USE"
        else
            print_error "Port 1880: NOT IN USE (but process is running)"
        fi
    else
        print_status "Node-RED: STOPPED"
        if is_port_in_use 1880; then
            print_error "Port 1880: IN USE (but process not found)"
        else
            print_status "Port 1880: AVAILABLE"
        fi
    fi
}

# Function to restart services
restart_services() {
    print_info "Restarting all services..."
    stop_services
    sleep 3
    start_services
}

# Main logic
case $ACTION in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [start|stop|restart|status]"
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  status  - Show status of all services"
        exit 1
        ;;
esac