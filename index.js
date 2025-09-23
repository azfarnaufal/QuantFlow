const BinancePerpetualPriceTracker = require('./binance-ws-client');
const config = require('./config.json');

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