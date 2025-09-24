const express = require('express');
const { mean, std } = require('mathjs');
const KafkaEventBus = require('../event-bus/kafka-client');

class AnalysisService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3003;
    this.eventBus = new KafkaEventBus();
    this.priceHistory = new Map(); // In-memory cache for price history
    this.indicators = new Map(); // Calculated indicators
  }

  async initialize() {
    // Connect to event bus
    await this.eventBus.connect();
    
    // Initialize Express middleware
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
    
    // Subscribe to market data events
    await this.subscribeToMarketData();
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        service: 'analysis',
        timestamp: new Date().toISOString()
      });
    });

    // Get technical indicators for a symbol
    this.app.get('/indicators/:symbol', (req, res) => {
      const symbol = req.params.symbol.toUpperCase();
      const indicators = this.indicators.get(symbol) || {};
      res.json({ symbol, indicators });
    });

    // Get correlation analysis
    this.app.get('/correlation', (req, res) => {
      const symbols = Array.from(this.priceHistory.keys());
      if (symbols.length < 2) {
        return res.json({ error: 'Not enough symbols for correlation analysis' });
      }
      
      const correlationMatrix = this.calculateCorrelationMatrix();
      res.json({
        symbols,
        correlationMatrix
      });
    });

    // Get price history for a symbol
    this.app.get('/history/:symbol', (req, res) => {
      const symbol = req.params.symbol.toUpperCase();
      const history = this.priceHistory.get(symbol) || [];
      res.json({ symbol, history });
    });
  }

  async subscribeToMarketData() {
    await this.eventBus.subscribe('market-data', async (data) => {
      if (data.eventType === 'trade') {
        this.updatePriceHistory(data);
        this.calculateIndicators(data.symbol);
      }
    });
  }

  updatePriceHistory(data) {
    if (!this.priceHistory.has(data.symbol)) {
      this.priceHistory.set(data.symbol, []);
    }
    
    const history = this.priceHistory.get(data.symbol);
    history.push({
      price: data.price,
      volume: data.volume,
      timestamp: data.timestamp
    });
    
    // Keep only last 1000 data points
    if (history.length > 1000) {
      history.shift();
    }
  }

  calculateIndicators(symbol) {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 14) return; // Need at least 14 data points for RSI
    
    // Calculate SMA
    const sma20 = this.calculateSMA(history, 20);
    const sma50 = this.calculateSMA(history, 50);
    
    // Calculate RSI
    const rsi = this.calculateRSI(history, 14);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(history, 20);
    
    // Store indicators
    if (!this.indicators.has(symbol)) {
      this.indicators.set(symbol, {});
    }
    
    this.indicators.get(symbol).sma20 = sma20;
    this.indicators.get(symbol).sma50 = sma50;
    this.indicators.get(symbol).rsi = rsi;
    this.indicators.get(symbol).volatility = volatility;
    
    // Publish analysis results
    this.eventBus.publish('analysis-results', {
      symbol,
      indicators: this.indicators.get(symbol),
      timestamp: Date.now()
    });
  }

  calculateSMA(history, period) {
    if (history.length < period) return null;
    
    const prices = history.slice(-period).map(item => item.price);
    return mean(prices);
  }

  calculateRSI(history, period) {
    if (history.length < period + 1) return null;
    
    const prices = history.slice(-(period + 1)).map(item => item.price);
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateVolatility(history, period) {
    if (history.length < period) return null;
    
    const prices = history.slice(-period).map(item => item.price);
    return std(prices);
  }

  calculateCorrelationMatrix() {
    const symbols = Array.from(this.priceHistory.keys());
    const matrix = Array(symbols.length).fill().map(() => Array(symbols.length).fill(0));
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const correlation = this.calculateCorrelation(
            this.priceHistory.get(symbols[i]), 
            this.priceHistory.get(symbols[j])
          );
          matrix[i][j] = correlation;
        }
      }
    }
    
    return matrix;
  }

  calculateCorrelation(history1, history2) {
    if (!history1 || !history2 || history1.length === 0 || history2.length === 0) {
      return 0;
    }
    
    // Use the minimum length of both histories
    const minLength = Math.min(history1.length, history2.length);
    const prices1 = history1.slice(-minLength).map(item => item.price);
    const prices2 = history2.slice(-minLength).map(item => item.price);
    
    // Calculate means
    const mean1 = mean(prices1);
    const mean2 = mean(prices2);
    
    // Calculate numerator and denominators
    let numerator = 0;
    let sumSquared1 = 0;
    let sumSquared2 = 0;
    
    for (let i = 0; i < minLength; i++) {
      const diff1 = prices1[i] - mean1;
      const diff2 = prices2[i] - mean2;
      numerator += diff1 * diff2;
      sumSquared1 += diff1 * diff1;
      sumSquared2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSquared1 * sumSquared2);
    
    // Avoid division by zero
    if (denominator === 0) {
      return 0;
    }
    
    return numerator / denominator;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Analysis Service running at http://localhost:${this.port}`);
    });
  }
}

// Initialize and start service
async function startService() {
  const service = new AnalysisService();
  await service.initialize();
  service.start();
}

startService().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Analysis Service...');
  process.exit(0);
});