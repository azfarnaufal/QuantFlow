# Getting Started with Crypto Price Tracker

This document provides instructions on how to set up and run the crypto price tracking system.

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone or download the project files
2. Navigate to the project directory:
   ```bash
   cd crypto-price-tracker
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Edit the `config.json` file to customize:
- Symbols to track
- Server port
- Reconnection interval
- History length

Example configuration:
```json
{
  "binanceWsUrl": "wss://fstream.binance.com/ws",
  "symbolsToTrack": [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT"
  ],
  "serverPort": 3000,
  "reconnectInterval": 5000,
  "maxHistoryLength": 100
}
```

## Running the Application

### Option 1: WebSocket Client Only
```bash
npm start
```
This runs the WebSocket client that connects to Binance and logs price data to the console.

### Option 2: WebSocket Client with REST API
```bash
npm run server
```
This runs the WebSocket client and starts a REST API server on the configured port (default: 3000).

## API Endpoints

When running with the server option, the following endpoints are available:

- `GET /` - Health check and summary of tracked symbols
- `GET /prices` - Get latest price data for all tracked symbols
- `GET /prices/:symbol` - Get latest price data for a specific symbol
- `GET /history/:symbol` - Get price history for a specific symbol

## Integration with Other Tools

### Using with n8n
1. Import the workflow from `n8n-example-workflow.json`
2. Configure the HTTP request node to point to your server URL
3. Set up Telegram credentials if using Telegram notifications

### Using with Huginn
1. Create agents based on the configuration in `huginn-example-config.txt`
2. Update URLs to match your server address
3. Configure Telegram bot token and chat ID

### Using with Node-RED
1. Install Node-RED globally:
   ```bash
   npm install -g node-red
   ```
2. Start the Node-RED integration server:
   ```bash
   npm run nodered
   ```
3. In a separate terminal, start Node-RED:
   ```bash
   node-red
   ```
4. Access Node-RED at http://localhost:1880
5. Import the flow from `node-red-corrected-flow.json`
6. Deploy the flow and watch the debug panel for price updates

The Node-RED integration server runs on port 3001 and provides specific endpoints:
- `GET /nodered/prices` - Get all tracked symbol prices formatted for Node-RED
- `GET /nodered/price/:symbol` - Get specific symbol price

### Using with TimescaleDB (Advanced)
1. Install PostgreSQL with TimescaleDB extension
2. Create a database named `crypto_prices`
3. Update the connection parameters in `timescaledb-storage.js`
4. Run the server with TimescaleDB storage:
   ```bash
   STORAGE_TYPE=timescaledb npm run server
   ```

## Development

### Project Structure
- `binance-ws-client.js` - Main WebSocket client implementation
- `price-storage.js` - In-memory storage implementation
- `timescaledb-storage.js` - TimescaleDB storage implementation (optional)
- `server.js` - REST API server
- `index.js` - Simple WebSocket client runner
- `config.json` - Configuration file
- `storage-factory.js` - Factory for creating storage instances

### Adding New Symbols
1. Edit `config.json` and add symbols to the `symbolsToTrack` array
2. Restart the application

### Extending Functionality
1. Add new methods to the `BinancePerpetualPriceTracker` class
2. Extend the REST API in `server.js` with new endpoints
3. Implement additional storage options by extending the storage factory pattern

## Troubleshooting

### Connection Issues
- Check your internet connection
- Verify the Binance WebSocket URL in `config.json`
- Ensure no firewall is blocking WebSocket connections

### API Issues
- Verify the server is running
- Check that the port is not being used by another application
- Ensure the requested symbol is in your tracking list

### Performance
- Reduce the number of tracked symbols if experiencing performance issues
- Increase the `reconnectInterval` in `config.json` to reduce connection frequency
- Consider using TimescaleDB for better performance with large datasets

## Next Steps

1. Implement Telegram/Discord notifications
2. Add more sophisticated price analysis features
3. Deploy the application to a cloud server for 24/7 operation
4. Set up monitoring and alerting for the application itself
5. Add support for other exchanges