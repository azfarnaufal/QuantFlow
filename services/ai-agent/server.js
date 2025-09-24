const express = require('express');
const tf = require('@tensorflow/tfjs-node');
const axios = require('axios');
const KafkaEventBus = require('../event-bus/kafka-client');

class AIAgentService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3005;
    this.eventBus = new KafkaEventBus();
    this.models = new Map(); // Loaded ML models
    this.decisionHistory = []; // History of AI decisions
    this.serviceUrls = {
      dataIngestion: process.env.DATA_INGESTION_URL || 'http://localhost:3001',
      storage: process.env.STORAGE_URL || 'http://localhost:3002',
      analysis: process.env.ANALYSIS_URL || 'http://localhost:3003',
      trading: process.env.TRADING_URL || 'http://localhost:3004'
    };
  }

  async initialize() {
    // Connect to event bus
    await this.eventBus.connect();
    
    // Initialize Express middleware
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
    
    // Load ML models
    await this.loadModels();
    
    // Subscribe to relevant events
    await this.subscribeToEvents();
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        service: 'ai-agent',
        timestamp: new Date().toISOString()
      });
    });

    // Get AI decision history
    this.app.get('/decisions', (req, res) => {
      res.json(this.decisionHistory.slice(-50)); // Last 50 decisions
    });

    // Get loaded models
    this.app.get('/models', (req, res) => {
      const models = Array.from(this.models.keys());
      res.json({ models });
    });

    // Force AI decision
    this.app.post('/decide', async (req, res) => {
      try {
        const decision = await this.makeDecision();
        res.json({ decision });
      } catch (error) {
        console.error('Error making AI decision:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Train model
    this.app.post('/train', async (req, res) => {
      try {
        const { modelType, data } = req.body;
        await this.trainModel(modelType, data);
        res.json({ message: 'Model training completed' });
      } catch (error) {
        console.error('Error training model:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async loadModels() {
    // Load LSTM model for price prediction
    try {
      // Create a simple LSTM model for demonstration
      const lstmModel = tf.sequential();
      lstmModel.add(tf.layers.lstm({
        units: 50,
        returnSequences: true,
        inputShape: [60, 1] // 60 time steps, 1 feature
      }));
      lstmModel.add(tf.layers.dropout({ rate: 0.2 }));
      lstmModel.add(tf.layers.lstm({ units: 50, returnSequences: false }));
      lstmModel.add(tf.layers.dropout({ rate: 0.2 }));
      lstmModel.add(tf.layers.dense({ units: 1 }));
      
      lstmModel.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
      });
      
      this.models.set('lstm-price-predictor', lstmModel);
      console.log('LSTM model loaded');
    } catch (error) {
      console.error('Error loading LSTM model:', error);
    }
    
    // Load reinforcement learning model
    try {
      // Simple Q-network for demonstration
      const qNetwork = tf.sequential();
      qNetwork.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        inputShape: [10] // 10 features for state representation
      }));
      qNetwork.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
      }));
      qNetwork.add(tf.layers.dense({
        units: 3, // Buy, Sell, Hold
        activation: 'linear'
      }));
      
      qNetwork.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
      });
      
      this.models.set('reinforcement-trader', qNetwork);
      console.log('Reinforcement learning model loaded');
    } catch (error) {
      console.error('Error loading reinforcement learning model:', error);
    }
  }

  async subscribeToEvents() {
    // Subscribe to analysis results for decision making
    await this.eventBus.subscribe('analysis-results', async (data) => {
      console.log(`AI Agent received analysis results for ${data.symbol}`);
      // Make trading decision based on analysis
      await this.makeDecisionBasedOnAnalysis(data);
    });
    
    // Subscribe to trade executions for learning
    await this.eventBus.subscribe('trade-execution', async (data) => {
      console.log(`AI Agent received trade execution: ${data.action} ${data.symbol}`);
      // Learn from trade results
      await this.learnFromTrade(data);
    });
  }

  async makeDecisionBasedOnAnalysis(data) {
    // Simple decision logic based on indicators
    const indicators = data.indicators;
    
    let action = 'HOLD';
    let confidence = 0;
    
    if (indicators.rsi && indicators.sma20 && indicators.sma50) {
      if (indicators.sma20 > indicators.sma50 && indicators.rsi < 70) {
        action = 'BUY';
        confidence = 0.8;
      } else if (indicators.sma20 < indicators.sma50 && indicators.rsi > 30) {
        action = 'SELL';
        confidence = 0.7;
      }
    }
    
    // Use ML model for enhanced decision making
    const mlDecision = await this.predictWithML(data.symbol);
    if (mlDecision && mlDecision.confidence > confidence) {
      action = mlDecision.action;
      confidence = mlDecision.confidence;
    }
    
    const decision = {
      symbol: data.symbol,
      action,
      confidence,
      timestamp: Date.now(),
      basedOn: 'analysis-results'
    };
    
    this.decisionHistory.push(decision);
    
    // If confidence is high enough, execute trade
    if (confidence > 0.7) {
      await this.executeTradeBasedOnDecision(decision);
    }
    
    console.log(`AI Decision for ${data.symbol}: ${action} (confidence: ${confidence})`);
  }

  async predictWithML(symbol) {
    // Use LSTM model for price prediction
    const lstmModel = this.models.get('lstm-price-predictor');
    if (!lstmModel) return null;
    
    try {
      // Get historical data
      const historyResponse = await axios.get(`${this.serviceUrls.storage}/history/${symbol}?limit=60`);
      const history = historyResponse.data;
      
      if (history.length < 60) return null;
      
      // Prepare data for prediction
      const prices = history.map(item => parseFloat(item.price));
      const normalizedPrices = this.normalizeData(prices);
      
      // Reshape data for LSTM
      const inputTensor = tf.tensor3d([normalizedPrices], [1, 60, 1]);
      
      // Make prediction
      const prediction = lstmModel.predict(inputTensor);
      const predictedValue = await prediction.data();
      
      // Calculate confidence based on recent volatility
      const volatility = this.calculateVolatility(prices.slice(-20));
      const confidence = Math.max(0, 1 - volatility / 100); // Simplified confidence calculation
      
      // Determine action based on prediction
      const currentPrice = prices[prices.length - 1];
      const predictedPrice = predictedValue[0] * currentPrice; // Denormalize
      const action = predictedPrice > currentPrice ? 'BUY' : 'SELL';
      
      return {
        action,
        confidence,
        predictedPrice,
        currentPrice
      };
    } catch (error) {
      console.error('Error in ML prediction:', error);
      return null;
    }
  }

  normalizeData(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(value => (value - min) / (max - min));
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100; // Percentage
  }

  async executeTradeBasedOnDecision(decision) {
    try {
      // Get current price
      const priceResponse = await axios.get(`${this.serviceUrls.storage}/price/${decision.symbol}`);
      const currentPrice = parseFloat(priceResponse.data.price);
      
      // Execute trade through trading service
      await axios.post(`${this.serviceUrls.trading}/trade`, {
        symbol: decision.symbol,
        action: decision.action,
        quantity: 1, // Simplified quantity
        price: currentPrice
      });
      
      console.log(`Executed trade based on AI decision: ${decision.action} ${decision.symbol}`);
    } catch (error) {
      console.error('Error executing trade based on AI decision:', error);
    }
  }

  async learnFromTrade(data) {
    // Update decision history with actual results
    const recentDecision = this.decisionHistory.find(
      d => d.symbol === data.symbol && 
           Math.abs(d.timestamp - data.timestamp) < 60000 // Within 1 minute
    );
    
    if (recentDecision) {
      recentDecision.actualResult = {
        action: data.action,
        price: data.price,
        timestamp: data.timestamp
      };
    }
    
    // In a real implementation, we would update our ML models here
    // based on the results of our decisions
  }

  async makeDecision() {
    // Comprehensive decision making process
    console.log('AI Agent making comprehensive decision');
    
    // Get all symbols
    const symbolsResponse = await axios.get(`${this.serviceUrls.dataIngestion}/symbols`);
    const symbols = symbolsResponse.data.symbols;
    
    const decisions = [];
    
    for (const symbol of symbols) {
      try {
        // Get latest indicators
        const indicatorsResponse = await axios.get(`${this.serviceUrls.analysis}/indicators/${symbol}`);
        const indicators = indicatorsResponse.data.indicators;
        
        // Get price history for ML prediction
        const historyResponse = await axios.get(`${this.serviceUrls.storage}/history/${symbol}?limit=100`);
        const history = historyResponse.data;
        
        // Make decision
        let action = 'HOLD';
        let confidence = 0;
        
        if (indicators.rsi && indicators.sma20 && indicators.sma50) {
          if (indicators.sma20 > indicators.sma50 && indicators.rsi < 70) {
            action = 'BUY';
            confidence = 0.8;
          } else if (indicators.sma20 < indicators.sma50 && indicators.rsi > 30) {
            action = 'SELL';
            confidence = 0.7;
          }
        }
        
        decisions.push({
          symbol,
          action,
          confidence,
          indicators,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`Error making decision for ${symbol}:`, error);
      }
    }
    
    return decisions;
  }

  async trainModel(modelType, data) {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found`);
    }
    
    // In a real implementation, we would train the model with the provided data
    console.log(`Training ${modelType} with ${data.length} data points`);
    
    // This is a simplified training process
    // In reality, this would involve proper data preprocessing,
    // training loops, validation, etc.
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`AI Agent Service running at http://localhost:${this.port}`);
    });
  }
}

// Initialize and start service
async function startService() {
  const service = new AIAgentService();
  await service.initialize();
  service.start();
}

startService().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down AI Agent Service...');
  process.exit(0);
});