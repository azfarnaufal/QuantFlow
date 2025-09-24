const { performance } = require('perf_hooks');
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
  // Check if a specific config file is specified via environment variable
  let configPath = process.env.CONFIG_FILE;
  
  if (configPath) {
    // If CONFIG_FILE is specified, use it
    // First check if it's an absolute path or relative to container root
    if (path.isAbsolute(configPath)) {
      configPath = configPath;
    } else {
      // Check if file exists at the specified path relative to working directory
      const absoluteConfigPath = path.join(process.cwd(), configPath);
      if (fs.existsSync(absoluteConfigPath)) {
        configPath = absoluteConfigPath;
      } else {
        // Fallback to path relative to __dirname
        configPath = path.join(__dirname, configPath);
      }
    }
  } else {
    // Try to load from src/config directory first (for development)
    configPath = path.join(__dirname, 'src/config/config.json');
  }
  
  if (fs.existsSync(configPath)) {
    console.log(`Loading config from: ${configPath}`);
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to root directory (for Docker)
    const rootConfigPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(rootConfigPath)) {
      console.log(`Loading config from: ${rootConfigPath}`);
      config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
    } else {
      // Final fallback to src/config directory with absolute path
      const absoluteConfigPath = path.join(process.cwd(), 'src/config/config.json');
      if (fs.existsSync(absoluteConfigPath)) {
        console.log(`Loading config from: ${absoluteConfigPath}`);
        config = JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8'));
      } else {
        console.log('No config file found, using default configuration');
        // Use default config if file cannot be loaded
        config = {
          binanceWsUrl: 'wss://fstream.binance.com/ws',
          symbolsToTrack: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
          serverPort: 3000,
          reconnectInterval: 5000,
          maxHistoryLength: 100
        };
      }
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
const PORT = process.env.PORT || config.serverPort || 3000;

console.log(`Configuration loaded:`, JSON.stringify(config, null, 2));
console.log(`Process environment CONFIG_FILE:`, process.env.CONFIG_FILE);
console.log(`Computed PORT:`, PORT);

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

// Apply performance monitoring middleware early to capture all requests
app.use(performanceMonitor);

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

// Symbols endpoint - return the symbols that should be tracked
app.get('/symbols', (req, res) => {
  const start = performance.now();
  try {
    const symbols = config.symbolsToTrack || ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] GET /symbols - 200 - ${duration.toFixed(2)}ms`);
    res.json({ symbols });
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /symbols - 500 - ${duration.toFixed(2)}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Market Data Endpoints
app.get('/prices', async (req, res) => {
  const start = performance.now();
  try {
    const summary = await priceTracker.getSummary();
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] GET /prices - 200 - ${duration.toFixed(2)}ms (${Object.keys(summary).length} symbols)`);
    res.json(summary);
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /prices - 500 - ${duration.toFixed(2)}ms`, error);
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
  const start = performance.now();
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    // Import technical indicators module
    const TechnicalIndicators = require('./src/utils/technical-indicators');
    
    // Get historical data for indicator calculation
    const history = await priceTracker.getPriceHistory(symbol, 100); // Get last 100 data points
    
    if (history.length === 0) {
      const duration = performance.now() - start;
      console.log(`[PERFORMANCE] GET /indicators/${symbol} - 404 - ${duration.toFixed(2)}ms`);
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Convert history to price array
    const prices = history.map(item => parseFloat(item.price)).reverse(); // Reverse to chronological order
    
    // Calculate all indicators
    const indicators = TechnicalIndicators.calculateAllIndicators(prices);
    
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] GET /indicators/${symbol} - 200 - ${duration.toFixed(2)}ms`);
    res.json({
      symbol,
      timestamp: new Date().toISOString(),
      indicators
    });
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /indicators/:symbol - 500 - ${duration.toFixed(2)}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/price/:symbol', async (req, res) => {
  const start = performance.now();
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await priceTracker.getLatestPriceData(symbol);
    
    if (data) {
      const duration = performance.now() - start;
      console.log(`[PERFORMANCE] GET /price/${symbol} - 200 - ${duration.toFixed(2)}ms`);
      res.json(data);
    } else {
      const duration = performance.now() - start;
      console.log(`[PERFORMANCE] GET /price/${symbol} - 404 - ${duration.toFixed(2)}ms`);
      res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /price/:symbol - 500 - ${duration.toFixed(2)}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/history/:symbol', async (req, res) => {
  const start = performance.now();
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 100;
    const history = await priceTracker.getPriceHistory(symbol, limit);
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] GET /history/${symbol} - 200 - ${duration.toFixed(2)}ms (${history.length} records)`);
    res.json(history);
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /history/:symbol - 500 - ${duration.toFixed(2)}ms`, error);
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
  const start = performance.now();
  try {
    const symbol = req.params.symbol.toUpperCase();
    const hours = parseInt(req.query.hours) || 24;
    
    // Get OHLC data from storage
    const ohlcData = await priceTracker.storage.getOHLCData(symbol, hours);
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] GET /chart/ohlc/${symbol} - 200 - ${duration.toFixed(2)}ms (${ohlcData.length} records)`);
    res.json(ohlcData);
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /chart/ohlc/:symbol - 500 - ${duration.toFixed(2)}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /correlation:
 *   get:
 *     summary: Get correlation analysis between assets
 *     description: Returns correlation matrix between multiple cryptocurrency symbols
 *     parameters:
 *       - in: query
 *         name: symbols
 *         required: false
 *         description: Comma-separated list of symbols (default all tracked symbols)
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         required: false
 *         description: Number of data points to analyze (default 100)
 *         schema:
 *           type: integer
 *           minimum: 10
 *           maximum: 1000
 *           default: 100
 *     responses:
 *       200:
 *         description: Correlation matrix
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symbols:
 *                   type: array
 *                   items:
 *                     type: string
 *                 correlationMatrix:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items:
 *                       type: number
 *       500:
 *         description: Internal server error
 */
app.get('/correlation', async (req, res) => {
  const start = performance.now();
  try {
    // Get symbols from query or use all tracked symbols
    const symbolsParam = req.query.symbols;
    const period = parseInt(req.query.period) || 100;
    
    let symbols;
    if (symbolsParam) {
      symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    } else {
      // Get all tracked symbols
      symbols = await priceTracker.storage.getSymbols();
    }
    
    if (symbols.length === 0) {
      const duration = performance.now() - start;
      console.log(`[PERFORMANCE] GET /correlation - 404 - ${duration.toFixed(2)}ms`);
      return res.status(404).json({ error: 'No symbols found' });
    }
    
    // Get price data for each symbol
    const priceData = {};
    for (const symbol of symbols) {
      const history = await priceTracker.getPriceHistory(symbol, period);
      if (history.length > 0) {
        // Convert to price array in chronological order
        priceData[symbol] = history.map(item => parseFloat(item.price)).reverse();
      }
    }
    
    // Calculate correlation matrix
    const correlationMatrix = calculateCorrelationMatrix(priceData);
    
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] GET /correlation - 200 - ${duration.toFixed(2)}ms (${Object.keys(priceData).length} symbols)`);
    res.json({
      symbols: Object.keys(priceData),
      correlationMatrix: correlationMatrix
    });
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] GET /correlation - 500 - ${duration.toFixed(2)}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate correlation matrix for multiple assets
 * @param {Object} priceData - Object with symbol as key and price array as value
 * @returns {Array} Correlation matrix
 */
function calculateCorrelationMatrix(priceData) {
  const symbols = Object.keys(priceData);
  const matrix = Array(symbols.length).fill().map(() => Array(symbols.length).fill(0));
  
  // Calculate correlations
  for (let i = 0; i < symbols.length; i++) {
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1.0; // Correlation with itself is 1
      } else {
        const correlation = calculateCorrelation(priceData[symbols[i]], priceData[symbols[j]]);
        matrix[i][j] = correlation;
      }
    }
  }
  
  return matrix;
}

/**
 * Calculate Pearson correlation coefficient
 * @param {Array} x - First data series
 * @param {Array} y - Second data series
 * @returns {number} Correlation coefficient
 */
function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
  const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  // Calculate numerator and denominators
  let numerator = 0;
  let sumSquaredX = 0;
  let sumSquaredY = 0;
  
  for (let i = 0; i < x.length; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSquaredX += diffX * diffX;
    sumSquaredY += diffY * diffY;
  }
  
  const denominator = Math.sqrt(sumSquaredX * sumSquaredY);
  
  // Avoid division by zero
  if (denominator === 0) {
    return 0;
  }
  
  return numerator / denominator;
}

// Backtesting Engine Routes

/**
 * @swagger
 * /strategy/compare:
 *   post:
 *     summary: Compare multiple trading strategies
 *     description: Run multiple strategies on the same data and compare their performance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: Cryptocurrency symbol to test strategies on
 *               strategies:
 *                 type: array
 *                 description: Array of strategy configurations
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Strategy name
 *                     options:
 *                       type: object
 *                       description: Strategy-specific options
 *               initialCapital:
 *                 type: number
 *                 description: Initial capital for backtesting
 *                 default: 10000
 *             required:
 *               - symbol
 *               - strategies
 *     responses:
 *       200:
 *         description: Strategy comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symbol:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
app.post('/strategy/compare', async (req, res) => {
  const start = performance.now();
  try {
    const { symbol, strategies, initialCapital } = req.body;
    
    // Validate input
    if (!symbol || !strategies || !Array.isArray(strategies)) {
      const duration = performance.now() - start;
      console.log(`[PERFORMANCE] POST /strategy/compare - 400 - ${duration.toFixed(2)}ms`);
      return res.status(400).json({ error: 'Missing required parameters: symbol and strategies array' });
    }
    
    // Import all strategy classes
    const MLStrategy = require('./src/strategies/ml-strategy');
    const PortfolioStrategy = require('./src/strategies/portfolio-strategy');
    const LSTMStrategy = require('./src/strategies/advanced-ml/lstm-strategy');
    const TransformerStrategy = require('./src/strategies/advanced-ml/transformer-strategy');
    const ReinforcementStrategy = require('./src/strategies/advanced-ml/reinforcement-strategy');
    const EnsembleStrategy = require('./src/strategies/advanced-ml/ensemble-strategy');
    
    // Get historical data for backtesting
    const history = await priceTracker.getPriceHistory(symbol, 1000); // Get last 1000 data points
    
    if (history.length === 0) {
      const duration = performance.now() - start;
      console.log(`[PERFORMANCE] POST /strategy/compare - 404 - ${duration.toFixed(2)}ms`);
      return res.status(404).json({ error: `No historical data found for symbol ${symbol}` });
    }
    
    // Convert history to price array
    const prices = history.map(item => parseFloat(item.price)).reverse(); // Reverse to chronological order
    
    // Run each strategy
    const comparisonResults = [];
    
    for (const strategyConfig of strategies) {
      const strategyStart = performance.now();
      const { name, options = {} } = strategyConfig;
      
      try {
        // Create strategy instance based on name
        let StrategyClass;
        let strategyInstance;
        
        switch (name) {
          case 'ml_strategy':
            StrategyClass = MLStrategy;
            strategyInstance = new StrategyClass(options);
            break;
          case 'portfolio_strategy':
            StrategyClass = PortfolioStrategy;
            strategyInstance = new StrategyClass(options);
            break;
          case 'lstm_strategy':
            StrategyClass = LSTMStrategy;
            strategyInstance = new StrategyClass(options);
            break;
          case 'transformer_strategy':
            StrategyClass = TransformerStrategy;
            strategyInstance = new StrategyClass(options);
            break;
          case 'reinforcement_strategy':
            StrategyClass = ReinforcementStrategy;
            strategyInstance = new StrategyClass(options);
            break;
          case 'ensemble_strategy':
            StrategyClass = EnsembleStrategy;
            strategyInstance = new StrategyClass(options);
            break;
          default:
            throw new Error(`Unsupported strategy: ${name}`);
        }
        
        // Run strategy
        let results;
        if (name === 'portfolio_strategy') {
          // For portfolio strategy, we need multi-asset data
          const multiAssetData = {};
          multiAssetData[symbol] = prices;
          results = strategyInstance.generateBacktest ? 
            strategyInstance.generateBacktest(multiAssetData) : 
            await strategyInstance.generateSignals(prices);
        } else {
          results = await strategyInstance.generateSignals(prices);
        }
        
        // Calculate performance metrics
        const metrics = calculateStrategyMetrics(results, initialCapital || 10000);
        
        const strategyDuration = performance.now() - strategyStart;
        comparisonResults.push({
          strategy: name,
          options: options,
          metrics: metrics,
          results: results,
          processingTime: strategyDuration.toFixed(2) + 'ms'
        });
      } catch (error) {
        console.error(`Error running strategy ${name}:`, error);
        const strategyDuration = performance.now() - strategyStart;
        comparisonResults.push({
          strategy: name,
          options: options,
          error: error.message,
          processingTime: strategyDuration.toFixed(2) + 'ms'
        });
      }
    }
    
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] POST /strategy/compare - 200 - ${duration.toFixed(2)}ms (${strategies.length} strategies)`);
    res.json({
      symbol,
      initialCapital: initialCapital || 10000,
      results: comparisonResults,
      totalTime: duration.toFixed(2) + 'ms'
    });
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERFORMANCE] POST /strategy/compare - 500 - ${duration.toFixed(2)}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate performance metrics for a strategy
 * @param {Object} results - Strategy results
 * @param {number} initialCapital - Initial capital
 * @returns {Object} Performance metrics
 */
function calculateStrategyMetrics(results, initialCapital) {
  const portfolio = results.portfolio || [];
  
  if (portfolio.length === 0) {
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0
    };
  }
  
  // Calculate total return
  const initialPortfolioValue = portfolio[0].portfolioValue || initialCapital;
  const finalPortfolioValue = portfolio[portfolio.length - 1].portfolioValue;
  const totalReturn = ((finalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100;
  
  // Calculate returns for each period
  const returns = [];
  for (let i = 1; i < portfolio.length; i++) {
    const previousValue = portfolio[i-1].portfolioValue;
    const currentValue = portfolio[i].portfolioValue;
    const periodReturn = (currentValue - previousValue) / previousValue;
    returns.push(periodReturn);
  }
  
  // Calculate Sharpe ratio (assuming risk-free rate of 0)
  if (returns.length === 0) {
    return {
      totalReturn: totalReturn,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0
    };
  }
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;
  
  // Calculate max drawdown
  let peak = portfolio[0].portfolioValue;
  let maxDrawdown = 0;
  
  for (let i = 1; i < portfolio.length; i++) {
    const value = portfolio[i].portfolioValue;
    if (value > peak) {
      peak = value;
    } else {
      const drawdown = ((peak - value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  // Calculate win rate
  const signals = results.signals || [];
  const trades = signals.filter(signal => signal.signal === 'BUY' || signal.signal === 'SELL');
  const winningTrades = trades.filter(trade => trade.signal === 'SELL' && trade.price > trades[trades.indexOf(trade) - 1]?.price);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(2)),
    totalTrades: trades.length
  };
}

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
    { id: 'portfolio_strategy', name: 'Portfolio Strategy' },
    { id: 'lstm_strategy', name: 'LSTM Strategy' },
    { id: 'transformer_strategy', name: 'Transformer Strategy' },
    { id: 'reinforcement_strategy', name: 'Reinforcement Learning Strategy' },
    { id: 'ensemble_strategy', name: 'Ensemble Strategy' }
  ];
  
  const features = {
    optimization: {
      endpoint: '/backtest/optimize',
      description: 'Parameter optimization for trading strategies',
      supportedStrategies: ['ml_strategy', 'portfolio_strategy', 'lstm_strategy', 'transformer_strategy', 'reinforcement_strategy', 'ensemble_strategy']
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
    const LSTMStrategy = require('./src/strategies/advanced-ml/lstm-strategy');
    const TransformerStrategy = require('./src/strategies/advanced-ml/transformer-strategy');
    const ReinforcementStrategy = require('./src/strategies/advanced-ml/reinforcement-strategy');
    const EnsembleStrategy = require('./src/strategies/advanced-ml/ensemble-strategy');
    
    // Create strategy instance based on request
    let StrategyClass;
    switch (strategy) {
      case 'ml_strategy':
        StrategyClass = MLStrategy;
        break;
      case 'portfolio_strategy':
        StrategyClass = PortfolioStrategy;
        break;
      case 'lstm_strategy':
        StrategyClass = LSTMStrategy;
        break;
      case 'transformer_strategy':
        StrategyClass = TransformerStrategy;
        break;
      case 'reinforcement_strategy':
        StrategyClass = ReinforcementStrategy;
        break;
      case 'ensemble_strategy':
        StrategyClass = EnsembleStrategy;
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
    const LSTMStrategy = require('./src/strategies/advanced-ml/lstm-strategy');
    const TransformerStrategy = require('./src/strategies/advanced-ml/transformer-strategy');
    const ReinforcementStrategy = require('./src/strategies/advanced-ml/reinforcement-strategy');
    const EnsembleStrategy = require('./src/strategies/advanced-ml/ensemble-strategy');
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
      case 'lstm_strategy':
        StrategyClass = LSTMStrategy;
        break;
      case 'transformer_strategy':
        StrategyClass = TransformerStrategy;
        break;
      case 'reinforcement_strategy':
        StrategyClass = ReinforcementStrategy;
        break;
      case 'ensemble_strategy':
        StrategyClass = EnsembleStrategy;
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

// Performance monitoring middleware
function performanceMonitor(req, res, next) {
  const start = performance.now();
  
  // Capture response finish to calculate duration
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`[PERFORMANCE] ${req.method} ${req.path} - ${res.statusCode} - ${duration.toFixed(2)}ms`);
  });
  
  next();
}

// Apply performance monitoring to all routes
app.use(performanceMonitor);

/**
 * @swagger
 * /performance/metrics:
 *   get:
 *     summary: Get system performance metrics
 *     description: Returns current system performance metrics including response times, cache hit rates, and database connection stats
 *     responses:
 *       200:
 *         description: Performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 memoryUsage:
 *                   type: object
 *                   description: Memory usage statistics
 *                 cacheStats:
 *                   type: object
 *                   description: Redis cache statistics
 *                 dbStats:
 *                   type: object
 *                   description: Database connection pool statistics
 *                 systemStats:
 *                   type: object
 *                   description: System-level statistics
 *       500:
 *         description: Internal server error
 */
app.get('/performance/metrics', async (req, res) => {
  try {
    // Get system metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Get system stats
    const systemStats = {
      cpuUsage: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };
    
    // Get cache stats if available
    let cacheStats = { enabled: false };
    if (priceTracker.storage.cache && priceTracker.storage.cache.isConnected) {
      cacheStats = {
        enabled: true,
        connected: priceTracker.storage.cache.isConnected,
        stats: priceTracker.storage.getCacheStats()
      };
    }
    
    // Get database pool stats
    let dbStats = { enabled: false };
    if (priceTracker.storage.pool) {
      const poolStats = priceTracker.storage.getPoolStats();
      dbStats = {
        enabled: true,
        pool: poolStats,
        // Add connection usage percentage
        usagePercentage: poolStats.totalCount > 0 ? 
          ((poolStats.totalCount - poolStats.idleCount) / poolStats.totalCount * 100).toFixed(2) + '%' : '0%'
      };
    }
    
    res.json({
      uptime,
      memoryUsage,
      cacheStats,
      dbStats,
      systemStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
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