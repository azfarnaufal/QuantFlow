const express = require('express');
const KafkaEventBus = require('../event-bus/kafka-client');

class TradingService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3004;
    this.eventBus = new KafkaEventBus();
    this.positions = new Map(); // Current positions
    this.portfolio = new Map(); // Portfolio values
    this.strategies = new Map(); // Active trading strategies
  }

  async initialize() {
    // Connect to event bus
    await this.eventBus.connect();
    
    // Initialize Express middleware
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
    
    // Subscribe to analysis results
    await this.subscribeToAnalysisResults();
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        service: 'trading',
        timestamp: new Date().toISOString()
      });
    });

    // Get current positions
    this.app.get('/positions', (req, res) => {
      const positions = Array.from(this.positions.entries()).map(([symbol, position]) => ({
        symbol,
        ...position
      }));
      res.json(positions);
    });

    // Get portfolio value
    this.app.get('/portfolio', (req, res) => {
      const portfolio = Array.from(this.portfolio.entries()).map(([symbol, value]) => ({
        symbol,
        value
      }));
      res.json({ portfolio, totalValue: Array.from(this.portfolio.values()).reduce((sum, val) => sum + val, 0) });
    });

    // Get active strategies
    this.app.get('/strategies', (req, res) => {
      const strategies = Array.from(this.strategies.entries()).map(([name, strategy]) => ({
        name,
        ...strategy
      }));
      res.json(strategies);
    });

    // Place a trade
    this.app.post('/trade', (req, res) => {
      const { symbol, action, quantity, price } = req.body;
      
      if (!symbol || !action || !quantity || !price) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const trade = {
        symbol,
        action,
        quantity,
        price,
        timestamp: Date.now()
      };
      
      // Execute trade logic
      this.executeTrade(trade);
      
      // Publish trade execution
      this.eventBus.publish('trade-execution', trade);
      
      res.json({ message: 'Trade executed', trade });
    });

    // Add a strategy
    this.app.post('/strategy', (req, res) => {
      const { name, config } = req.body;
      
      if (!name || !config) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      this.strategies.set(name, {
        config,
        active: true,
        createdAt: Date.now()
      });
      
      res.json({ message: 'Strategy added', name, config });
    });
  }

  async subscribeToAnalysisResults() {
    await this.eventBus.subscribe('analysis-results', async (data) => {
      // Process analysis results and potentially trigger trades
      this.processAnalysisResults(data);
    });
  }

  processAnalysisResults(data) {
    console.log(`Processing analysis results for ${data.symbol}`);
    
    // Example trading logic based on indicators
    const indicators = data.indicators;
    if (indicators.rsi && indicators.sma20 && indicators.sma50) {
      // Simple moving average crossover strategy
      if (indicators.sma20 > indicators.sma50 && indicators.rsi < 70) {
        // Bullish signal - consider buying
        console.log(`Bullish signal for ${data.symbol}: SMA20 > SMA50 and RSI < 70`);
      } else if (indicators.sma20 < indicators.sma50 && indicators.rsi > 30) {
        // Bearish signal - consider selling
        console.log(`Bearish signal for ${data.symbol}: SMA20 < SMA50 and RSI > 30`);
      }
    }
  }

  executeTrade(trade) {
    console.log(`Executing trade: ${trade.action} ${trade.quantity} ${trade.symbol} at ${trade.price}`);
    
    // Update positions
    if (!this.positions.has(trade.symbol)) {
      this.positions.set(trade.symbol, {
        quantity: 0,
        avgPrice: 0,
        pnl: 0
      });
    }
    
    const position = this.positions.get(trade.symbol);
    
    if (trade.action === 'BUY') {
      const totalCost = position.avgPrice * position.quantity + trade.price * trade.quantity;
      position.quantity += trade.quantity;
      position.avgPrice = totalCost / position.quantity;
    } else if (trade.action === 'SELL') {
      position.quantity -= trade.quantity;
      // Calculate PnL for sold portion
      const soldValue = trade.price * trade.quantity;
      const costBasis = position.avgPrice * trade.quantity;
      position.pnl += (soldValue - costBasis);
      
      if (position.quantity <= 0) {
        position.avgPrice = 0;
      }
    }
    
    // Update portfolio value (simplified)
    this.portfolio.set(trade.symbol, trade.price * position.quantity);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Trading Service running at http://localhost:${this.port}`);
    });
  }
}

// Initialize and start service
async function startService() {
  const service = new TradingService();
  await service.initialize();
  service.start();
}

startService().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Trading Service...');
  process.exit(0);
});