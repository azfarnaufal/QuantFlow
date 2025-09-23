# Project Structure

```
crypto-price-tracker/
├── architecture-summary.md          # Overview of the implementation and how it fits into your stack
├── binance-ws-client.js             # Main WebSocket client for Binance perpetual futures
├── config.json                      # Configuration file for symbols, ports, intervals, etc.
├── GETTING-STARTED.md               # Instructions for setting up and running the project
├── huginn-example-config.txt        # Example configuration for Huginn integration
├── index.js                         # Simple WebSocket client runner
├── n8n-example-workflow.json        # Example n8n workflow for price alerts
├── node-red-example-flow.json       # Example Node-RED flow for price monitoring
├── package.json                     # Node.js project configuration and dependencies
├── package-lock.json                # Locked dependency versions
├── price-storage.js                 # In-memory storage implementation
├── README.md                        # Project overview and documentation
├── server.js                        # REST API server that exposes price data
├── storage-factory.js               # Factory for creating different storage implementations
├── timescaledb-storage.js           # TimescaleDB storage implementation (optional)
├── node_modules/                    # Installed dependencies (not included in version control)
└── .gitignore                       # Files and directories to ignore in version control
```

## Key Components

### Core Functionality
- **binance-ws-client.js**: The heart of the system, connecting to Binance WebSocket API and processing real-time price data
- **price-storage.js**: In-memory storage for current prices and history
- **server.js**: REST API server that allows other tools to access price data

### Configuration
- **config.json**: Centralized configuration for easy customization
- **package.json**: Project metadata and dependencies

### Integration Examples
- **n8n-example-workflow.json**: Example workflow showing how to integrate with n8n
- **huginn-example-config.txt**: Example configuration showing how to integrate with Huginn
- **node-red-example-flow.json**: Example flow showing how to integrate with Node-RED
- **timescaledb-storage.js**: Example implementation for persistent storage with TimescaleDB

### Documentation
- **README.md**: Main project documentation
- **architecture-summary.md**: Detailed overview of how the system fits into your planned stack
- **GETTING-STARTED.md**: Step-by-step instructions for setting up and running the project

This structure allows for easy extension and integration with the tools in your planned stack while maintaining a clean separation of concerns.