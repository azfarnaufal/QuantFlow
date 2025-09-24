const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const BinancePerpetualPriceTracker = require('./src/core/binance-ws-client');
const fs = require('fs');

// Load Swagger configuration
const swaggerSpecs = require('./src/config/swagger');

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

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const backtestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 backtest requests per windowMs
  message: {
    error: 'Too many backtest requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);
app.use('/prices', apiLimiter);
app.use('/price/', apiLimiter);
app.use('/history/', apiLimiter);
app.use('/backtest/', backtestLimiter);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger documentation endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Redirect root to Swagger UI
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Create price tracker instance with TimescaleDB storage
const priceTracker = new BinancePerpetualPriceTracker('timescaledb');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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

/**
 * @swagger
 * /indicators/{symbol}:
 *   get:
 *     summary: Get real-time technical indicators for a symbol
 *     description: Returns calculated technical indicators for a specific cryptocurrency symbol
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Cryptocurrency symbol (e.g., BTCUSDT)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Technical indicators for the specified symbol
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symbol:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 indicators:
 *                   type: object
 *       404:
 *         description: Symbol not found
 *       500:
 *         description: Internal server error
 */
app.get('/indicators/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    // Import technical indicators module
    const TechnicalIndicators = require('./src/utils/technical-indicators');
    
    // Get historical data for indicator calculation
    const history = await priceTracker.getPriceHistory(symbol, 100); // Get last 100 data points
    
    if (history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Convert history to price array
    const prices = history.map(item => parseFloat(item.price)).reverse(); // Reverse to chronological order
    
    // Calculate all indicators
    const indicators = TechnicalIndicators.calculateAllIndicators(prices);
    
    res.json({
      symbol,
      timestamp: new Date().toISOString(),
      indicators
    });
  } catch (error) {
    console.error('Error calculating indicators:', error);
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

/**
 * @swagger
 * /chart/ohlc/{symbol}:
 *   get:
 *     summary: Get OHLC data for charting
 *     description: Returns OHLC (Open, High, Low, Close) data for a specific cryptocurrency symbol
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Cryptocurrency symbol (e.g., BTCUSDT)
 *         schema:
 *           type: string
 *       - in: query
 *         name: hours
 *         required: false
 *         description: Number of hours of data to retrieve (default 24)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *     responses:
 *       200:
 *         description: OHLC data for charting
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   bucket:
 *                     type: string
 *                     format: date-time
 *                   open:
 *                     type: number
 *                   high:
 *                     type: number
 *                   low:
 *                     type: number
 *                   close:
 *                     type: number
 *                   volume:
 *                     type: number
 *       500:
 *         description: Internal server error
 */
app.get('/chart/ohlc/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const hours = parseInt(req.query.hours) || 24;
    
    // Get OHLC data from storage
    const ohlcData = await priceTracker.storage.getOHLCData(symbol, hours);
    res.json(ohlcData);
  } catch (error) {
    console.error('Error getting OHLC data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backtesting Engine Routes

/**
 * @swagger
 * /data/import:
 *   post:
 *     summary: Import historical price data
 *     description: Import historical price data for a specific symbol
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: Cryptocurrency symbol (e.g., BTCUSDT)
 *               data:
 *                 type: array
 *                 description: Array of price data objects
 *                 items:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     price:
 *                       type: number
 *                     volume:
 *                       type: number
 *             required:
 *               - symbol
 *               - data
 *     responses:
 *       200:
 *         description: Data import successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imported:
 *                   type: integer
 *                 symbol:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
app.post('/data/import', async (req, res) => {
  try {
    const { symbol, data } = req.body;
    
    // Validate input
    if (!symbol || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Missing required parameters: symbol and data array' });
    }
    
    // Import data
    let importedCount = 0;
    for (const item of data) {
      try {
        await priceTracker.storage.storePriceData(symbol, {
          timestamp: new Date(item.timestamp),
          price: parseFloat(item.price),
          volume: parseFloat(item.volume)
        });
        importedCount++;
      } catch (error) {
        console.error(`Error importing data point:`, error);
        // Continue with other data points
      }
    }
    
    res.json({
      imported: importedCount,
      symbol,
      message: `Successfully imported ${importedCount} data points for ${symbol}`
    });
  } catch (error) {
    console.error('Error importing data:', error);
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
    { id: 'mean_reversion', name: 'Mean Reversion Strategy' },
    { id: 'ml_strategy', name: 'Machine Learning Strategy' },
    { id: 'portfolio_strategy', name: 'Portfolio Strategy' }
  ];
  
  const features = {
    optimization: {
      endpoint: '/backtest/optimize',
      description: 'Parameter optimization for trading strategies',
      supportedStrategies: ['ml_strategy', 'portfolio_strategy']
    }
  };
  
  res.json({ strategies, features });
});

app.post('/backtest/run', async (req, res) => {
  try {
    const { symbol, strategy, startDate, endDate, initialCapital, options } = req.body;
    
    // Validate input
    if (!symbol || !strategy || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Import strategies
    const MLStrategy = require('./src/strategies/ml-strategy');
    const PortfolioStrategy = require('./src/strategies/portfolio-strategy');
    
    // Create strategy instance based on request
    let StrategyClass;
    switch (strategy) {
      case 'ml_strategy':
        StrategyClass = MLStrategy;
        break;
      case 'portfolio_strategy':
        StrategyClass = PortfolioStrategy;
        break;
      default:
        return res.status(400).json({ error: `Unsupported strategy: ${strategy}` });
    }
    
    // Get historical data for backtesting
    const history = await priceTracker.getPriceHistory(symbol, 1000); // Get last 1000 data points
    
    if (history.length === 0) {
      return res.status(404).json({ error: `No historical data found for symbol ${symbol}` });
    }
    
    // Convert history to price array
    const prices = history.map(item => parseFloat(item.price)).reverse(); // Reverse to chronological order
    
    // Create strategy instance
    const strategyInstance = new StrategyClass(options);
    
    // Run backtest
    let results;
    if (strategy === 'portfolio_strategy') {
      // For portfolio strategy, we need multi-asset data
      const multiAssetData = {};
      multiAssetData[symbol] = prices;
      results = strategyInstance.generateBacktest(multiAssetData);
    } else {
      // For single asset strategies
      results = strategyInstance.generateSignals(prices);
    }
    
    // Calculate performance metrics
    const backtestResults = {
      symbol,
      strategy,
      startDate,
      endDate,
      initialCapital: initialCapital || 10000,
      options: options || {},
      results: results
    };
    
    res.json(backtestResults);
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /backtest/optimize:
 *   post:
 *     summary: Optimize strategy parameters
 *     description: Find optimal parameters for a trading strategy using historical data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: Cryptocurrency symbol to optimize strategy for
 *               strategy:
 *                 type: string
 *                 description: Strategy to optimize
 *               parameterRanges:
 *                 type: object
 *                 description: Parameter ranges to optimize
 *               objective:
 *                 type: string
 *                 description: Optimization objective (return, sharpe, drawdown)
 *                 default: sharpe
 *               maxIterations:
 *                 type: integer
 *                 description: Maximum number of optimization iterations
 *                 default: 100
 *             required:
 *               - symbol
 *               - strategy
 *               - parameterRanges
 *     responses:
 *       200:
 *         description: Optimization results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bestParameters:
 *                   type: object
 *                 bestMetrics:
 *                   type: object
 *                 allResults:
 *                   type: array
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
app.post('/backtest/optimize', async (req, res) => {
  try {
    const { symbol, strategy, parameterRanges, objective, maxIterations } = req.body;
    
    // Validate input
    if (!symbol || !strategy || !parameterRanges) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Import strategies and optimizer
    const MLStrategy = require('./src/strategies/ml-strategy');
    const PortfolioStrategy = require('./src/strategies/portfolio-strategy');
    const StrategyOptimizer = require('./src/strategies/strategy-optimizer');
    
    // Create strategy instance based on request
    let StrategyClass;
    switch (strategy) {
      case 'ml_strategy':
        StrategyClass = MLStrategy;
        break;
      case 'portfolio_strategy':
        StrategyClass = PortfolioStrategy;
        break;
      default:
        return res.status(400).json({ error: `Unsupported strategy: ${strategy}` });
    }
    
    // Get historical data for optimization
    const history = await priceTracker.getPriceHistory(symbol, 1000); // Get last 1000 data points
    
    if (history.length === 0) {
      return res.status(404).json({ error: `No historical data found for symbol ${symbol}` });
    }
    
    // Convert history to price array
    const prices = history.map(item => parseFloat(item.price)).reverse(); // Reverse to chronological order
    
    // Create strategy instance with default parameters
    const strategyInstance = new StrategyClass();
    
    // Create data object for optimizer
    const data = {};
    data[symbol] = prices;
    
    // Create optimizer
    const optimizer = new StrategyOptimizer(strategyInstance, data, parameterRanges);
    
    // Run optimization
    const optimizationResults = await optimizer.optimize(objective, maxIterations);
    
    res.json(optimizationResults);
  } catch (error) {
    console.error('Error running optimization:', error);
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