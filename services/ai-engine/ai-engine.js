const NeuralNetwork = require('./neural-network');
const ReinforcementAgent = require('./reinforcement-agent');
const TransformerModel = require('./transformer-model');
const EnsembleModel = require('./ensemble-model');

class AIEngine {
  constructor() {
    this.neuralNetwork = null;
    this.reinforcementAgent = null;
    this.transformerModel = null;
    this.ensembleModel = null;
    
    // Feature engineering
    this.featureExtractor = null;
    
    // Model management
    this.models = new Map();
    this.modelPerformance = new Map();
    this.decisionHistory = [];
    
    // Configuration
    this.config = {
      enableNeuralNetwork: true,
      enableReinforcement: true,
      enableTransformer: true,
      enableEnsemble: true,
      learningRate: 0.001,
      trainingEpochs: 50
    };
    
    console.log('AI Engine initialized');
  }

  // Initialize all AI models
  async initialize() {
    try {
      // Initialize neural network for price prediction
      if (this.config.enableNeuralNetwork) {
        this.neuralNetwork = new NeuralNetwork(20, 32, 3, this.config.learningRate);
        this.models.set('neuralNetwork', this.neuralNetwork);
        console.log('Neural Network initialized');
      }
      
      // Initialize reinforcement agent for trading decisions
      if (this.config.enableReinforcement) {
        this.reinforcementAgent = new ReinforcementAgent(20, 3, this.config.learningRate);
        this.models.set('reinforcementAgent', this.reinforcementAgent);
        console.log('Reinforcement Agent initialized');
      }
      
      // Initialize transformer model for sequence analysis
      if (this.config.enableTransformer) {
        this.transformerModel = new TransformerModel(10, 64, 4, 2, 30);
        this.models.set('transformerModel', this.transformerModel);
        console.log('Transformer Model initialized');
      }
      
      // Initialize ensemble model
      if (this.config.enableEnsemble) {
        this.ensembleModel = new EnsembleModel();
        
        // Add individual models to ensemble
        if (this.neuralNetwork) {
          this.ensembleModel.addModel('neuralNetwork', this.neuralNetwork, 1.0);
        }
        
        if (this.reinforcementAgent) {
          this.ensembleModel.addModel('reinforcementAgent', this.reinforcementAgent, 1.0);
        }
        
        if (this.transformerModel) {
          this.ensembleModel.addModel('transformerModel', this.transformerModel, 1.0);
        }
        
        this.models.set('ensembleModel', this.ensembleModel);
        console.log('Ensemble Model initialized');
      }
      
      console.log('All AI models initialized successfully');
    } catch (error) {
      console.error('Error initializing AI models:', error);
      throw error;
    }
  }

  // Extract features from raw market data
  extractFeatures(marketData) {
    const features = [];
    
    // Price-based features
    features.push(marketData.price || 0);
    features.push(marketData.changePercent || 0);
    features.push(marketData.volume || 0);
    features.push(marketData.fundingRate || 0);
    features.push(marketData.openInterest || 0);
    
    // Technical indicators (simplified)
    features.push(marketData.rsi || 50);
    features.push(marketData.macd || 0);
    features.push(marketData.bollingerUpper || 0);
    features.push(marketData.bollingerLower || 0);
    features.push(marketData.vwap || 0);
    
    // Order book features
    features.push(marketData.bidPrice || 0);
    features.push(marketData.askPrice || 0);
    features.push(marketData.bidVolume || 0);
    features.push(marketData.askVolume || 0);
    features.push(marketData.spread || 0);
    
    // Time-based features
    const now = new Date();
    features.push(now.getHours() / 24);
    features.push(now.getDay() / 7);
    features.push(now.getMonth() / 12);
    
    // Market sentiment (if available)
    features.push(marketData.sentiment || 0);
    
    // Normalize features
    return this.normalizeFeatures(features);
  }

  // Normalize features to [0, 1] range
  normalizeFeatures(features) {
    // Handle empty or single-value arrays
    if (features.length === 0) {
      return [];
    }
    
    // If all features are the same value, return middle value (0.5)
    const firstVal = features[0];
    const allSame = features.every(val => val === firstVal);
    
    if (allSame) {
      return features.map(() => 0.5);
    }
    
    // Normal normalization
    const minVal = Math.min(...features);
    const maxVal = Math.max(...features);
    const range = maxVal - minVal;
    
    // Handle case where range is zero (shouldn't happen with above check, but just in case)
    if (range === 0) {
      return features.map(() => 0.5);
    }
    
    const normalized = features.map(feature => {
      // Handle potential NaN or Infinity values
      if (isNaN(feature) || !isFinite(feature)) {
        return 0.5; // Default neutral value
      }
      return (feature - minVal) / range;
    });
    
    return normalized;
  }

  // Make prediction using ensemble of models
  async predict(marketData) {
    try {
      // Extract features
      const features = this.extractFeatures(marketData);
      
      // Ensure we have enough features
      if (features.length < 20) {
        // Pad with zeros if needed
        while (features.length < 20) {
          features.push(0);
        }
      }
      
      // Check for NaN values in features
      const hasNaN = features.some(feature => isNaN(feature) || !isFinite(feature));
      if (hasNaN) {
        console.warn('NaN or infinite values detected in features, using neutral prediction');
        return {
          action: 'HOLD',
          confidence: 0.33,
          probabilities: {
            LONG: 0.33,
            SHORT: 0.33,
            HOLD: 0.34
          },
          features: features.slice(0, 10)
        };
      }
      
      // Get prediction from ensemble
      if (this.ensembleModel) {
        const prediction = await this.ensembleModel.predict(features);
        
        // Validate prediction
        if (!Array.isArray(prediction) || prediction.length !== 3) {
          throw new Error('Invalid prediction format');
        }
        
        // Check for NaN in prediction
        const predictionHasNaN = prediction.some(val => isNaN(val) || !isFinite(val));
        if (predictionHasNaN) {
          console.warn('NaN or infinite values in prediction, using neutral prediction');
          return {
            action: 'HOLD',
            confidence: 0.33,
            probabilities: {
              LONG: 0.33,
              SHORT: 0.33,
              HOLD: 0.34
            },
            features: features.slice(0, 10)
          };
        }
        
        return {
          action: this.getActionFromPrediction(prediction),
          confidence: Math.max(...prediction),
          probabilities: {
            LONG: prediction[0],
            SHORT: prediction[1],
            HOLD: prediction[2]
          },
          features: features.slice(0, 10)
        };
      }
      
      // Fallback to individual models
      if (this.neuralNetwork) {
        const prediction = this.neuralNetwork.predict(features);
        
        // Validate prediction
        if (!Array.isArray(prediction) || prediction.length !== 3) {
          throw new Error('Invalid prediction format');
        }
        
        // Check for NaN in prediction
        const predictionHasNaN = prediction.some(val => isNaN(val) || !isFinite(val));
        if (predictionHasNaN) {
          console.warn('NaN or infinite values in neural network prediction, using neutral prediction');
          return {
            action: 'HOLD',
            confidence: 0.33,
            probabilities: {
              LONG: 0.33,
              SHORT: 0.33,
              HOLD: 0.34
            }
          };
        }
        
        return {
          action: this.getActionFromPrediction(prediction),
          confidence: Math.max(...prediction),
          probabilities: {
            LONG: prediction[0],
            SHORT: prediction[1],
            HOLD: prediction[2]
          }
        };
      }
      
      // Default random prediction
      return {
        action: 'HOLD',
        confidence: 0.33,
        probabilities: {
          LONG: 0.33,
          SHORT: 0.33,
          HOLD: 0.34
        }
      };
    } catch (error) {
      console.error('Error making prediction:', error);
      return {
        action: 'HOLD',
        confidence: 0.5,
        probabilities: {
          LONG: 0.33,
          SHORT: 0.33,
          HOLD: 0.34
        },
        error: error.message
      };
    }
  }

  // Convert prediction probabilities to action
  getActionFromPrediction(prediction) {
    const maxIndex = this.argmax(prediction);
    
    switch (maxIndex) {
      case 0:
        return 'LONG';
      case 1:
        return 'SHORT';
      case 2:
        return 'HOLD';
      default:
        return 'HOLD';
    }
  }

  // Train all models with historical data
  async train(historicalData) {
    try {
      console.log(`Training AI models with ${historicalData.length} data points`);
      
      // Prepare training data
      const trainingData = [];
      const labels = [];
      
      for (let i = 30; i < historicalData.length; i++) {
        // Create sequences of 30 data points
        const sequence = historicalData.slice(i - 30, i);
        const features = sequence.map(data => this.extractFeatures(data));
        
        // Label based on price movement
        const currentPrice = historicalData[i].price;
        const nextPrice = historicalData[i + 1]?.price || currentPrice;
        const priceChange = (nextPrice - currentPrice) / currentPrice;
        
        // Create one-hot encoded label
        let label;
        if (priceChange > 0.01) {
          label = [1, 0, 0]; // LONG
        } else if (priceChange < -0.01) {
          label = [0, 1, 0]; // SHORT
        } else {
          label = [0, 0, 1]; // HOLD
        }
        
        trainingData.push(features);
        labels.push(label);
      }
      
      // Train ensemble model
      if (this.ensembleModel) {
        const histories = await this.ensembleModel.train(trainingData, labels, this.config.trainingEpochs);
        console.log('Ensemble training completed');
        return histories;
      }
      
      console.log('Training completed');
      return [];
    } catch (error) {
      console.error('Error training models:', error);
      throw error;
    }
  }

  // Update model with new experience (reinforcement learning)
  updateWithExperience(state, action, reward, nextState, done) {
    if (this.reinforcementAgent) {
      // Store experience
      this.reinforcementAgent.remember(state, action, reward, nextState, done);
      
      // Train with experience replay
      this.reinforcementAgent.replay(32);
    }
  }

  // Get model performance metrics
  getModelPerformance() {
    const performance = {};
    
    if (this.reinforcementAgent) {
      performance.reinforcement = {
        epsilon: this.reinforcementAgent.getEpsilon(),
        memorySize: this.reinforcementAgent.getMemorySize()
      };
    }
    
    if (this.ensembleModel) {
      performance.ensemble = {
        modelWeights: this.ensembleModel.getModelWeights(),
        modelCount: this.ensembleModel.getModelCount()
      };
    }
    
    return performance;
  }

  // Get decision history
  getDecisionHistory(limit = 50) {
    return this.decisionHistory.slice(-limit);
  }

  // Add decision to history
  addDecisionToHistory(decision) {
    this.decisionHistory.push({
      ...decision,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 decisions
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory.shift();
    }
  }

  // Save all models
  async saveModels(filepath) {
    const modelData = {};
    
    for (const [name, model] of this.models) {
      if (typeof model.save === 'function') {
        modelData[name] = model.save(`${filepath}_${name}`);
      }
    }
    
    console.log('All models saved');
    return modelData;
  }

  // Load all models
  async loadModels(modelData) {
    for (const [name, data] of Object.entries(modelData)) {
      const model = this.models.get(name);
      if (model && typeof model.load === 'function') {
        model.load(data);
      }
    }
    
    console.log('All models loaded');
  }

  // Helper function to get argmax
  argmax(array) {
    let maxIndex = 0;
    for (let i = 1; i < array.length; i++) {
      if (array[i] > array[maxIndex]) {
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('AI Engine configuration updated');
  }
}

module.exports = AIEngine;