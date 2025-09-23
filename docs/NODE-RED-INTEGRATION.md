# Node-RED Integration Guide

This document provides detailed information about the Node-RED integration for the Crypto Price Tracker system.

## Overview

The Node-RED integration allows you to easily consume real-time cryptocurrency price data from Binance in your Node-RED flows. The integration consists of:

1. A dedicated Node-RED integration server (port 3001)
2. Correctly formatted API endpoints for Node-RED consumption
3. Example flows demonstrating how to use the integration

## Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│   Binance API   │◄──►│  Price Tracker App   │◄──►│   REST API       │
│ (WebSocket)     │    │ (binance-ws-client)  │    │ (Port 3000)      │
└─────────────────┘    └──────────────────────┘    └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Node-RED Server  │
                       │   (Port 3001)    │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Node-RED      │
                       │   (Port 1880)    │
                       └──────────────────┘
```

## How Node-RED Works

Node-RED is a flow-based programming tool that allows you to visually wire together different services and APIs. In our system:

1. **Node-RED** (port 1880) provides the visual programming interface
2. **Node-RED Integration Server** (port 3001) provides formatted data endpoints
3. **Flows** in Node-RED connect to these endpoints to consume real-time price data

### Data Flow Example

```
[Inject Node] → [HTTP Request Node] → [Function Node] → [Debug Node]
     (1)              (2)                  (3)              (4)

1. Inject Node: Triggers the flow (manually or on a schedule)
2. HTTP Request Node: Calls our API endpoint (http://localhost:3001/nodered/prices)
3. Function Node: Processes the data (extracts specific values, formats output)
4. Debug Node: Displays results in the debug panel
```

## Running the Integration

### 1. Start the Node-RED Integration Server

```bash
npm run nodered
```

This starts the dedicated Node-RED integration server on port 3001.

### 2. Start Node-RED (if not already running)

```bash
node-red
```

This starts Node-RED on its default port 1880.

## API Endpoints

The Node-RED integration server provides the following endpoints:

### GET /nodered/prices
Returns all tracked symbol prices in a format optimized for Node-RED consumption.

**Example Response:**
```json
{
  "timestamp": "2025-09-22T10:23:02.508Z",
  "symbols": 5,
  "data": {
    "BTCUSDT": {
      "price": 112576.7,
      "volume": 117084.53,
      "timestamp": "2025-09-22T10:23:02.508Z"
    },
    "ETHUSDT": {
      "price": 4166.46,
      "volume": 4874516.95,
      "timestamp": "2025-09-22T10:23:02.508Z"
    }
    // ... other symbols
  }
}
```

### GET /nodered/price/:symbol
Returns price data for a specific symbol.

**Example Response for /nodered/price/BTCUSDT:**
```json
{
  "symbol": "BTCUSDT",
  "price": 112576.7,
  "volume": 117084.53,
  "timestamp": "2025-09-22T10:23:02.508Z"
}
```

## Using the Example Flow

### 1. Import the Flow

1. Open Node-RED in your browser at http://localhost:1880
2. Click on the menu icon in the top right corner
3. Select "Import" → "Examples" → "Crypto Price Tracker"
4. Or, import the flow manually:
   - Copy the contents of `node-red-corrected-flow.json`
   - In Node-RED, click the menu icon → "Import" → "Clipboard"
   - Paste the JSON and click "Import"

### 2. Deploy the Flow

1. Click the "Deploy" button in the top right corner
2. The flow will start running automatically

### 3. View the Results

1. Open the debug panel on the right side of the Node-RED interface
2. You will see price updates every 5 seconds
3. If BTC price is above $100,000, you'll see a special message

## Flow Components Explained

### Inject Node
- Triggers the flow every 5 seconds
- Sends an empty payload to start the data retrieval

### HTTP Request Node
- Makes a GET request to `http://localhost:3001/nodered/prices`
- Returns the price data in `msg.payload`

### Function Node (BTC Price Check)
- Checks if BTC price is above $100,000
- If true, creates a message with the price alert
- If false, passes the message through unchanged

### Debug Node
- Displays the output in the debug panel
- Shows either the price alert or raw data

## Customizing the Flow

### Changing the Polling Interval

1. Double-click the "Every 5 seconds" inject node
2. Modify the "Repeat" value:
   - Enter a number for seconds (e.g., "30" for 30 seconds)
   - Or use cron syntax for more complex scheduling

### Adding More Price Checks

1. Add a new function node after the HTTP request node
2. Configure it to check other symbols:
   ```javascript
   if (msg.payload.data.ETHUSDT && msg.payload.data.ETHUSDT.price > 4000) {
       msg.payload = {
           text: `ETH price is above $4000! Current price: $${msg.payload.data.ETHUSDT.price}`
       };
       return [msg, null];
   } else {
       return [null, msg];
   }
   ```

### Adding Telegram Notifications

1. Install the Telegram nodes in Node-RED:
   - Menu → "Manage palette" → "Install"
   - Search for "node-red-contrib-telegrambot"
   - Install the package

2. Add a Telegram sender node to your flow:
   - Connect it to the output of your function node
   - Configure with your bot token and chat ID

## Testing the Integration

### Verify the Integration Server is Running

```bash
# Check if the server is responding
curl http://localhost:3001/nodered/prices

# Check specific symbol
curl http://localhost:3001/nodered/price/BTCUSDT

# Check formatted data
curl -s http://localhost:3001/nodered/prices | jq '{timestamp: .timestamp, symbols: .symbols, btc_price: .data.BTCUSDT.price}'
```

### Verify Node-RED is Accessible

```bash
# Check if Node-RED is running
curl -s http://localhost:1880 | head -5
```

## Troubleshooting

### Connection Refused Errors

1. Ensure the Node-RED integration server is running:
   ```bash
   npm run nodered
   ```

2. Check that the server is listening on port 3001:
   ```bash
   lsof -i :3001
   ```

### No Data in Debug Panel

1. Ensure the flow is deployed
2. Check that the inject node is enabled
3. Verify the HTTP request URL is correct
4. Check the Node-RED integration server logs for errors

### Price Data Format Issues

1. The data is nested under `msg.payload.data`
2. Access specific symbols like: `msg.payload.data.BTCUSDT.price`
3. Check the API response format with curl to understand the structure

## Extending the Integration

### Adding New Endpoints

You can extend the Node-RED integration server by adding new endpoints in `nodered-integration.js`:

```javascript
// Add a new endpoint for top gainers
app.get('/nodered/gainers', (req, res) => {
  const summary = priceTracker.getSummary();
  // Process data to find top gainers
  const gainers = findTopGainers(summary);
  res.json(gainers);
});
```

### Adding Authentication

To add basic authentication to the Node-RED endpoints:

```javascript
const basicAuth = require('express-basic-auth');

app.use('/nodered', basicAuth({
  users: { 'admin': 'supersecret' },
  challenge: true
}));
```

## Best Practices

1. **Polling Interval**: Don't set the polling interval too low to avoid overwhelming the server
2. **Error Handling**: Add error handling in your function nodes to gracefully handle API failures
3. **Data Processing**: Process data in function nodes rather than in multiple HTTP requests
4. **Flow Organization**: Use multiple tabs to organize different aspects of your price tracking
5. **Monitoring**: Use the debug panel to monitor your flows and identify issues

## Next Steps

1. Add more sophisticated price analysis in function nodes
2. Integrate with Telegram or Discord for notifications
3. Store price data in a database for historical analysis
4. Create a dashboard to visualize price movements
5. Add technical indicators (RSI, MACD, etc.) to your analysis