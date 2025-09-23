// QuantFlow Node-RED Integration Module
// This script provides enhanced HTTP endpoints for Node-RED integration with QuantFlow platform

const express = require('express');
const BinancePerpetualPriceTracker = require('./binance-ws-client');
const config = require('./config.json');

// Create a simple Express app for Node-RED integration
const app = express();
const port = 3001; // Different port from the main server

// Create price tracker instance with memory storage (no persistence needed for Node-RED integration)
const priceTracker = new BinancePerpetualPriceTracker('memory');

// Middleware
app.use(express.json());

// Simple endpoint for Node-RED to poll
app.get('/nodered/prices', (req, res) => {
  try {
    const summary = priceTracker.getSummary();
    
    // Format data for easy consumption by Node-RED
    const formattedData = {
      timestamp: new Date().toISOString(),
      symbols: Object.keys(summary).length,
      data: summary
    };
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error getting price summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get specific symbol data
app.get('/nodered/price/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = priceTracker.getLatestPriceData(symbol);
    
    if (data) {
      res.json({
        symbol: symbol,
        price: data.price,
        volume: data.volume,
        timestamp: data.timestamp
      });
    } else {
      res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
  } catch (error) {
    console.error('Error getting symbol data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get technical indicators for a symbol
app.get('/nodered/indicators/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = priceTracker.getLatestPriceData(symbol);
    
    if (data) {
      // Return data that can be processed by Node-RED for technical analysis
      res.json({
        symbol: symbol,
        price: data.price,
        volume: data.volume,
        timestamp: data.timestamp,
        message: 'Data ready for technical analysis in Node-RED'
      });
    } else {
      res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
  } catch (error) {
    console.error('Error getting indicator data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/nodered/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'QuantFlow Node-RED integration server is running'
  });
});

// Start the Node-RED integration server
app.listen(port, () => {
  console.log(`QuantFlow Node-RED integration server running at http://localhost:${port}`);
  
  // Connect to Binance WebSocket
  priceTracker.connect();
  
  // Subscribe to symbols from config
  setTimeout(() => {
    console.log('Subscribing to symbols for Node-RED integration...');
    config.symbolsToTrack.forEach(symbol => {
      priceTracker.subscribeToSymbol(symbol);
    });
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down QuantFlow Node-RED integration server gracefully...');
  priceTracker.close();
  process.exit(0);
});

console.log('QuantFlow Node-RED integration server started. Use with Node-RED HTTP request nodes for enhanced workflow automation.');