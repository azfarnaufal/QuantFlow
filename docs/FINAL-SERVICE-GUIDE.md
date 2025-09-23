# Final Service Management Guide

This document provides a comprehensive guide for managing all services in the crypto price tracker project.

## Current Status

All services have been successfully stopped:
- Node-RED integration server: STOPPED
- Node-RED: STOPPED
- Ports 3001 and 1880: AVAILABLE

## Service Management Tools

### 1. Main Management Script: manage-services.sh

This is the recommended tool for managing all services. It provides comprehensive control with detailed status information.

**Commands:**
```bash
# Check status of all services
./manage-services.sh status

# Start all services
./manage-services.sh start

# Stop all services
./manage-services.sh stop

# Restart all services
./manage-services.sh restart
```

**Features:**
- Color-coded output for easy reading
- Process ID (PID) information
- Port usage verification
- Error detection and reporting
- Log file inspection on startup failures

### 2. Simple Stop Script: stop-all-services.sh

This is a lightweight script specifically for stopping services.

**Usage:**
```bash
./stop-all-services.sh
```

**Features:**
- Quick termination of all processes
- Verification of stopped processes
- Simple and straightforward

## Service Architecture

### Running Services Overview

When all services are running:

1. **Main Price Tracker Server** (npm run server)
   - Port: 3000
   - Connects to Binance WebSocket API
   - Provides REST endpoints for price data

2. **Node-RED Integration Server** (npm run nodered)
   - Port: 3001
   - Provides formatted endpoints for Node-RED
   - Runs as a separate process from main server

3. **Node-RED** (node-red)
   - Port: 1880
   - Visual programming interface
   - Connects to Node-RED Integration Server

### Data Flow

```
Binance WebSocket API
        ↓
Main Price Tracker (Port 3000)
        ↓
Node-RED Integration Server (Port 3001)
        ↓
Node-RED Flows (Port 1880)
```

## Starting Services

### Recommended Approach

1. **Start all services with management script:**
   ```bash
   ./manage-services.sh start
   ```

2. **Verify services are running:**
   ```bash
   ./manage-services.sh status
   ```

### Manual Approach

1. **Start main price tracker server:**
   ```bash
   npm run server
   ```

2. **In a separate terminal, start Node-RED integration server:**
   ```bash
   npm run nodered
   ```

3. **In another terminal, start Node-RED:**
   ```bash
   node-red
   ```

## Stopping Services

### Recommended Approach

1. **Stop all services with management script:**
   ```bash
   ./manage-services.sh stop
   ```

2. **Verify services are stopped:**
   ```bash
   ./manage-services.sh status
   ```

### Alternative Approach

1. **Use the simple stop script:**
   ```bash
   ./stop-all-services.sh
   ```

## Troubleshooting

### Services Won't Start

1. **Check if required ports are in use:**
   ```bash
   lsof -i :3000
   lsof -i :3001
   lsof -i :1880
   ```

2. **Kill processes using those ports:**
   ```bash
   kill -9 <PID>
   ```

3. **Check log files:**
   ```bash
   tail -f /tmp/nodered-integration.log
   tail -f /tmp/node-red.log
   ```

### Services Won't Stop

1. **Force stop with management script:**
   ```bash
   ./manage-services.sh stop
   ```

2. **Manually kill processes:**
   ```bash
   pkill -f nodered-integration.js
   pkill -f node-red
   ```

3. **Use SIGKILL if necessary:**
   ```bash
   pkill -9 -f nodered-integration.js
   pkill -9 -f node-red
   ```

### Port Conflicts

1. **Identify the process using the port:**
   ```bash
   lsof -i :3001
   ```

2. **Kill the specific process:**
   ```bash
   kill -9 <PID>
   ```

3. **Alternative: Change the port in the configuration**

## Best Practices

1. **Always use the management scripts** for consistent service management
2. **Check status before starting** to avoid conflicts
3. **Stop services properly** before shutting down your system
4. **Monitor logs** during startup and operation
5. **Keep separate terminals** for each service during development
6. **Use nohup** for long-running services to prevent accidental termination

## Service Endpoints

### Main Price Tracker Server (Port 3000)
- `GET /prices` - All tracked symbol prices
- `GET /price/:symbol` - Specific symbol price
- `GET /history/:symbol` - Price history for a symbol

### Node-RED Integration Server (Port 3001)
- `GET /nodered/prices` - All tracked symbol prices formatted for Node-RED
- `GET /nodered/price/:symbol` - Specific symbol price

### Node-RED Interface (Port 1880)
- Web-based visual programming environment at http://localhost:1880

## Testing Service Availability

### Check if services are responding:

```bash
# Test main server
curl http://localhost:3000/prices

# Test Node-RED integration server
curl http://localhost:3001/nodered/prices

# Test Node-RED interface
curl http://localhost:1880
```

## Containerization

For production deployment, consider using Docker:

```bash
# Build the image
docker build -t crypto-price-tracker .

# Run the container
docker run -p 3000:3000 crypto-price-tracker

# Or use docker-compose
docker-compose up
```

## Next Steps

1. **Start services** when you want to use the system:
   ```bash
   ./manage-services.sh start
   ```

2. **Access Node-RED** at http://localhost:1880

3. **Import flows** from the provided JSON files

4. **Monitor the debug panel** for real-time price updates

5. **Stop services** when finished:
   ```bash
   ./manage-services.sh stop
   ```

The system is now fully configured and ready for use. All management tools are in place to ensure smooth operation.