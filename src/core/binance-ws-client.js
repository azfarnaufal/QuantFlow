const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const https = require('https');
const dns = require('dns');

class BinancePerpetualPriceTracker {
  constructor(storageType = 'memory') {
    this.ws = null;
    this.priceData = new Map();
    this.history = new Map();
    this.maxHistoryLength = 100;
    this.reconnectInterval = 5000;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Add periodic cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60000); // Run cleanup every minute
    
    // List of Binance WebSocket URLs to try
    this.wsUrls = [
      'wss://fstream.binance.com/ws',      // Primary perpetual futures
      'wss://fstream.binance.com/stream',  // Alternative perpetual futures
      'wss://dstream.binance.com/ws',      // Delivery futures
      'wss://dstream.binance.com/stream',  // Alternative delivery futures
      'wss://ws-api.binance.com/ws-api/v3' // General API
    ];
    this.currentUrlIndex = 0;
    
    // Add connection options to help with Docker networking
    this.wsOptions = {
      handshakeTimeout: 15000,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://www.binance.com'
      },
      // Add options for better Docker compatibility
      perMessageDeflate: false,
      // Add timeout options
      timeout: 15000
    };
    
    // Initialize storage
    if (storageType === 'timescaledb') {
      const TimescaleDBStorage = require('../storage/timescaledb-storage');
      this.storage = new TimescaleDBStorage();
    } else {
      const InMemoryStorage = require('../storage/memory-storage');
      this.storage = new InMemoryStorage();
    }
    
    this.subscribedSymbols = new Set();
  }

  // Rotate to the next WebSocket URL
  rotateWsUrl() {
    this.currentUrlIndex = (this.currentUrlIndex + 1) % this.wsUrls.length;
    console.log(`Rotating to URL ${this.currentUrlIndex + 1}/${this.wsUrls.length}: ${this.wsUrls[this.currentUrlIndex]}`);
    return this.wsUrls[this.currentUrlIndex];
  }

  // Test DNS resolution for a hostname
  testDnsResolution(hostname) {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, (err, address, family) => {
        if (err) {
          reject(err);
        } else {
          resolve({ address, family });
        }
      });
    });
  }

  // Test HTTPS connectivity to a URL
  testHttpsConnectivity(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'GET',
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        resolve({ statusCode: res.statusCode, headers: res.headers });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async connect() {
    const url = this.wsUrls[this.currentUrlIndex];
    console.log(`Connecting to Binance Perpetual Futures WebSocket at ${url}...`);
    
    // Test DNS resolution
    try {
      const parsedUrl = new URL(url);
      const dnsResult = await this.testDnsResolution(parsedUrl.hostname);
      console.log(`DNS resolution successful for ${parsedUrl.hostname}: ${dnsResult.address}`);
    } catch (dnsError) {
      console.error(`DNS resolution failed for ${url}:`, dnsError.message);
    }
    
    try {
      // Close existing connection if any
      if (this.ws) {
        this.ws.removeAllListeners();
        this.ws.close();
      }
      
      // Create new WebSocket connection with options
      this.ws = new WebSocket(url, this.wsOptions);
      
      this.ws.on('open', () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Resubscribe to all symbols
        for (const symbol of this.subscribedSymbols) {
          this.subscribeToSymbol(symbol);
        }
      });
      
      this.ws.on('message', (data) => {
        const messageStart = performance.now();
        try {
          const parsed = JSON.parse(data);
          
          // Handle different message types
          if (parsed.e === 'aggTrade') {
            // Aggregate trade data
            const symbol = parsed.s;
            const price = parseFloat(parsed.p);
            const timestamp = parsed.T;
            
            // Update price data
            this.priceData.set(symbol, {
              price,
              timestamp,
              volume: parseFloat(parsed.q)
            });
            
            // Add to history
            if (!this.history.has(symbol)) {
              this.history.set(symbol, []);
            }
            
            const history = this.history.get(symbol);
            history.push({ price, timestamp });
            
            // Maintain history length
            if (history.length > this.maxHistoryLength) {
              history.shift();
            }
            
            // Store in database
            // Validate data before storing
            if (timestamp && price && parsed.q) {
              this.storage.storePriceData(symbol, {
                timestamp: new Date(timestamp),
                price: price,
                volume: parseFloat(parsed.q)
              });
            } else {
              console.warn('Skipping storage due to invalid data:', { symbol, timestamp, price, volume: parsed.q });
            }
            
            // Performance monitoring
            const messageDuration = performance.now() - messageStart;
            if (messageDuration > 10) { // Log if processing takes more than 10ms
              console.log(`[PERFORMANCE] WebSocket message processing for ${symbol} took ${messageDuration.toFixed(2)}ms`);
            }
          } else if (parsed.result !== undefined && parsed.id !== undefined) {
            // This is a response to a subscription request
            console.log('Subscription response received:', parsed);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        console.error('Error details:', error);
        this.handleDisconnect();
      });
      
      this.ws.on('close', () => {
        console.log('WebSocket connection closed. Reconnecting...');
        this.handleDisconnect();
      });
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.handleDisconnect();
    }
  }
  
  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts), 30000);
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        // Try a different URL on reconnect attempts > 1
        if (this.reconnectAttempts > 1) {
          this.rotateWsUrl();
        }
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached. Please check your network connection.');
    }
  }
  
  subscribeToSymbol(symbol) {
    if (!this.ws) {
      console.error('WebSocket not connected');
      return;
    }
    
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not in OPEN state');
      return;
    }
    
    try {
      const subscriptionMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@aggTrade`],
        id: Date.now()
      };
      
      this.ws.send(JSON.stringify(subscriptionMessage));
      this.subscribedSymbols.add(symbol);
      console.log(`Subscribed to ${symbol} aggregate trades`);
    } catch (error) {
      console.error(`Error subscribing to ${symbol}:`, error);
    }
  }
  
  unsubscribeFromSymbol(symbol) {
    if (!this.ws) {
      console.error('WebSocket not connected');
      return;
    }
    
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not in OPEN state');
      return;
    }
    
    try {
      const unsubscriptionMessage = {
        method: 'UNSUBSCRIBE',
        params: [`${symbol.toLowerCase()}@aggTrade`],
        id: Date.now()
      };
      
      this.ws.send(JSON.stringify(unsubscriptionMessage));
      this.subscribedSymbols.delete(symbol);
      console.log(`Unsubscribed from ${symbol} aggregate trades`);
    } catch (error) {
      console.error(`Error unsubscribing from ${symbol}:`, error);
    }
  }
  
  async getLatestPriceData(symbol) {
    // Try to get from memory first
    if (this.priceData.has(symbol)) {
      return this.priceData.get(symbol);
    }
    
    // Fall back to database
    try {
      const data = await this.storage.getLatestPriceData(symbol);
      return data;
    } catch (error) {
      console.error(`Error getting latest price data for ${symbol}:`, error);
      return null;
    }
  }
  
  async getPriceHistory(symbol, limit = 100) {
    // Try to get from memory first
    if (this.history.has(symbol)) {
      const history = this.history.get(symbol);
      return history.slice(-limit);
    }
    
    // Fall back to database
    try {
      const history = await this.storage.getPriceHistory(symbol, limit);
      return history;
    } catch (error) {
      console.error(`Error getting price history for ${symbol}:`, error);
      return [];
    }
  }
  
  async getSummary() {
    const summary = {};
    
    // Get data for all subscribed symbols
    for (const symbol of this.subscribedSymbols) {
      const latestData = await this.getLatestPriceData(symbol);
      if (latestData) {
        summary[symbol] = latestData;
      }
    }
    
    return summary;
  }
  
  async close() {
    if (this.ws) {
      this.ws.close();
    }
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    await this.storage.close();
  }
  
  /**
   * Clean up old data from memory to prevent memory leaks
   */
  cleanupOldData() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour ago
    
    // Clean up old price data
    for (const [symbol, data] of this.priceData.entries()) {
      if (data.timestamp < oneHourAgo) {
        this.priceData.delete(symbol);
      }
    }
    
    // Clean up old history data
    for (const [symbol, history] of this.history.entries()) {
      // Keep only data from the last hour
      const recentHistory = history.filter(item => item.timestamp > oneHourAgo);
      if (recentHistory.length === 0) {
        this.history.delete(symbol);
      } else {
        this.history.set(symbol, recentHistory);
      }
    }
    
    console.log(`[MEMORY] Cleaned up old data. Current maps size: priceData=${this.priceData.size}, history=${Array.from(this.history.values()).reduce((sum, arr) => sum + arr.length, 0)}`);
  }
}

module.exports = BinancePerpetualPriceTracker;