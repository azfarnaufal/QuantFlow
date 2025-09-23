const WebSocket = require('ws');
const StorageFactory = require('../storage/storage-factory');
const fs = require('fs');
const path = require('path');

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
    binanceWsUrl: 'wss://fstream.binance.com/ws',
    symbolsToTrack: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    batchSize: 10,
    batchTimeout: 100
  };
}

// Binance Perpetual Futures WebSocket URL for ticker data
// Try alternative URLs if the primary one fails
const BINANCE_FUTURES_WS_URLS = [
  config.binanceWsUrl, // Primary: wss://fstream.binance.com/ws
  'wss://fstream.binance.com/stream', // Alternative 1
  'wss://dstream.binance.com/ws', // Alternative 2 (delivery futures)
  'wss://dstream.binance.com/stream' // Alternative 3 (delivery futures)
];

/**
 * Binance Perpetual Futures Price Tracker
 * Optimized WebSocket client for real-time price data ingestion
 */
class BinancePerpetualPriceTracker {
  /**
   * Create a new price tracker instance
   * @param {string} storageType - Type of storage to use ('memory' or 'timescaledb')
   */
  constructor(storageType = 'memory') {
    this.ws = null;
    this.reconnectInterval = config.reconnectInterval || 5000; // 5 seconds
    this.subscribedSymbols = new Set();
    this.storage = StorageFactory.createStorage(storageType);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.currentUrlIndex = 0;
    this.baseUrlIndex = 0;
    this.isConnecting = false;
    
    // Performance optimization: batch processing
    this.priceUpdateQueue = [];
    this.batchSize = config.batchSize || 10;
    this.batchTimeout = config.batchTimeout || 100; // ms
    this.batchTimer = null;
  }

  /**
   * Connect to Binance WebSocket with improved error handling
   */
  connect() {
    if (this.isConnecting) {
      console.log('Connection attempt already in progress, skipping...');
      return;
    }
    
    this.isConnecting = true;
    
    // Rotate through URLs if we've exhausted retries on current URL
    if (this.reconnectAttempts > 0 && this.reconnectAttempts % 3 === 0) {
      this.currentUrlIndex = (this.currentUrlIndex + 1) % BINANCE_FUTURES_WS_URLS.length;
      console.log(`Rotating to URL ${this.currentUrlIndex + 1}/${BINANCE_FUTURES_WS_URLS.length}: ${BINANCE_FUTURES_WS_URLS[this.currentUrlIndex]}`);
    }
    
    const currentUrl = BINANCE_FUTURES_WS_URLS[this.currentUrlIndex];
    console.log(`Connecting to Binance Perpetual Futures WebSocket at ${currentUrl}...`);
    
    // Add connection options to help with Docker networking
    const wsOptions = {
      handshakeTimeout: 15000,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://www.binance.com'
      }
    };
    
    try {
      this.ws = new WebSocket(currentUrl, wsOptions);
      
      this.ws.on('open', () => {
        console.log('Connected to Binance WebSocket');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.currentUrlIndex = this.baseUrlIndex;
        
        // Resubscribe to symbols if we had any
        if (this.subscribedSymbols.size > 0) {
          this.subscribedSymbols.forEach(symbol => {
            this.subscribeToSymbol(symbol);
          });
        }
      });

      this.ws.on('message', (data) => {
        try {
          const jsonData = JSON.parse(data);
          this.handleMessage(jsonData);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        console.error('Error details:', error);
        this.isConnecting = false;
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection closed. Reconnecting...');
        this.isConnecting = false;
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          // Exponential backoff with jitter
          const delay = Math.min(
            this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
            30000
          ) + Math.random() * 1000;
          
          console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
          setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          console.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Exiting.`);
          process.exit(1);
        }
      });
      
      this.ws.on('unexpected-response', (request, response) => {
        console.error('Unexpected response from server:', response.statusCode, response.statusMessage);
        this.isConnecting = false;
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        setTimeout(() => {
          this.connect();
        }, this.reconnectInterval);
      }
    }
  }

  /**
   * Subscribe to a symbol's ticker data
   * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
   */
  subscribeToSymbol(symbol) {
    const symbolLower = symbol.toLowerCase();
    this.subscribedSymbols.add(symbol);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        method: 'SUBSCRIBE',
        params: [`${symbolLower}@ticker`],
        id: Date.now()
      };
      
      this.ws.send(JSON.stringify(subscribeMsg));
      console.log(`Subscribed to ${symbol} ticker data`);
    }
  }

  /**
   * Handle incoming messages from WebSocket
   * @param {Object} data - WebSocket message data
   */
  handleMessage(data) {
    if (data.id) {
      console.log('Subscription confirmed:', data);
      return;
    }
    
    if (data.e === '24hrTicker') {
      const priceData = {
        symbol: data.s,
        price: parseFloat(data.c),
        volume: parseFloat(data.v),
        timestamp: new Date(data.E),
        priceChange: parseFloat(data.p),
        priceChangePercent: parseFloat(data.P)
      };
      
      // Queue for batch processing to improve performance
      this.priceUpdateQueue.push(priceData);
      
      // Process batch if queue is full
      if (this.priceUpdateQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        // Set timer to process remaining items
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.batchTimeout);
      }
    }
  }

  /**
   * Process batch of price updates for better performance
   */
  processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.priceUpdateQueue.length === 0) return;
    
    // Process all queued updates
    this.priceUpdateQueue.forEach(priceData => {
      this.storage.storePriceData(priceData.symbol, priceData);
      console.log(`[${priceData.timestamp.toLocaleTimeString()}] ${priceData.symbol}: $${priceData.price.toFixed(2)} | 24h Volume: ${priceData.volume.toFixed(2)}`);
    });
    
    // Clear queue
    this.priceUpdateQueue = [];
  }

  /**
   * Get latest price data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} Latest price data
   */
  getLatestPriceData(symbol) {
    return this.storage.getLatestPriceData(symbol);
  }

  /**
   * Get price history for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Array} Historical price data
   */
  getPriceHistory(symbol) {
    return this.storage.getPriceHistory(symbol);
  }

  /**
   * Get summary of all tracked symbols
   * @returns {Object} Summary of all tracked symbols
   */
  getSummary() {
    return this.storage.getSummary();
  }

  /**
   * Close the WebSocket connection
   */
  close() {
    // Process any remaining queued updates
    this.processBatch();
    
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.storage && typeof this.storage.close === 'function') {
      this.storage.close();
    }
  }
}

module.exports = BinancePerpetualPriceTracker;