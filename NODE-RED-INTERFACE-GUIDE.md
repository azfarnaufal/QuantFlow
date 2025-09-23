# Node-RED Interface Guide

## Accessing Node-RED

1. Open your web browser
2. Navigate to: http://localhost:1880

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Menu  Deploy  ┌─────────────────────────────────────────────┐  │
│                │  Crypto Price Demo (Flow Tab)               │  │
│                └─────────────────────────────────────────────┘  │
│  ┌─────────────┐ ┌────────────────┐ ┌──────────────────────┐   │
│  │    Start    │ │  Get Prices    │ │    Raw Data          │   │
│  │  (Inject)   │ │(HTTP Request)  │ │     (Debug)          │   │
│  │             │ │                │ │                      │   │
│  │  Repeat:    │ │URL: http://loc.│ │  Debug output panel  │   │
│  │  10 sec     │ │alhost:3001/nod.│ │  on right side       │   │
│  └──────┬──────┘ └────────┬───────┘ └──────────────────────┘   │
│         │                 │                                    │
│         └─────────────────┘                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Formatted Data                        │   │
│  │                      (Debug)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Flow Components

### 1. Inject Node ("Start")
- Located on the left side of the flow
- Configured to trigger every 10 seconds
- Also triggers once when deployed

### 2. HTTP Request Node ("Get Prices")
- Middle node in the flow
- Configured to call: `http://localhost:3001/nodered/prices`
- Returns JSON data with crypto prices

### 3. Debug Nodes
- Right side of the flow
- "Raw Data" - Shows complete API response
- "Formatted Data" - Shows processed information

## Debug Panel

The debug panel on the right side shows live data:

```
Debug Panel Output:
───────────────────────────────────────────────────────────────────
10/23/2025, 6:08:55 AM
┌───────────────────────────────────────────────────────────────┐
│ msg.payload                                                   │
│ {                                                             │
│   "timestamp": "2025-09-23T06:08:55.043Z",                   │
│   "btc": {                                                    │
│     "price": 112722.1,                                        │
│     "volume": 126749.71                                       │
│   },                                                          │
│   "eth": {                                                    │
│     "price": 4189.9,                                          │
│     "volume": 4547322.68                                      │
│   }                                                           │
│ }                                                             │
└───────────────────────────────────────────────────────────────┘
───────────────────────────────────────────────────────────────────
```

## How to Interact

1. **Deploy the Flow**
   - Click the red "Deploy" button in the top right
   - Wait for the "Successfully deployed" message

2. **View Results**
   - Watch the debug panel for live updates every 10 seconds
   - New entries appear with current price data

3. **Manual Trigger**
   - Click the button on the left side of the "Start" inject node
   - This immediately triggers a data fetch

## Customization Options

1. **Change Polling Interval**
   - Double-click the "Start" inject node
   - Modify the "Repeat" value (in seconds)

2. **Add More Symbols**
   - Edit the function node to process additional symbols
   - Modify the JavaScript code in the function node

3. **Add Conditional Logic**
   - Add a "Switch" node to filter prices
   - Add a "Function" node to create alerts

4. **Add Notifications**
   - Install the telegrambot nodes
   - Add a Telegram sender node to the flow