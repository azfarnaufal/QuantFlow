const fs = require('fs');
const path = require('path');
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
    symbolsToTrack: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
    binanceWsUrl: 'wss://fstream.binance.com/ws',
    reconnectInterval: 5000
  };
}

// Create an instance of the price tracker
const priceTracker = new BinancePerpetualPriceTracker();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  priceTracker.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  priceTracker.close();
  process.exit(0);
});

// Connect to Binance WebSocket
priceTracker.connect();

// Subscribe to symbols from config
setTimeout(() => {
  console.log('Subscribing to symbols...');
  config.symbolsToTrack.forEach(symbol => {
    priceTracker.subscribeToSymbol(symbol);
  });
}, 1000);

console.log('Binance Perpetual Futures Price Tracker Started');
console.log('Tracking symbols:', config.symbolsToTrack.join(', '));
console.log('Press Ctrl+C to stop');