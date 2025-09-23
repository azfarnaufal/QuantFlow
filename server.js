const express = require('express');
const path = require('path');
const BinancePerpetualPriceTracker = require('./src/core/binance-ws-client');
const config = require('./config.json');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create price tracker instance with TimescaleDB storage
const priceTracker = new BinancePerpetualPriceTracker('timescaledb');

// API Routes

// Market Data Endpoints
app.get('/prices', async (req, res) => {
  try {
    const summary = await priceTracker.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting prices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/price/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await priceTracker.getLatestPriceData(symbol);
    
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
  } catch (error) {
    console.error('Error getting symbol data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/history/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 100;
    const history = await priceTracker.getPriceHistory(symbol, limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting price history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`QuantFlow server running at http://localhost:${PORT}`);
  
  // Connect to Binance WebSocket
  priceTracker.connect();
  
  // Subscribe to symbols from config after a short delay
  setTimeout(() => {
    console.log('Subscribing to symbols...');
    config.symbolsToTrack.forEach(symbol => {
      priceTracker.subscribeToSymbol(symbol);
    });
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down QuantFlow server gracefully...');
  await priceTracker.close();
  process.exit(0);
});

module.exports = app;
