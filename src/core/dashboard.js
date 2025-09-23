// Simple Web Dashboard for Crypto Price Tracker
const express = require('express');
const path = require('path');
const fs = require('fs');
const BinancePerpetualPriceTracker = require('./binance-ws-client');

// Load config file
let config;
try {
  // Try to load from src/config directory first (for development)
  const configPath = path.join(__dirname, '../config/config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to root directory (for Docker)
    const rootConfigPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(rootConfigPath)) {
      config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
    } else {
      // Final fallback to src/config directory with absolute path
      const absoluteConfigPath = path.join(process.cwd(), 'src/config/config.json');
      config = JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8'));
    }
  }
} catch (error) {
  console.error('Error loading config file:', error);
  // Use default config if file cannot be loaded
  config = {
    symbolsToTrack: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']
  };
}

const app = express();
const port = 3002;

// Create price tracker instance
const priceTracker = new BinancePerpetualPriceTracker();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Serve the dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for price data
app.get('/api/prices', (req, res) => {
  const summary = priceTracker.getSummary();
  res.json({
    timestamp: new Date().toISOString(),
    data: summary
  });
});

// API endpoint for price history
app.get('/api/history/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const history = priceTracker.getPriceHistory(symbol);
  res.json({
    symbol: symbol,
    history: history
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
  
  // Connect to Binance WebSocket
  priceTracker.connect();
  
  // Subscribe to symbols from config
  setTimeout(() => {
    console.log('Subscribing to symbols for dashboard...');
    config.symbolsToTrack.forEach(symbol => {
      priceTracker.subscribeToSymbol(symbol);
    });
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down dashboard server gracefully...');
  priceTracker.close();
  process.exit(0);
});