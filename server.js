const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const BinancePerpetualPriceTracker = require('./src/core/binance-ws-client');
const fs = require('fs');

// Load Swagger specs
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

// Create price tracker instance with TimescaleDB storage
const priceTracker = new BinancePerpetualPriceTracker('timescaledb');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /prices:
 *   get:
 *     summary: Get latest prices for all tracked symbols
 *     description: Returns the latest price data for all cryptocurrency symbols being tracked
 *     responses:
 *       200:
 *         description: A JSON object containing price data for all symbols
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 BTCUSDT:
 *                   price: 45000.00
 *                   volume: 1000.50
 *                   timestamp: '2023-01-01T00:00:00.000Z'
 *       500:
 *         description: Internal server error
 */
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
 * /price/{symbol}:
 *   get:
 *     summary: Get latest price for a specific symbol
 *     description: Returns the latest price data for a specific cryptocurrency symbol
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Cryptocurrency symbol (e.g., BTCUSDT)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price data for the specified symbol
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 time:
 *                   type: string
 *                   format: date-time
 *                 symbol:
 *                   type: string
 *                 price:
 *                   type: number
 *                 volume:
 *                   type: number
 *       404:
 *         description: Symbol not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /history/{symbol}:
 *   get:
 *     summary: Get price history for a specific symbol
 *     description: Returns historical price data for a specific cryptocurrency symbol
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Cryptocurrency symbol (e.g., BTCUSDT)
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of records to return (default 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *     responses:
 *       200:
 *         description: Historical price data for the specified symbol
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   time:
 *                     type: string
 *                     format: date-time
 *                   symbol:
 *                     type: string
 *                   price:
 *                     type: number
 *                   volume:
 *                     type: number
 *       500:
 *         description: Internal server error
 */
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
 * /backtest/strategies:
 *   get:
 *     summary: Get available backtesting strategies
 *     description: Returns a list of all available backtesting strategies
 *     responses:
 *       200:
 *         description: List of available strategies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
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
  res.json(strategies);
});

/**
 * @swagger
 * /backtest/run:
 *   post:
 *     summary: Run a backtest
 *     description: Execute a backtest for a specific symbol using the specified strategy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: Cryptocurrency symbol to backtest
 *               strategy:
 *                 type: string
 *                 description: Strategy to use for backtesting
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Start date for backtesting period
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: End date for backtesting period
 *               initialCapital:
 *                 type: number
 *                 description: Initial capital for backtest (default 10000)
 *               options:
 *                 type: object
 *                 description: Strategy-specific options
 *             required:
 *               - symbol
 *               - strategy
 *               - startDate
 *               - endDate
 *     responses:
 *       200:
 *         description: Backtest results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symbol:
 *                   type: string
 *                 strategy:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                   format: date-time
 *                 endDate:
 *                   type: string
 *                   format: date-time
 *                 initialCapital:
 *                   type: number
 *                 finalCapital:
 *                   type: number
 *                 totalReturn:
 *                   type: number
 *                 totalTrades:
 *                   type: integer
 *                 winningTrades:
 *                   type: integer
 *                 losingTrades:
 *                   type: integer
 *                 winRate:
 *                   type: number
 *                 maxDrawdown:
 *                   type: number
 *                 sharpeRatio:
 *                   type: number
 *                 options:
 *                   type: object
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
app.post('/backtest/run', async (req, res) => {
  try {
    const { symbol, strategy, startDate, endDate, initialCapital, options } = req.body;
    
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
      sharpeRatio: 1.8,
      options: options || {}
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
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  
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