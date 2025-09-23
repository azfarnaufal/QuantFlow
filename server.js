const express = require('express');
const path = require('path');
const BinancePerpetualPriceTracker = require('./src/core/binance-ws-client');
const fs = require('fs');

// Load config file
let config;
try {
  // Try to load from src/config directory first (for development)
  const configPath = path.join(__dirname, 'src/config/config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to root directory (for Docker)
    const rootConfigPath = path.join(__dirname, 'config.json');
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
    serverPort: 3000,
    reconnectInterval: 5000,
    maxHistoryLength: 100
  };
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create price tracker instance with TimescaleDB storage
const priceTracker = new BinancePerpetualPriceTracker('timescaledb');

// API Routes

// Market Data Endpoints
app.get('/prices', async (req, res) => {
  try {
    const summary = await priceTracker.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting prices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/price/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await priceTracker.getLatestPriceData(symbol);
    
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
  } catch (error) {
    console.error('Error getting symbol data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/history/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 100;
    const history = await priceTracker.getPriceHistory(symbol, limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting price history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backtesting Engine Routes
app.get('/backtest/strategies', (req, res) => {
  const strategies = [
    { id: 'moving_average', name: 'Moving Average Crossover' },
    { id: 'rsi', name: 'RSI Reversal' },
    { id: 'macd', name: 'MACD Crossover' },
    { id: 'bollinger', name: 'Bollinger Bands' },
    { id: 'momentum', name: 'Momentum Strategy' },
    { id: 'mean_reversion', name: 'Mean Reversion Strategy' }
  ];
  res.json(strategies);
});

app.post('/backtest/run', async (req, res) => {
  try {
    const { symbol, strategy, startDate, endDate, initialCapital } = req.body;
    
    // Validate input
    if (!symbol || !strategy || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // For now, we'll return mock results
    // In a real implementation, this would run the actual backtest
    const mockResults = {
      symbol,
      strategy,
      startDate,
      endDate,
      initialCapital: initialCapital || 10000,
      finalCapital: 12500,
      totalReturn: 0.25,
      totalTrades: 42,
      winningTrades: 28,
      losingTrades: 14,
      winRate: 0.6667,
      maxDrawdown: 0.12,
      sharpeRatio: 1.8
    };
    
    res.json(mockResults);
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`QuantFlow server running at http://localhost:${PORT}`);
  
  // Connect to Binance WebSocket
  priceTracker.connect();
  
  // Subscribe to symbols from config after a short delay
  setTimeout(() => {
    console.log('Subscribing to symbols...');
    config.symbolsToTrack.forEach(symbol => {
      priceTracker.subscribeToSymbol(symbol);
    });
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down QuantFlow server gracefully...');
  await priceTracker.close();
  process.exit(0);
});

module.exports = app;