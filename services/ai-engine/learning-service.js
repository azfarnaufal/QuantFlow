const AIEngine = require('./ai-engine');
const fs = require('fs').promises;
const path = require('path');

class LearningService {
  constructor() {
    this.aiEngine = new AIEngine();
    this.learningLog = [];
    this.isLearning = false;
    this.logFilePath = path.join(__dirname, '..', '..', 'data', 'learning-log.json');
  }

  async initialize() {
    await this.aiEngine.initialize();
    await this.loadLearningLog();
    console.log('Learning Service initialized');
  }

  // Load previous learning log
  async loadLearningLog() {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf8');
      this.learningLog = JSON.parse(data);
      console.log(`Loaded ${this.learningLog.length} previous learning entries`);
    } catch (error) {
      console.log('No existing learning log found, starting fresh');
      this.learningLog = [];
    }
  }

  // Save learning log
  async saveLearningLog() {
    try {
      // Ensure data directory exists
      const dataDir = path.join(__dirname, '..', '..', 'data');
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(this.logFilePath, JSON.stringify(this.learningLog, null, 2));
      console.log('Learning log saved');
    } catch (error) {
      console.error('Error saving learning log:', error);
    }
  }

  // Train AI on historical data with enhanced training
  async trainOnHistoricalData(historicalData, symbol) {
    if (this.isLearning) {
      console.log('Already learning, skipping...');
      return;
    }

    this.isLearning = true;
    console.log(`Starting training on ${historicalData.length} data points for ${symbol}`);

    try {
      // Log the learning session
      const learningSession = {
        symbol,
        startTime: new Date().toISOString(),
        dataPoints: historicalData.length,
        modelsTrained: [],
        trainingResults: {}
      };

      // Train each model in the AI engine
      if (this.aiEngine.neuralNetwork) {
        console.log('Training neural network...');
        // Prepare training data
        const trainingData = historicalData.map((dataPoint, index) => {
          // Use previous data points as input features
          const inputFeatures = [];
          
          // Add price features
          inputFeatures.push(dataPoint.open);
          inputFeatures.push(dataPoint.high);
          inputFeatures.push(dataPoint.low);
          inputFeatures.push(dataPoint.close);
          inputFeatures.push(dataPoint.volume);
          
          // Add technical indicators if available
          inputFeatures.push(dataPoint.rsi || 50);
          inputFeatures.push(dataPoint.macd || 0);
          
          // Add price change features from previous points
          if (index > 0) {
            const prevPoint = historicalData[index - 1];
            inputFeatures.push((dataPoint.close - prevPoint.close) / prevPoint.close); // Price change
            inputFeatures.push(dataPoint.volume - prevPoint.volume); // Volume change
          } else {
            inputFeatures.push(0); // No previous data
            inputFeatures.push(0); // No previous data
          }
          
          // Target: Next closing price (normalized)
          let targetPrice = dataPoint.close;
          if (index < historicalData.length - 1) {
            targetPrice = historicalData[index + 1].close;
          }
          
          return {
            input: inputFeatures,
            target: [targetPrice] // Predict next closing price
          };
        });

        // Remove any data points with invalid values
        const validTrainingData = trainingData.filter(dataPoint => 
          dataPoint.input.every(val => isFinite(val)) && 
          dataPoint.target.every(val => isFinite(val))
        );

        console.log(`Training on ${validTrainingData.length} valid data points`);
        
        if (validTrainingData.length > 0) {
          // Perform cross-validation to evaluate model
          const cvResult = this.aiEngine.neuralNetwork.crossValidate(validTrainingData, 5);
          console.log(`Cross-validation results: Avg Error = ${cvResult.averageError.toFixed(6)}, Std Dev = ${cvResult.standardDeviation.toFixed(6)}`);
          
          // Train with batch training
          const batchSize = Math.min(32, Math.floor(validTrainingData.length / 4));
          const epochs = Math.min(100, Math.max(10, Math.floor(1000 / validTrainingData.length)));
          
          console.log(`Training with batch size ${batchSize} for ${epochs} epochs`);
          const finalError = this.aiEngine.neuralNetwork.trainBatch(validTrainingData, epochs, batchSize);
          
          learningSession.trainingResults.neuralNetwork = {
            finalError: finalError,
            epochs: epochs,
            batchSize: batchSize,
            crossValidation: cvResult
          };
          
          console.log(`Neural network training completed. Final error: ${finalError.toFixed(6)}`);
        }

        learningSession.modelsTrained.push('neuralNetwork');
        console.log('Neural network training completed');
      }

      if (this.aiEngine.reinforcementAgent) {
        console.log('Training reinforcement agent...');
        // Train reinforcement agent on historical trades
        let totalReward = 0;
        let trainingSteps = 0;
        
        for (let i = 1; i < historicalData.length; i++) {
          const prevData = historicalData[i - 1];
          const currentData = historicalData[i];
          
          // Calculate reward based on price movement
          const priceChange = (currentData.close - prevData.close) / prevData.close;
          const reward = priceChange; // Simple reward function
          totalReward += reward;
          
          // State representation with more features
          const state = [
            prevData.open,
            prevData.high,
            prevData.low,
            prevData.close,
            prevData.volume,
            prevData.rsi || 50,
            prevData.macd || 0
          ];
          
          const nextState = [
            currentData.open,
            currentData.high,
            currentData.low,
            currentData.close,
            currentData.volume,
            currentData.rsi || 50,
            currentData.macd || 0
          ];
          
          // Action could be 0 (hold), 1 (buy), 2 (sell)
          const action = priceChange > 0 ? 1 : (priceChange < 0 ? 2 : 0);
          
          // Train the agent
          await this.aiEngine.reinforcementAgent.train(state, action, reward, nextState, false);
          trainingSteps++;
        }
        
        learningSession.trainingResults.reinforcementAgent = {
          totalReward: totalReward,
          trainingSteps: trainingSteps,
          averageReward: totalReward / trainingSteps
        };
        
        learningSession.modelsTrained.push('reinforcementAgent');
        console.log(`Reinforcement agent training completed. Total reward: ${totalReward.toFixed(4)}`);
      }

      // For transformer and ensemble, we would need more complex training
      // This is a simplified version for demonstration

      learningSession.endTime = new Date().toISOString();
      learningSession.status = 'completed';
      
      this.learningLog.push(learningSession);
      await this.saveLearningLog();
      
      console.log(`Training completed for ${symbol}`);
      return learningSession;
    } catch (error) {
      console.error('Error during training:', error);
      this.isLearning = false;
      throw error;
    } finally {
      this.isLearning = false;
    }
  }

  // Get learning log
  getLearningLog() {
    return this.learningLog;
  }

  // Get current learning status
  getLearningStatus() {
    return {
      isLearning: this.isLearning,
      logEntries: this.learningLog.length,
      lastSession: this.learningLog.length > 0 ? this.learningLog[this.learningLog.length - 1] : null
    };
  }

  // Continuous learning function
  async startContinuousLearning(symbol, interval = '1h') {
    console.log(`Starting continuous learning for ${symbol}`);
    
    // This would be called periodically to update the model with new data
    const learningInterval = setInterval(async () => {
      try {
        // In a real implementation, we would fetch new data and train incrementally
        console.log(`Continuous learning tick for ${symbol}`);
        
        // Add learning entry
        const learningEntry = {
          symbol,
          timestamp: new Date().toISOString(),
          type: 'continuous_learning_tick',
          status: 'active'
        };
        
        this.learningLog.push(learningEntry);
        await this.saveLearningLog();
      } catch (error) {
        console.error('Error in continuous learning:', error);
      }
    }, 60000); // Run every minute
    
    return learningInterval;
  }
}

module.exports = LearningService;