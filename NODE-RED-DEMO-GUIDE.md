# Node-RED Demo Guide

This guide will show you how Node-RED works with the crypto price tracking system.

## Prerequisites

Make sure the following services are running:
1. Node-RED integration server: `npm run nodered` (running on port 3001)
2. Node-RED: `node-red` (running on port 1880)

Both services are already running based on our previous setup.

## How Node-RED Works with Our System

Node-RED is a visual tool for wiring together hardware devices, APIs and online services. It uses a flow-based programming model where you connect nodes to create applications.

### Key Components

1. **Inject Node**: Triggers the flow (like a button press or timer)
2. **HTTP Request Node**: Makes requests to our price tracker API
3. **Function Node**: Processes data (JavaScript code)
4. **Debug Node**: Shows output in the debug panel

## Step-by-Step Demo

### Step 1: Access Node-RED Interface

1. Open your browser and go to: http://localhost:1880
2. You'll see the Node-RED editor with a blank canvas

### Step 2: Import the Demo Flow

1. In Node-RED, click on the menu icon (☰) in the top right
2. Select "Import" → "Examples" → "Crypto Price Demo"
3. Or import manually:
   - Copy the contents of `demo-flow.json`
   - Click the menu icon (☰) → "Import" → "Clipboard"
   - Paste the JSON and click "Import"

### Step 3: Understanding the Flow

The demo flow has these components:

```
[Inject] → [HTTP Request] → [Function] → [Debug]
                    ↓
               [Debug (Raw)]
```

1. **Inject Node** ("Get Prices"): 
   - Automatically triggers every 10 seconds
   - Sends an empty message to start the flow

2. **HTTP Request Node** ("Fetch Crypto Prices"):
   - Makes a GET request to `http://localhost:3001/nodered/prices`
   - Returns the price data in `msg.payload`

3. **Function Node** ("Parse Prices"):
   - Extracts BTC and ETH prices from the data
   - Formats the data for easier reading

4. **Debug Nodes**:
   - "Raw Data": Shows the original API response
   - "Formatted Data": Shows the processed data

### Step 4: Deploy the Flow

1. Click the red "Deploy" button in the top right corner
2. The flow will start running automatically

### Step 5: View the Results

1. Open the debug panel on the right side (click the bug icon if it's not visible)
2. You'll see price updates every 10 seconds:
   - Raw data shows the complete API response
   - Formatted data shows simplified price information

## How It Works Behind the Scenes

1. **Data Flow**:
   - Inject node sends a message every 10 seconds
   - HTTP request node calls our API at `http://localhost:3001/nodered/prices`
   - Our server responds with real-time price data from Binance
   - Function node processes the data into a simpler format
   - Debug nodes display the results

2. **Real-time Data**:
   - Our price tracker connects to Binance WebSocket API
   - It receives price updates multiple times per second
   - The Node-RED integration server exposes this data via HTTP endpoints
   - Node-RED polls these endpoints to get the latest prices

## Example Output

In the debug panel, you'll see messages like:

**Raw Data:**
```json
{
  "timestamp": "2025-09-22T10:25:10.662Z",
  "symbols": 5,
  "data": {
    "BTCUSDT": {
      "price": 112627.4,
      "volume": 117618.12,
      "timestamp": "2025-09-22T10:25:10.662Z"
    },
    // ... other symbols
  }
}
```

**Formatted Data:**
```json
{
  "timestamp": "2025-09-22T10:25:10.662Z",
  "btc": {
    "price": 112627.4,
    "volume": 117618.12
  },
  "eth": {
    "price": 4170.5,
    "volume": 4891645.11
  }
}
```

## Customizing the Flow

You can modify the flow in several ways:

1. **Change Polling Frequency**:
   - Double-click the "Get Prices" inject node
   - Modify the "Repeat" value (in seconds)

2. **Add More Cryptocurrencies**:
   - Edit the "Parse Prices" function node
   - Add more symbols like:
   ```javascript
   sol: {
       price: prices.SOLUSDT.price,
       volume: prices.SOLUSDT.volume
   }
   ```

3. **Add Conditional Logic**:
   - Add a new function node to check price conditions
   - For example, send an alert if BTC > $120,000

4. **Add Notifications**:
   - Install the Telegram node: Menu → "Manage palette" → "Install" → search for "telegram"
   - Add a Telegram sender node to send price alerts

## Why Use Node-RED?

1. **Visual Programming**: No need to write complex code
2. **Rapid Prototyping**: Quickly test ideas and integrations
3. **Extensible**: Thousands of nodes available for different services
4. **Real-time Processing**: Perfect for handling streaming data
5. **Easy Debugging**: Visual debug panel shows exactly what's happening

## Next Steps

1. Try modifying the demo flow to add more features
2. Explore other Node-RED nodes in the palette
3. Create your own flows for specific use cases
4. Integrate with other services (Telegram, email, databases)