const express = require('express');
const http = require('http');
const BinanceFuturesClient = require('./binance-futures-client');
const BacktestService = require('./backtest-service');
const ChatService = require('../ai-engine/chat-service');
const LearningService = require('../ai-engine/learning-service');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const binanceClient = new BinanceFuturesClient();
const backtestService = new BacktestService();
const chatService = new ChatService();
const learningService = new LearningService();

// Initialize services
async function initializeServices() {
  try {
    binanceClient.connect();
    await chatService.initialize();
    await learningService.initialize();
    console.log('All services initialized');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

initializeServices();

// Store real-time data for multiple symbols
const realTimeData = new Map();

// Handle kline updates
binanceClient.on('kline', (data) => {
  if (!realTimeData.has(data.symbol)) {
    realTimeData.set(data.symbol, []);
  }
  
  const symbolData = realTimeData.get(data.symbol);
  symbolData.push(data);
  
  // Keep only last 1000 data points
  if (symbolData.length > 1000) {
    symbolData.shift();
  }
  
  console.log(`Kline update for ${data.symbol}: ${data.close}`);
});

// Basic route
app.get('/', (req, res) => {
  res.send('QuantFlow AI Trading Platform - Binance Futures Service Running');
});

// API endpoint to get real-time data
app.get('/api/data/:symbol', (req, res) => {
  const { symbol } = req.params;
  const symbolData = realTimeData.get(symbol.toUpperCase());
  
  if (!symbolData) {
    return res.status(404).json({
      success: false,
      error: `No data found for symbol ${symbol}`
    });
  }
  
  res.json({
    success: true,
    symbol: symbol.toUpperCase(),
    data: symbolData[symbolData.length - 1],
    timestamp: new Date().toISOString()
  });
});

// API endpoint to get recent data history
app.get('/api/history/:symbol', (req, res) => {
  const { symbol } = req.params;
  const { limit = 100 } = req.query;
  
  const symbolData = realTimeData.get(symbol.toUpperCase());
  
  if (!symbolData) {
    return res.status(404).json({
      success: false,
      error: `No data found for symbol ${symbol}`
    });
  }
  
  const history = symbolData.slice(-limit);
  
  res.json({
    success: true,
    symbol: symbol.toUpperCase(),
    data: history,
    count: history.length,
    timestamp: new Date().toISOString()
  });
});

// API endpoint to run backtest
app.post('/api/backtest', async (req, res) => {
  try {
    const { historicalData, initialCapital, config } = req.body;
    
    if (!historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({
        success: false,
        error: 'historicalData is required and must be an array'
      });
    }
    
    console.log(`Running backtest with ${historicalData.length} data points`);
    
    // Run backtest
    const results = await backtestService.runBacktest(
      historicalData, 
      initialCapital || 10000, 
      config || {}
    );
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to generate synthetic data
app.get('/api/synthetic-data', (req, res) => {
  try {
    const { symbol = 'BTCUSDT', points = 1000 } = req.query;
    
    const syntheticData = backtestService.generateSyntheticData(symbol, parseInt(points));
    
    res.json({
      success: true,
      symbol,
      data: syntheticData,
      count: syntheticData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Synthetic data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to fetch historical data from Binance
app.get('/api/binance/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', days = 30 } = req.query;
    
    console.log(`Fetching historical data for ${symbol}, interval: ${interval}, days: ${days}`);
    
    const klines = await binanceClient.getHistoricalKlines(symbol, interval, parseInt(days));
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      interval,
      days: parseInt(days),
      data: klines,
      count: klines.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint for AI chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    console.log(`Chat message received: ${message}`);
    
    // Process message with chat service
    const response = await chatService.processMessage(message, context || {});
    
    res.json({
      success: true,
      message: message,
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get conversation history
app.get('/api/chat/history', (req, res) => {
  try {
    const history = chatService.getConversationHistory();
    
    res.json({
      success: true,
      history: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get learning status
app.get('/api/learning/status', (req, res) => {
  try {
    const status = learningService.getLearningStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Learning status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get learning log
app.get('/api/learning/log', (req, res) => {
  try {
    const log = learningService.getLearningLog();
    
    res.json({
      success: true,
      log: log,
      count: log.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Learning log error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to start training on historical data
app.post('/api/learning/train', async (req, res) => {
  try {
    const { symbol, days = 30, interval = '1h' } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }
    
    console.log(`Starting training for ${symbol} using ${days} days of data`);
    
    // Fetch historical data
    const historicalData = await binanceClient.getHistoricalKlines(symbol, interval, days);
    
    if (historicalData.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No historical data found for ${symbol}`
      });
    }
    
    // Train AI on historical data
    const trainingResult = await learningService.trainOnHistoricalData(historicalData, symbol);
    
    res.json({
      success: true,
      result: trainingResult,
      dataPoints: historicalData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get supported symbols
app.get('/api/symbols', async (req, res) => {
  try {
    const symbols = binanceClient.getSupportedSymbols();
    
    res.json({
      success: true,
      symbols: symbols,
      count: symbols.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Symbols error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get all perpetual symbols from exchange
app.get('/api/perpetual-symbols', async (req, res) => {
  try {
    const symbols = await binanceClient.getAllPerpetualSymbols();
    
    res.json({
      success: true,
      symbols: symbols,
      count: symbols.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Perpetual symbols error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to subscribe to multiple symbols
app.post('/api/subscribe', (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }
    
    binanceClient.subscribeToMultipleSymbols(symbols);
    
    res.json({
      success: true,
      message: `Subscribed to ${symbols.length} symbols`,
      symbols: symbols,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
server.listen(port, () => {
  console.log(`QuantFlow Binance Futures AI Service running on port ${port}`);
});

module.exports = { app, server };