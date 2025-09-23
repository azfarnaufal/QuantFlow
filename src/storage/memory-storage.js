// Memory Storage Implementation
// Simple in-memory storage for price data

/**
 * Memory Storage
 * Simple in-memory storage implementation for price data
 */
class MemoryStorage {
  constructor() {
    this.priceData = new Map();
    this.historyData = new Map();
  }

  /**
   * Store price data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {Object} data - Price data
   */
  storePriceData(symbol, data) {
    // Store latest data
    this.priceData.set(symbol, data);
    
    // Store in history
    if (!this.historyData.has(symbol)) {
      this.historyData.set(symbol, []);
    }
    
    const history = this.historyData.get(symbol);
    history.push(data);
    
    // Keep only last 1000 data points to prevent memory issues
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get latest price data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} Latest price data
   */
  getLatestPriceData(symbol) {
    return this.priceData.get(symbol) || null;
  }

  /**
   * Get price history for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Array} Historical price data
   */
  getPriceHistory(symbol) {
    return this.historyData.get(symbol) || [];
  }

  /**
   * Get OHLC data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {number} interval - Time interval in minutes
   * @returns {Array} OHLC data
   */
  getOHLCData(symbol, interval = 60) {
    const history = this.getPriceHistory(symbol);
    if (history.length === 0) return [];
    
    const ohlcData = [];
    let currentCandle = null;
    
    history.forEach(data => {
      const time = new Date(data.timestamp);
      const intervalStart = new Date(Math.floor(time.getTime() / (interval * 60 * 1000)) * (interval * 60 * 1000));
      
      if (!currentCandle || currentCandle.time.getTime() !== intervalStart.getTime()) {
        if (currentCandle) {
          ohlcData.push(currentCandle);
        }
        
        currentCandle = {
          time: intervalStart,
          open: data.price,
          high: data.price,
          low: data.price,
          close: data.price,
          volume: data.volume
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, data.price);
        currentCandle.low = Math.min(currentCandle.low, data.price);
        currentCandle.close = data.price;
        currentCandle.volume += data.volume;
      }
    });
    
    if (currentCandle) {
      ohlcData.push(currentCandle);
    }
    
    return ohlcData;
  }

  /**
   * Get summary of all tracked symbols
   * @returns {Object} Summary of all tracked symbols
   */
  getSummary() {
    const summary = {};
    for (const [symbol, data] of this.priceData.entries()) {
      summary[symbol] = {
        price: data.price,
        volume: data.volume,
        timestamp: data.timestamp
      };
    }
    return summary;
  }

  /**
   * Get list of all tracked symbols
   * @returns {Array} List of symbols
   */
  getSymbols() {
    return Array.from(this.priceData.keys());
  }

  /**
   * Close storage connection (no-op for memory storage)
   */
  close() {
    // No cleanup needed for memory storage
  }
}

module.exports = MemoryStorage;