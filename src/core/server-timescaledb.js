// Server with TimescaleDB integration
const express = require('express');
const BinancePerpetualPriceTracker = require('./binance-ws-client');
const TimescaleDBStorage = require('./timescaledb-storage');
const config = require('./config.json');

const app = express();
const port = config.serverPort || 3000;

// Create price tracker and storage instances
const priceTracker = new BinancePerpetualPriceTracker();
const storage = new TimescaleDBStorage();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  const summary = priceTracker.getSummary();
  res.json({
    message: 'Crypto Price Tracker with TimescaleDB',
    status: 'running',
    symbolsTracked: Object.keys(summary).length,
    symbols: Object.keys(summary),
    timestamp: new Date().toISOString()
  });
});

// Get latest prices for all tracked symbols
app.get('/prices', (req, res) => {
  const summary = priceTracker.getSummary();
  res.json(summary);
});

// Get latest price for a specific symbol
app.get('/price/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const data = priceTracker.getLatestPriceData(symbol);
  
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: `No data found for symbol ${symbol}` });
  }
});

// Get price history for a specific symbol
app.get('/history/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const hours = req.query.hours || 24;
  
  try {
    const history = await storage.getPriceHistory(symbol, hours);
    res.json({
      symbol: symbol,
      history: history
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving price history' });
  }
});

// Get OHLC data for charting
app.get('/ohlc/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const interval = req.query.interval || '1 hour';
  const hours = req.query.hours || 24;
  
  try {
    const ohlcData = await storage.getOHLCData(symbol, interval, hours);
    res.json({
      symbol: symbol,
      interval: interval,
      data: ohlcData
    });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving OHLC data' });
  }
});

// Get all available symbols
app.get('/symbols', async (req, res) => {
  try {
    const symbols = await storage.getSymbols();
    res.json({ symbols });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving symbols' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Crypto Price Tracker with TimescaleDB running at http://localhost:${port}`);
  
  // Connect to Binance WebSocket
  priceTracker.connect();
  
  // Subscribe to symbols from config
  setTimeout(() => {
    console.log('Subscribing to symbols...');
    config.symbolsToTrack.forEach(symbol => {
      priceTracker.subscribeToSymbol(symbol);
    });
  }, 1000);
  
  // Store price data to TimescaleDB
  setInterval(() => {
    const summary = priceTracker.getSummary();
    for (const [symbol, data] of Object.entries(summary)) {
      storage.storePriceData(symbol, data);
    }
  }, 5000); // Store data every 5 seconds
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server gracefully...');
  priceTracker.close();
  await storage.close();
  process.exit(0);
});