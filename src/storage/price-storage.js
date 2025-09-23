// Simple in-memory storage for price data
// This will be replaced with TimescaleDB integration later

const config = require('./config.json');

class PriceStorage {
  constructor() {
    this.priceData = new Map(); // Store latest price data for each symbol
    this.priceHistory = new Map(); // Store historical data
    this.maxHistoryLength = config.maxHistoryLength; // Limit history to last 100 data points
  }

  // Store price data
  storePriceData(symbol, priceData) {
    // Store latest data
    this.priceData.set(symbol, priceData);
    
    // Store in history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const history = this.priceHistory.get(symbol);
    history.push({
      timestamp: priceData.timestamp,
      price: priceData.price,
      volume: priceData.volume
    });
    
    // Limit history length
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  // Get latest price data for a symbol
  getLatestPriceData(symbol) {
    return this.priceData.get(symbol);
  }

  // Get price history for a symbol
  getPriceHistory(symbol) {
    return this.priceHistory.get(symbol) || [];
  }

  // Get all symbols we're tracking
  getAllSymbols() {
    return Array.from(this.priceData.keys());
  }

  // Get formatted summary of all tracked symbols
  getSummary() {
    const symbols = this.getAllSymbols();
    const summary = {};
    
    symbols.forEach(symbol => {
      const data = this.getLatestPriceData(symbol);
      if (data) {
        summary[symbol] = {
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp
        };
      }
    });
    
    return summary;
  }
}

module.exports = PriceStorage;