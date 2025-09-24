const WebSocket = require('ws');
const axios = require('axios');
const AIEngine = require('../ai-engine/ai-engine');

class FuturesTradingService {
  constructor() {
    this.wsBaseURL = 'wss://fstream.binance.com';
    this.restBaseURL = 'https://fapi.binance.com';
    this.ws = null;
    this.aiEngine = new AIEngine();
    
    // Market data storage
    this.marketData = new Map();
    this.positions = new Map();
    this.tradingHistory = [];
    
    // Configuration
    this.config = {
      symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      enableAutoTrading: false,
      riskManagement: true,
      maxPositionSize: 0.1,
      stopLossPercent: 0.05,
      takeProfitPercent: 0.15
    };
    
    console.log('Futures Trading Service initialized');
  }

  // Start the service
  async start() {
    try {
      // Initialize AI engine
      await this.aiEngine.initialize();
      
      // Connect to Binance Futures
      this.connect();
      
      console.log('Futures Trading Service started');
    } catch (error) {
      console.error('Error starting Futures Trading Service:', error);
    }
  }

  // Connect to Binance Futures WebSocket
  connect() {
    try {
      this.ws = new WebSocket(`${this.wsBaseURL}/stream`);
      
      this.ws.on('open', () => {
        console.log('Connected to Binance Futures WebSocket');
        this.config.reconnectAttempts = 0;
        
        // Subscribe to symbols
        this.subscribeToSymbols();
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMessage(message);
      });
      
      this.ws.on('error', (error) => {
        console.error('Binance Futures WebSocket error:', error);
      });
      
      this.ws.on('close', () => {
        console.log('Binance Futures WebSocket closed');
        this.handleReconnection();
      });
    } catch (error) {
      console.error('Error connecting to Binance Futures:', error);
      this.handleReconnection();
    }
  }

  // Handle message from WebSocket
  async handleMessage(message) {
    try {
      if (message.stream && message.data) {
        const streamType = message.stream.split('@')[1];
        const symbol = message.stream.split('@')[0].toUpperCase();
        
        switch (streamType) {
          case 'markPrice':
            await this.handleMarkPriceUpdate(symbol, message.data);
            break;
          case 'kline_1m':
            await this.handleKlineUpdate(symbol, message.data);
            break;
          case 'depth20':
            await this.handleOrderBookUpdate(symbol, message.data);
            break;
          case 'aggTrade':
            await this.handleTradeUpdate(symbol, message.data);
            break;
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Handle mark price updates
  async handleMarkPriceUpdate(symbol, data) {
    // Update market data
    const marketData = this.marketData.get(symbol) || {};
    marketData.markPrice = parseFloat(data.p);
    marketData.indexPrice = parseFloat(data.i);
    marketData.fundingRate = parseFloat(data.r);
    marketData.nextFundingTime = data.T;
    marketData.timestamp = Date.now();
    
    this.marketData.set(symbol, marketData);
    
    // Make AI prediction
    await this.makeAIPrediction(symbol, marketData);
  }

  // Handle kline updates
  async handleKlineUpdate(symbol, data) {
    const kline = data.k;
    
    // Update market data
    const marketData = this.marketData.get(symbol) || {};
    marketData.price = parseFloat(kline.c);
    marketData.open = parseFloat(kline.o);
    marketData.high = parseFloat(kline.h);
    marketData.low = parseFloat(kline.l);
    marketData.volume = parseFloat(kline.v);
    marketData.quoteVolume = parseFloat(kline.q);
    marketData.trades = kline.n;
    marketData.timestamp = kline.T;
    
    // Calculate technical indicators
    marketData.changePercent = ((marketData.price - marketData.open) / marketData.open) * 100;
    marketData.rsi = this.calculateRSI(symbol, marketData.price);
    marketData.vwap = this.calculateVWAP(symbol, marketData);
    
    this.marketData.set(symbol, marketData);
    
    // Make AI prediction
    await this.makeAIPrediction(symbol, marketData);
  }

  // Handle order book updates
  async handleOrderBookUpdate(symbol, data) {
    // Update market data
    const marketData = this.marketData.get(symbol) || {};
    marketData.bids = data.b.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]);
    marketData.asks = data.a.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]);
    marketData.lastUpdateId = data.u;
    marketData.timestamp = data.E;
    
    // Calculate order book metrics
    if (marketData.bids && marketData.bids.length > 0) {
      marketData.bidPrice = marketData.bids[0][0];
    }
    
    if (marketData.asks && marketData.asks.length > 0) {
      marketData.askPrice = marketData.asks[0][0];
    }
    
    if (marketData.bidPrice && marketData.askPrice) {
      marketData.spread = marketData.askPrice - marketData.bidPrice;
    }
    
    this.marketData.set(symbol, marketData);
  }

  // Handle trade updates
  async handleTradeUpdate(symbol, data) {
    // Update market data with recent trades
    const marketData = this.marketData.get(symbol) || {};
    marketData.lastTrade = {
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      timestamp: data.T,
      isBuyerMaker: data.m
    };
    
    this.marketData.set(symbol, marketData);
  }

  // Make AI prediction
  async makeAIPrediction(symbol, marketData) {
    try {
      // Get AI prediction
      const prediction = await this.aiEngine.predict(marketData);
      
      // Store prediction
      marketData.prediction = prediction;
      
      // Log prediction
      console.log(`${symbol}: ${prediction.action} (confidence: ${prediction.confidence.toFixed(3)})`);
      
      // Execute trade if auto-trading is enabled
      if (this.config.enableAutoTrading && prediction.confidence > 0.7) {
        await this.executeTrade(symbol, prediction);
      }
      
      // Add to decision history
      this.aiEngine.addDecisionToHistory({
        symbol,
        ...prediction
      });
    } catch (error) {
      console.error(`Error making AI prediction for ${symbol}:`, error);
    }
  }

  // Execute trade based on AI prediction
  async executeTrade(symbol, prediction) {
    try {
      // Risk management checks
      if (this.config.riskManagement) {
        const riskCheck = this.performRiskCheck(symbol, prediction);
        if (!riskCheck.allowed) {
          console.log(`Trade blocked for ${symbol}: ${riskCheck.reason}`);
          return;
        }
      }
      
      // Get current position
      const position = this.positions.get(symbol) || { size: 0, side: null, entryPrice: 0 };
      
      // Determine action based on prediction and current position
      let action = null;
      
      if (prediction.action === 'LONG' && position.side !== 'LONG') {
        action = 'BUY';
      } else if (prediction.action === 'SHORT' && position.side !== 'SHORT') {
        action = 'SELL';
      } else if (prediction.action === 'HOLD' && position.side !== null) {
        action = 'CLOSE';
      }
      
      if (action) {
        console.log(`Executing ${action} for ${symbol} based on AI prediction`);
        
        // In a real implementation, this would execute actual trades
        // For now, we'll just simulate the trade
        this.simulateTrade(symbol, action, prediction);
      }
    } catch (error) {
      console.error(`Error executing trade for ${symbol}:`, error);
    }
  }

  // Simulate trade execution
  simulateTrade(symbol, action, prediction) {
    const marketData = this.marketData.get(symbol);
    if (!marketData) return;
    
    const price = marketData.price || marketData.markPrice;
    if (!price) return;
    
    // Get current position
    let position = this.positions.get(symbol) || { size: 0, side: null, entryPrice: 0 };
    
    // Calculate position size (simplified)
    const accountSize = 10000; // Simulated account size
    const positionSize = accountSize * this.config.maxPositionSize;
    const quantity = positionSize / price;
    
    switch (action) {
      case 'BUY':
        position = {
          size: quantity,
          side: 'LONG',
          entryPrice: price,
          timestamp: Date.now()
        };
        break;
        
      case 'SELL':
        position = {
          size: quantity,
          side: 'SHORT',
          entryPrice: price,
          timestamp: Date.now()
        };
        break;
        
      case 'CLOSE':
        // Close position
        const pnl = this.calculatePositionPnL(position, price);
        console.log(`Closed ${position.side} position for ${symbol} at ${price}, PnL: ${pnl.toFixed(2)}`);
        
        position = { size: 0, side: null, entryPrice: 0 };
        break;
    }
    
    // Update position
    this.positions.set(symbol, position);
    
    // Add to trading history
    this.tradingHistory.push({
      symbol,
      action,
      price,
      quantity,
      position,
      prediction,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 trades
    if (this.tradingHistory.length > 1000) {
      this.tradingHistory.shift();
    }
  }

  // Perform risk check
  performRiskCheck(symbol, prediction) {
    // Check if we already have a position
    const position = this.positions.get(symbol);
    if (position && position.side !== null) {
      // Don't open new positions if we already have one
      return { allowed: false, reason: 'Already have open position' };
    }
    
    // Check overall portfolio risk
    let totalExposure = 0;
    for (const [sym, pos] of this.positions) {
      totalExposure += Math.abs(pos.size);
    }
    
    if (totalExposure > this.config.maxPositionSize * 5) { // Max 5 positions
      return { allowed: false, reason: 'Portfolio exposure limit reached' };
    }
    
    return { allowed: true, reason: 'Risk check passed' };
  }

  // Calculate position PnL
  calculatePositionPnL(position, currentPrice) {
    if (!position || position.size === 0) return 0;
    
    const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
    
    if (position.side === 'LONG') {
      return priceChange * position.size;
    } else if (position.side === 'SHORT') {
      return -priceChange * position.size;
    }
    
    return 0;
  }

  // Subscribe to symbols
  subscribeToSymbols() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      for (const symbol of this.config.symbols) {
        const lowerSymbol = symbol.toLowerCase();
        
        // Subscribe to multiple streams
        const streams = [
          `${lowerSymbol}@markPrice`,
          `${lowerSymbol}@kline_1m`,
          `${lowerSymbol}@depth20@100ms`,
          `${lowerSymbol}@aggTrade`
        ];
        
        const subscribeMessage = {
          method: 'SUBSCRIBE',
          params: streams,
          id: Date.now()
        };
        
        this.ws.send(JSON.stringify(subscribeMessage));
        console.log(`Subscribed to ${symbol} streams`);
      }
    }
  }

  // Calculate RSI
  calculateRSI(symbol, price) {
    // Simplified RSI calculation
    // In a real implementation, this would use historical price data
    return 50; // Neutral RSI
  }

  // Calculate VWAP
  calculateVWAP(symbol, marketData) {
    // Simplified VWAP calculation
    return marketData.price || 0;
  }

  // Handle reconnection
  handleReconnection() {
    if (this.config.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.config.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.config.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.config.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Get market data
  getMarketData(symbol = null) {
    if (symbol) {
      return this.marketData.get(symbol) || null;
    }
    return Object.fromEntries(this.marketData);
  }

  // Get positions
  getPositions() {
    return Object.fromEntries(this.positions);
  }

  // Get trading history
  getTradingHistory(limit = 50) {
    return this.tradingHistory.slice(-limit);
  }

  // Get AI engine performance
  getAIEnginePerformance() {
    return this.aiEngine.getModelPerformance();
  }

  // Get AI decision history
  getAIDecisionHistory(limit = 50) {
    return this.aiEngine.getDecisionHistory(limit);
  }

  // Close connection
  close() {
    if (this.ws) {
      this.ws.close();
    }
    console.log('Futures Trading Service stopped');
  }
}

module.exports = FuturesTradingService;