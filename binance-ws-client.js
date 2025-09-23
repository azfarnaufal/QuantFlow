const WebSocket = require('ws');
const StorageFactory = require('./storage-factory');
const config = require('./config.json');

// Binance Perpetual Futures WebSocket URL for ticker data
// Try alternative URLs if the primary one fails
const BINANCE_FUTURES_WS_URLS = [
  config.binanceWsUrl, // Primary: wss://fstream.binance.com/ws
  'wss://fstream.binance.com/stream', // Alternative 1
  'wss://dstream.binance.com/ws', // Alternative 2 (delivery futures)
  'wss://dstream.binance.com/stream' // Alternative 3 (delivery futures)
];

class BinancePerpetualPriceTracker {
  constructor(storageType = 'memory') {
    this.ws = null;
    this.reconnectInterval = config.reconnectInterval; // 5 seconds
    this.subscribedSymbols = new Set();
    this.storage = StorageFactory.createStorage(storageType); // Initialize storage
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.currentUrlIndex = 0; // Index for URL rotation
    this.baseUrlIndex = 0; // Base URL index for rotation
    this.isConnecting = false; // Flag to prevent multiple simultaneous connections
  }

  // Connect to Binance WebSocket with improved error handling
  connect() {
    // Prevent multiple simultaneous connection attempts
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
      handshakeTimeout: 15000, // Increase timeout
      followRedirects: true,
      // Add agent options for better SSL handling
      agent: undefined,
      // Add origin header to appear more like a browser
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
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.currentUrlIndex = this.baseUrlIndex; // Reset to base URL on success
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
            30000 // Max 30 seconds
          ) + Math.random() * 1000; // Add jitter
          
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
      // Try to reconnect
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        setTimeout(() => {
          this.connect();
        }, this.reconnectInterval);
      }
    }
  }

  // Subscribe to a symbol's ticker data
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

  // Handle incoming messages
  handleMessage(data) {
    // Handle subscription response
    if (data.id) {
      console.log('Subscription confirmed:', data);
      return;
    }
    
    // Handle ticker data
    if (data.e === '24hrTicker') {
      const priceData = {
        symbol: data.s,
        price: parseFloat(data.c), // Current price
        volume: parseFloat(data.v), // 24h volume
        timestamp: new Date(data.E),
        priceChange: parseFloat(data.p), // Price change
        priceChangePercent: parseFloat(data.P) // Price change percentage
      };
      
      this.onPriceUpdate(priceData);
    }
  }

  // Callback for when price data is received
  onPriceUpdate(priceData) {
    // Store the data
    this.storage.storePriceData(priceData.symbol, priceData);
    
    // Log the data
    console.log(`[${priceData.timestamp.toLocaleTimeString()}] ${priceData.symbol}: $${priceData.price.toFixed(2)} | 24h Volume: ${priceData.volume.toFixed(2)}`);
    
    // This is where you would integrate with your other systems (n8n, Huginn, etc.)
    // For now, we're just storing the data
  }

  // Get latest price data for a symbol
  getLatestPriceData(symbol) {
    return this.storage.getLatestPriceData(symbol);
  }

  // Get price history for a symbol
  getPriceHistory(symbol) {
    return this.storage.getPriceHistory(symbol);
  }

  // Get summary of all tracked symbols
  getSummary() {
    return this.storage.getSummary();
  }

  // Close the WebSocket connection
  close() {
    if (this.ws) {
      this.ws.close();
    }
    
    // Close storage connection if it has a close method
    if (this.storage && typeof this.storage.close === 'function') {
      this.storage.close();
    }
  }
}

module.exports = BinancePerpetualPriceTracker;