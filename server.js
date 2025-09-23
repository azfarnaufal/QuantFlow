const express = require('express');
const BinancePerpetualPriceTracker = require('./binance-ws-client');
const config = require('./config.json');
// Use TimescaleDB as default storage
const storageType = process.env.STORAGE_TYPE || 'timescaledb';
const StorageFactory = require('./storage-factory');

// Alert system
const PriceAlertSystem = require('./price-alert-system');
const alertsConfig = require('./alerts-config.json');

const app = express();
const port = config.serverPort || 3000;

// Create price tracker with the specified storage type
const priceTracker = new BinancePerpetualPriceTracker(storageType);
// Create a single storage instance for API endpoints
const storage = StorageFactory.createStorage(storageType);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', async (req, res) => {
  // For TimescaleDB storage, we need to get summary differently
  if (storageType === 'timescaledb') {
    try {
      // Connect if not already connected
      if (!storage.client._connected) {
        await storage.connect();
      }
      res.json({
        message: 'Crypto Price Tracker',
        status: 'running',
        storage: storageType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Error connecting to storage' });
    }
  } else {
    const summary = priceTracker.getSummary();
    res.json({
      message: 'Crypto Price Tracker',
      status: 'running',
      storage: storageType,
      symbolsTracked: Object.keys(summary).length,
      symbols: Object.keys(summary),
      timestamp: new Date().toISOString()
    });
  }
});

// Get latest prices for all tracked symbols
app.get('/prices', async (req, res) => {
  // For TimescaleDB storage, we need to get summary from storage
  if (storageType === 'timescaledb') {
    try {
      // Connect if not already connected
      if (!storage.client._connected) {
        await storage.connect();
      }
      const summary = await storage.getSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving price data' });
    }
  } else {
    const summary = priceTracker.getSummary();
    res.json(summary);
  }
});

// Get latest price for a specific symbol
app.get('/price/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  
  // For TimescaleDB storage, we need to get data from storage
  if (storageType === 'timescaledb') {
    try {
      // Connect if not already connected
      if (!storage.client._connected) {
        await storage.connect();
      }
      const data = await storage.getLatestPriceData(symbol);
      
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ error: `No data found for symbol ${symbol}` });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving price data' });
    }
  } else {
    const data = priceTracker.getLatestPriceData(symbol);
    
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
  }
});

// Get OHLC data for charting
app.get('/ohlc/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const interval = req.query.interval || '1 hour';
  const hours = parseInt(req.query.hours) || 24;
  
  // For TimescaleDB storage, we can get OHLC data
  if (storageType === 'timescaledb') {
    try {
      // Connect if not already connected
      if (!storage.client._connected) {
        await storage.connect();
      }
      const ohlcData = await storage.getOHLCData(symbol, interval, hours);
      res.json({
        symbol: symbol,
        interval: interval,
        hours: hours,
        data: ohlcData
      });
    } catch (error) {
      console.error('Error retrieving OHLC data:', error);
      res.status(500).json({ error: 'Error retrieving OHLC data' });
    }
  } else {
    res.status(400).json({ error: 'OHLC data only available with TimescaleDB storage' });
  }
});

// Get price history for a specific symbol
app.get('/history/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const hours = parseInt(req.query.hours) || 24;
  
  // For TimescaleDB storage, we can get history data
  if (storageType === 'timescaledb') {
    try {
      // Connect if not already connected
      if (!storage.client._connected) {
        await storage.connect();
      }
      const history = await storage.getPriceHistory(symbol, hours);
      res.json({
        symbol: symbol,
        hours: hours,
        data: history
      });
    } catch (error) {
      console.error('Error retrieving history data:', error);
      res.status(500).json({ error: 'Error retrieving history data' });
    }
  } else {
    res.status(400).json({ error: 'History data only available with TimescaleDB storage' });
  }
});

// Get all available symbols
app.get('/symbols', async (req, res) => {
  // For TimescaleDB storage, we can get all symbols
  if (storageType === 'timescaledb') {
    try {
      // Connect if not already connected
      if (!storage.client._connected) {
        await storage.connect();
      }
      const symbols = await storage.getSymbols();
      res.json({ symbols });
    } catch (error) {
      console.error('Error retrieving symbols:', error);
      res.status(500).json({ error: 'Error retrieving symbols' });
    }
  } else {
    res.status(400).json({ error: 'Symbols data only available with TimescaleDB storage' });
  }
});

// Alert management endpoints
// Get all alerts
app.get('/alerts', (req, res) => {
  res.json({ alerts: alertsConfig.alerts });
});

// Add a new price threshold alert
app.post('/alerts/price', (req, res) => {
  const { symbol, type, threshold, channels } = req.body;
  
  if (!symbol || !type || !threshold) {
    return res.status(400).json({ error: 'Missing required fields: symbol, type, threshold' });
  }
  
  if (type !== 'above' && type !== 'below') {
    return res.status(400).json({ error: 'Type must be either "above" or "below"' });
  }
  
  const newAlert = {
    symbol,
    type,
    threshold: parseFloat(threshold),
    enabled: true,
    channels: channels || ['telegram']
  };
  
  alertsConfig.alerts.push(newAlert);
  
  res.status(201).json({ 
    message: 'Price alert added successfully',
    alert: newAlert
  });
});

// Add a new indicator-based alert
app.post('/alerts/indicator', (req, res) => {
  const { symbol, indicator, condition, threshold, channels } = req.body;
  
  if (!symbol || !indicator || !condition || !threshold) {
    return res.status(400).json({ error: 'Missing required fields: symbol, indicator, condition, threshold' });
  }
  
  if (condition !== 'above' && condition !== 'below') {
    return res.status(400).json({ error: 'Condition must be either "above" or "below"' });
  }
  
  const newAlert = {
    symbol,
    type: 'indicator',
    indicator,
    condition,
    threshold: parseFloat(threshold),
    enabled: true,
    channels: channels || ['telegram']
  };
  
  alertsConfig.alerts.push(newAlert);
  
  res.status(201).json({ 
    message: 'Indicator alert added successfully',
    alert: newAlert
  });
});

// Remove an alert
app.delete('/alerts/:symbol/:type/:threshold', (req, res) => {
  const { symbol, type, threshold } = req.params;
  const indicator = req.query.indicator;
  const condition = req.query.condition;
  
  const index = alertsConfig.alerts.findIndex(
    alert => alert.symbol === symbol && 
             alert.type === type && 
             alert.threshold === parseFloat(threshold) &&
             (indicator ? alert.indicator === indicator : true) &&
             (condition ? alert.condition === condition : true)
  );
  
  if (index === -1) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  alertsConfig.alerts.splice(index, 1);
  
  res.json({ message: 'Alert removed successfully' });
});

// Update alert status
app.put('/alerts/:symbol/:type/:threshold', (req, res) => {
  const { symbol, type, threshold } = req.params;
  const indicator = req.query.indicator;
  const condition = req.query.condition;
  const { enabled, channels } = req.body;
  
  const alert = alertsConfig.alerts.find(
    alert => alert.symbol === symbol && 
             alert.type === type && 
             alert.threshold === parseFloat(threshold) &&
             (indicator ? alert.indicator === indicator : true) &&
             (condition ? alert.condition === condition : true)
  );
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  if (enabled !== undefined) {
    alert.enabled = Boolean(enabled);
  }
  
  if (channels !== undefined) {
    alert.channels = channels;
  }
  
  res.json({ 
    message: 'Alert updated successfully',
    alert: alert
  });
});

// Get scheduled reports configuration
app.get('/alerts/reports', (req, res) => {
  res.json({ 
    scheduledReports: alertsConfig.scheduledReports 
  });
});

// Update scheduled reports configuration
app.put('/alerts/reports', (req, res) => {
  const { enabled, frequency, time, channels } = req.body;
  
  if (enabled !== undefined) {
    alertsConfig.scheduledReports.enabled = Boolean(enabled);
  }
  
  if (frequency) {
    alertsConfig.scheduledReports.frequency = frequency;
  }
  
  if (time) {
    alertsConfig.scheduledReports.time = time;
  }
  
  if (channels) {
    alertsConfig.scheduledReports.channels = channels;
  }
  
  res.json({ 
    message: 'Scheduled reports configuration updated successfully',
    scheduledReports: alertsConfig.scheduledReports 
  });
});

// Technical Indicators endpoints
const TechnicalIndicators = require('./technical-indicators');

// Machine Learning Prediction endpoints
const SimpleMLPredictor = require('./simple-ml-predictor');
const mlPredictor = new SimpleMLPredictor();

// Watchlist manager
const WatchlistManager = require('./watchlist-manager');
const watchlistManager = new WatchlistManager();

// Get price predictions for a symbol
app.get('/predict/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const hours = parseInt(req.query.hours) || 24;
  const steps = parseInt(req.query.steps) || 5;
  
  // Predictions only available with TimescaleDB storage
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Price predictions only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    // Get price history
    const history = await storage.getPriceHistory(symbol, hours);
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Extract prices from history (ordered from oldest to newest)
    const prices = history.map(item => parseFloat(item.price)).reverse();
    
    // Get ensemble prediction
    const prediction = mlPredictor.ensemblePredict(prices);
    
    // Predict future prices
    const futurePredictions = [];
    const lrModel = prediction.modelInfo.linearRegression;
    
    for (let i = 1; i <= steps; i++) {
      const timeIndex = prices.length - 1 + i;
      const predictedPrice = lrModel.slope * timeIndex + lrModel.intercept;
      futurePredictions.push(parseFloat(predictedPrice.toFixed(4)));
    }
    
    res.json({
      symbol: symbol,
      hours: hours,
      steps: steps,
      currentPrice: prices[prices.length - 1],
      prediction: prediction,
      futurePredictions: futurePredictions
    });
  } catch (error) {
    console.error('Error calculating price predictions:', error);
    res.status(500).json({ error: 'Error calculating price predictions' });
  }
});

// Get prediction accuracy metrics
app.get('/predict/:symbol/accuracy', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const hours = parseInt(req.query.hours) || 24;
  
  // Predictions only available with TimescaleDB storage
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Prediction accuracy only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    // Get price history
    const history = await storage.getPriceHistory(symbol, hours);
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Extract prices from history (ordered from oldest to newest)
    const prices = history.map(item => parseFloat(item.price)).reverse();
    
    // Use last 20% for testing
    const testSize = Math.floor(prices.length * 0.2);
    const trainPrices = prices.slice(0, -testSize);
    const testPrices = prices.slice(-testSize);
    
    if (trainPrices.length < 10 || testPrices.length < 5) {
      return res.status(400).json({ error: 'Not enough data for accuracy calculation' });
    }
    
    // Train model on training data
    const lrModel = mlPredictor.trainLinearRegression(trainPrices);
    
    // Predict on test data
    const predictedPrices = [];
    for (let i = 0; i < testPrices.length; i++) {
      const timeIndex = trainPrices.length + i;
      const predictedPrice = lrModel.slope * timeIndex + lrModel.intercept;
      predictedPrices.push(predictedPrice);
    }
    
    // Calculate accuracy metrics
    const accuracy = mlPredictor.calculateAccuracyMetrics(testPrices, predictedPrices);
    
    res.json({
      symbol: symbol,
      hours: hours,
      testDataPoints: testPrices.length,
      accuracy: accuracy
    });
  } catch (error) {
    console.error('Error calculating prediction accuracy:', error);
    res.status(500).json({ error: 'Error calculating prediction accuracy' });
  }
});

// Get technical indicators for a symbol
app.get('/indicators/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const hours = parseInt(req.query.hours) || 24;
  
  // Technical indicators only available with TimescaleDB storage
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Technical indicators only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    // Get price history
    const history = await storage.getPriceHistory(symbol, hours);
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Extract prices from history (ordered from oldest to newest)
    const prices = history.map(item => parseFloat(item.price)).reverse();
    
    // Calculate all indicators
    const indicators = TechnicalIndicators.calculateAllIndicators(prices);
    
    res.json({
      symbol: symbol,
      hours: hours,
      indicators: indicators
    });
  } catch (error) {
    console.error('Error calculating technical indicators:', error);
    res.status(500).json({ error: 'Error calculating technical indicators' });
  }
});

// Get specific indicator for a symbol
app.get('/indicators/:symbol/:indicator', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const indicator = req.params.indicator.toLowerCase();
  const hours = parseInt(req.query.hours) || 24;
  const period = parseInt(req.query.period) || null;
  
  // Technical indicators only available with TimescaleDB storage
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Technical indicators only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    // Get price history
    const history = await storage.getPriceHistory(symbol, hours);
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Extract prices from history (ordered from oldest to newest)
    const prices = history.map(item => parseFloat(item.price)).reverse();
    
    let result = null;
    
    // Calculate specific indicator
    switch (indicator) {
      case 'sma':
        result = TechnicalIndicators.calculateSMA(prices, period || 20);
        break;
      case 'ema':
        result = TechnicalIndicators.calculateEMA(prices, period || 12);
        break;
      case 'rsi':
        result = TechnicalIndicators.calculateRSI(prices, period || 14);
        break;
      case 'macd':
        result = TechnicalIndicators.calculateMACD(prices);
        break;
      case 'bb':
      case 'bollinger':
        result = TechnicalIndicators.calculateBollingerBands(prices, period || 20);
        break;
      default:
        return res.status(400).json({ error: `Unknown indicator: ${indicator}` });
    }
    
    res.json({
      symbol: symbol,
      indicator: indicator,
      period: period,
      hours: hours,
      value: result
    });
  } catch (error) {
    console.error('Error calculating technical indicator:', error);
    res.status(500).json({ error: 'Error calculating technical indicator' });
  }
});

// Get all watchlists
app.get('/watchlists', (req, res) => {
  try {
    const watchlists = watchlistManager.getWatchlists();
    res.json({ watchlists });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific watchlist
app.get('/watchlists/:name', (req, res) => {
  try {
    const symbols = watchlistManager.getWatchlist(req.params.name);
    res.json({ 
      name: req.params.name,
      symbols: symbols
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Create a new watchlist
app.post('/watchlists', (req, res) => {
  const { name, symbols } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Watchlist name is required' });
  }
  
  try {
    watchlistManager.createWatchlist(name, symbols || []);
    res.status(201).json({ 
      message: 'Watchlist created successfully',
      name: name,
      symbols: symbols || []
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add symbol to watchlist
app.post('/watchlists/:name/add', (req, res) => {
  const { symbol } = req.body;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  
  try {
    const added = watchlistManager.addToWatchlist(symbol, req.params.name);
    res.json({ 
      message: added ? 'Symbol added to watchlist' : 'Symbol already in watchlist',
      symbol: symbol
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Remove symbol from watchlist
app.post('/watchlists/:name/remove', (req, res) => {
  const { symbol } = req.body;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  
  try {
    const removed = watchlistManager.removeFromWatchlist(symbol, req.params.name);
    res.json({ 
      message: removed ? 'Symbol removed from watchlist' : 'Symbol not in watchlist',
      symbol: symbol
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Update watchlist symbols
app.put('/watchlists/:name', (req, res) => {
  const { symbols } = req.body;
  
  if (!symbols || !Array.isArray(symbols)) {
    return res.status(400).json({ error: 'Symbols array is required' });
  }
  
  try {
    watchlistManager.updateWatchlist(req.params.name, symbols);
    res.json({ 
      message: 'Watchlist updated successfully',
      name: req.params.name,
      symbols: symbols
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Delete a watchlist
app.delete('/watchlists/:name', (req, res) => {
  try {
    const deleted = watchlistManager.deleteWatchlist(req.params.name);
    if (deleted) {
      res.json({ message: 'Watchlist deleted successfully' });
    } else {
      res.status(404).json({ error: 'Watchlist not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get market overview data (for heatmap)
app.get('/market/overview', async (req, res) => {
  try {
    // Connect if not already connected
    if (storageType === 'timescaledb' && !storage.client._connected) {
      await storage.connect();
    }
    
    // Get all symbols
    let symbols = [];
    if (storageType === 'timescaledb') {
      symbols = await storage.getSymbols();
    } else {
      // For in-memory storage, get symbols from price tracker
      const summary = priceTracker.getSummary();
      symbols = Object.keys(summary);
    }
    
    // Get latest data for each symbol
    const marketData = {};
    
    if (storageType === 'timescaledb') {
      for (const symbol of symbols) {
        try {
          const data = await storage.getLatestPriceData(symbol);
          if (data) {
            marketData[symbol] = {
              price: parseFloat(data.price),
              volume: parseFloat(data.volume),
              timestamp: data.time
            };
          }
        } catch (error) {
          // Skip symbols with errors
          console.warn(`Error getting data for ${symbol}:`, error.message);
        }
      }
    } else {
      const summary = priceTracker.getSummary();
      for (const [symbol, data] of Object.entries(summary)) {
        marketData[symbol] = {
          price: parseFloat(data.price),
          volume: parseFloat(data.volume),
          timestamp: data.timestamp
        };
      }
    }
    
    res.json({ marketData });
  } catch (error) {
    console.error('Error getting market overview:', error);
    res.status(500).json({ error: 'Error retrieving market overview data' });
  }
});

// Get volume data for a symbol
app.get('/volume/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const hours = parseInt(req.query.hours) || 24;
  
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Volume data only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    // Get price history with volume data
    const history = await storage.getPriceHistory(symbol, hours);
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Format volume data for charting
    const volumeData = history.map(item => ({
      time: item.time,
      volume: parseFloat(item.volume)
    }));
    
    res.json({
      symbol: symbol,
      hours: hours,
      data: volumeData
    });
  } catch (error) {
    console.error('Error retrieving volume data:', error);
    res.status(500).json({ error: 'Error retrieving volume data' });
  }
});

// Compare multiple symbols
app.get('/compare', async (req, res) => {
  const symbolsParam = req.query.symbols;
  
  if (!symbolsParam) {
    return res.status(400).json({ error: 'Symbols parameter is required' });
  }
  
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
  
  if (symbols.length < 2) {
    return res.status(400).json({ error: 'At least 2 symbols are required for comparison' });
  }
  
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Symbol comparison only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    const comparisonData = {};
    
    // Get data for each symbol
    for (const symbol of symbols) {
      try {
        const history = await storage.getPriceHistory(symbol, 24); // Last 24 hours
        
        if (history && history.length > 0) {
          // Calculate price changes
          const firstPrice = parseFloat(history[history.length - 1].price);
          const lastPrice = parseFloat(history[0].price);
          const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
          
          comparisonData[symbol] = {
            currentPrice: lastPrice,
            firstPrice: firstPrice,
            changePercent: parseFloat(changePercent.toFixed(2)),
            volume: parseFloat(history[0].volume),
            history: history.map(item => ({
              time: item.time,
              price: parseFloat(item.price)
            }))
          };
        }
      } catch (error) {
        console.warn(`Error getting data for ${symbol}:`, error.message);
      }
    }
    
    res.json({
      symbols: symbols,
      data: comparisonData
    });
  } catch (error) {
    console.error('Error retrieving comparison data:', error);
    res.status(500).json({ error: 'Error retrieving comparison data' });
  }
});

// Backtesting Engine
const backtestingEngine = require('./backtesting-engine');

// Get available backtesting strategies
app.get('/backtest/strategies', (req, res) => {
  try {
    const strategies = backtestingEngine.getStrategies();
    res.json({ strategies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run backtest for a symbol
app.get('/backtest/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const strategy = req.query.strategy || 'smaCrossover';
  const hours = parseInt(req.query.hours) || 168; // Default to 1 week
  
  if (storageType !== 'timescaledb') {
    return res.status(400).json({ error: 'Backtesting only available with TimescaleDB storage' });
  }
  
  try {
    // Connect if not already connected
    if (!storage.client._connected) {
      await storage.connect();
    }
    
    // Get price history
    const history = await storage.getPriceHistory(symbol, hours);
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }
    
    // Extract prices from history (ordered from oldest to newest)
    const prices = history.map(item => parseFloat(item.price)).reverse();
    
    // Run backtest
    const options = {};
    if (req.query.shortPeriod) options.shortPeriod = parseInt(req.query.shortPeriod);
    if (req.query.longPeriod) options.longPeriod = parseInt(req.query.longPeriod);
    if (req.query.period) options.period = parseInt(req.query.period);
    if (req.query.overbought) options.overbought = parseInt(req.query.overbought);
    if (req.query.oversold) options.oversold = parseInt(req.query.oversold);
    
    const result = backtestingEngine.backtest(strategy, prices, options);
    const metrics = backtestingEngine.calculateMetrics(result.portfolio);
    
    res.json({
      symbol: symbol,
      strategy: strategy,
      hours: hours,
      dataPoints: prices.length,
      result: result,
      metrics: metrics
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Error running backtest' });
  }
});

// Serve static files AFTER API routes to avoid conflicts
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Crypto Price Tracker running at http://localhost:${port}`);
  console.log(`Using storage type: ${storageType}`);
  
  // Connect to Binance WebSocket
  priceTracker.connect();
  
  // Subscribe to symbols from config
  setTimeout(() => {
    console.log('Subscribing to symbols...');
    config.symbolsToTrack.forEach(symbol => {
      priceTracker.subscribeToSymbol(symbol);
    });
  }, 1000);
  
  // Connect to storage if it's TimescaleDB
  if (storageType === 'timescaledb') {
    storage.connect();
  }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server gracefully...');
  priceTracker.close();
  if (storage.close) {
    await storage.close();
  }
  process.exit(0);
});