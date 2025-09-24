const express = require('express');
const axios = require('axios');
const FeatureEngineering = require('./utils/feature-engineering');
const SentimentAnalyzer = require('./models/sentiment-analyzer');
const RiskManager = require('./models/risk-manager');
const MarketRegimeDetector = require('./models/market-regime-detector');
const PortfolioOptimizer = require('./models/portfolio-optimizer');
const AnomalyDetector = require('./models/anomaly-detector');

class AIAgentService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3005;
    this.featureEngineering = new FeatureEngineering();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.riskManager = new RiskManager();
    this.marketRegimeDetector = new MarketRegimeDetector();
    this.portfolioOptimizer = new PortfolioOptimizer();
    this.anomalyDetector = new AnomalyDetector();
    
    this.models = new Map();
    this.decisionHistory = [];
    this.modelPerformances = new Map();
    this.serviceUrls = {
      dataIngestion: process.env.DATA_INGESTION_URL || 'http://localhost:3001',
      storage: process.env.STORAGE_URL || 'http://localhost:3002',
      analysis: process.env.ANALYSIS_URL || 'http://localhost:3003',
      trading: process.env.TRADING_URL || 'http://localhost:3004'
    };
  }

  async initialize() {
    // Initialize Express middleware
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
    
    // Load ML models
    await this.loadModels();
    
    console.log('AI Agent Service initialized with advanced features');
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

    // Get model performance
    this.app.get('/performance', (req, res) => {
      const performance = {
        modelPerformances: Object.fromEntries(this.modelPerformances)
      };
      res.json(performance);
    });

    // Online learning endpoint
    this.app.post('/learn', async (req, res) => {
      try {
        const { experience } = req.body;
        await this.onlineLearning(experience);
        res.json({ message: 'Learning completed' });
      } catch (error) {
        console.error('Error in online learning:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Sentiment analysis endpoint
    this.app.post('/sentiment', async (req, res) => {
      try {
        const { texts } = req.body;
        const sentiment = this.sentimentAnalyzer.analyzeMultiple(texts);
        res.json({ sentiment });
      } catch (error) {
        console.error('Error in sentiment analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Risk management endpoint
    this.app.get('/risk', (req, res) => {
      try {
        const riskMetrics = this.riskManager.getRiskMetrics();
        res.json({ riskMetrics });
      } catch (error) {
        console.error('Error getting risk metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Market regime detection endpoint
    this.app.post('/regime', async (req, res) => {
      try {
        const { priceData, volumeData } = req.body;
        const regime = this.marketRegimeDetector.detectRegime(priceData, volumeData);
        res.json({ regime });
      } catch (error) {
        console.error('Error detecting market regime:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Portfolio optimization endpoint
    this.app.post('/optimize', async (req, res) => {
      try {
        const { assets, historicalReturns, optimizationType } = req.body;
        let result;
        
        if (optimizationType === 'sharpe') {
          result = this.portfolioOptimizer.optimizeMaxSharpe(assets, historicalReturns);
        } else if (optimizationType === 'variance') {
          result = this.portfolioOptimizer.optimizeMinVariance(assets, historicalReturns);
        } else {
          result = this.portfolioOptimizer.optimizeMaxSharpe(assets, historicalReturns);
        }
        
        res.json({ optimization: result });
      } catch (error) {
        console.error('Error optimizing portfolio:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Anomaly detection endpoint
    this.app.post('/anomaly', async (req, res) => {
      try {
        const { symbol, type, data } = req.body;
        let anomaly;
        
        switch (type) {
          case 'price':
            anomaly = this.anomalyDetector.detectPriceAnomalies(symbol, data.current, data.historical);
            break;
          case 'volume':
            anomaly = this.anomalyDetector.detectVolumeAnomalies(symbol, data.current, data.historical);
            break;
          case 'pattern':
            anomaly = this.anomalyDetector.detectPatternAnomalies(symbol, data.current, data.historical);
            break;
          default:
            anomaly = { isAnomaly: false, score: 0, reason: 'Unknown anomaly type' };
        }
        
        res.json({ anomaly });
      } catch (error) {
        console.error('Error detecting anomaly:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async loadModels() {
    // Initialize models (simplified for now)
    console.log('AI models initialized (simplified version)');
  }

  async makeDecisionBasedOnAnalysis(data) {
    // Create state representation for decision making
    const state = await this.createStateRepresentation(data.symbol);
    
    // Simple rule-based decision making (to be replaced with ML models)
    let action = 2; // Default to HOLD
    let confidence = 0.5;
    let modelUsed = 'rule-based';
    
    if (state) {
      // Simple logic based on RSI
      const rsi = state.find(val => typeof val === 'number' && val >= 0 && val <= 100);
      if (rsi !== undefined) {
        if (rsi < 30) {
          action = 0; // BUY
          confidence = 0.8;
        } else if (rsi > 70) {
          action = 1; // SELL
          confidence = 0.8;
        }
      }
    }
    
    const actionMap = ['BUY', 'SELL', 'HOLD'];
    const decision = {
      symbol: data.symbol,
      action: actionMap[action],
      confidence,
      modelUsed,
      timestamp: Date.now(),
      basedOn: 'analysis-results'
    };
    
    this.decisionHistory.push(decision);
    
    console.log(`AI Decision for ${data.symbol}: ${actionMap[action]} (confidence: ${confidence}, model: ${modelUsed})`);
  }

  async createStateRepresentation(symbol) {
    try {
      // Get historical data
      const historyResponse = await axios.get(`${this.serviceUrls.storage}/history/${symbol}?limit=100`);
      const history = historyResponse.data;
      
      if (history.length < 20) return null;
      
      // Extract price and volume data
      const prices = history.map(item => parseFloat(item.price));
      const volumes = history.map(item => parseFloat(item.volume));
      
      // Create features
      const features = this.featureEngineering.createFeatures(prices, volumes);
      
      return features.slice(-20); // Use last 20 features as state
    } catch (error) {
      console.error(`Error creating state representation for ${symbol}:`, error);
      return null;
    }
  }

  async makeDecision() {
    // Comprehensive decision making process
    console.log('AI Agent making comprehensive decision');
    
    // For now, return a simple response
    return [{
      symbol: 'BTCUSDT',
      action: 'HOLD',
      confidence: 0.5,
      modelUsed: 'rule-based',
      timestamp: Date.now()
    }];
  }

  async trainModel(modelType, data) {
    // Train specific model with provided data
    console.log(`Training ${modelType} with ${data.length} data points`);
    
    // Simplified training process
    console.log('Model training completed (simplified version)');
  }

  async onlineLearning(experience) {
    // Online learning from experience data
    console.log('Online learning received');
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