# Service Management Guide

This document explains how to manage the services in the crypto price tracker project.

## Overview

The project consists of several services that can be managed using the provided scripts:

1. **Main Price Tracker Server** - Connects to Binance WebSocket API
2. **Node-RED Integration Server** - Provides formatted endpoints for Node-RED (port 3001)
3. **Node-RED** - Visual programming interface (port 1880)

## Management Scripts

### manage-services.sh

This is the main script for managing all services. It supports the following commands:

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

### stop-all-services.sh

This is a simple script to stop all services. It can be run directly:

```bash
./stop-all-services.sh
```

## Service Details

### Main Price Tracker Server

- **Command**: `npm start` or `npm run server`
- **Port**: 3000
- **Endpoints**: 
  - `GET /prices` - All tracked symbol prices
  - `GET /price/:symbol` - Specific symbol price
  - `GET /history/:symbol` - Price history for a symbol

### Node-RED Integration Server

- **Command**: `npm run nodered`
- **Port**: 3001
- **Endpoints**:
  - `GET /nodered/prices` - All tracked symbol prices formatted for Node-RED
  - `GET /nodered/price/:symbol` - Specific symbol price

### Node-RED

- **Command**: `node-red`
- **Port**: 1880
- **Interface**: Web-based visual programming environment

## Typical Usage Workflow

### Starting Services

1. Start the main price tracker server:
   ```bash
   npm run server
   ```

2. In a separate terminal, start the Node-RED integration server:
   ```bash
   npm run nodered
   ```

3. In another terminal, start Node-RED:
   ```bash
   node-red
   ```

### Using the Management Script

Alternatively, you can use the management script to start all services:

```bash
./manage-services.sh start
```

### Checking Service Status

To check the status of all services:

```bash
./manage-services.sh status
```

This will show whether each service is running and if the expected ports are in use.

### Stopping Services

To stop all services:

```bash
./manage-services.sh stop
```

Or use the simple stop script:

```bash
./stop-all-services.sh
```

## Troubleshooting

### Services Won't Start

1. Check if the required ports are already in use:
   ```bash
   lsof -i :3000
   lsof -i :3001
   lsof -i :1880
   ```

2. If ports are in use, you can kill the processes:
   ```bash
   kill -9 <PID>
   ```

### Services Won't Stop

1. Use the force stop option in the management script:
   ```bash
   ./manage-services.sh stop
   ```

2. If that doesn't work, manually kill the processes:
   ```bash
   pkill -f nodered-integration.js
   pkill -f node-red
   ```

### Port Already in Use

If you see "Port already in use" errors:

1. Find the process using the port:
   ```bash
   lsof -i :3001
   ```

2. Kill the process:
   ```bash
   kill -9 <PID>
   ```

3. Or change the port in the configuration.

## Best Practices

1. **Always stop services properly** before shutting down your computer
2. **Check service status** before starting to avoid conflicts
3. **Use the management scripts** for consistent service management
4. **Monitor logs** if services aren't behaving as expected
5. **Keep one terminal per service** for easier monitoring during development

## Customization

You can modify the management scripts to:

1. Add new services
2. Change port numbers
3. Add logging options
4. Include health checks
5. Add automatic restart on failure

The scripts are designed to be easily extensible for your specific needs.