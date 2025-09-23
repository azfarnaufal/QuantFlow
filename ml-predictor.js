// Machine Learning Price Predictor
// This module implements LSTM neural networks for cryptocurrency price forecasting

const tf = require('@tensorflow/tfjs');
const { StandardScaler } = require('danfojs');

class MLPredictor {
  constructor() {
    this.model = null;
    this.scaler = new StandardScaler();
    this.sequenceLength = 60; // Use 60 time steps for prediction
  }

  /**
   * Prepare data for LSTM training
   * @param {number[]} prices - Array of historical prices
   * @returns {Object} Object containing training data (X, y)
   */
  prepareData(prices) {
    const X = [];
    const y = [];
    
    // Create sequences of prices for training
    for (let i = this.sequenceLength; i < prices.length; i++) {
      X.push(prices.slice(i - this.sequenceLength, i));
      y.push(prices[i]);
    }
    
    return { X, y };
  }

  /**
   * Create and compile LSTM model
   * @returns {tf.Sequential} Compiled TensorFlow model
   */
  createModel() {
    const model = tf.sequential();
    
    // First LSTM layer with return sequences for stacking
    model.add(tf.layers.lstm({
      units: 50,
      returnSequences: true,
      inputShape: [this.sequenceLength, 1]
    }));
    
    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Second LSTM layer
    model.add(tf.layers.lstm({
      units: 50,
      returnSequences: false
    }));
    
    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Dense layer for output
    model.add(tf.layers.dense({ units: 1 }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    return model;
  }

  /**
   * Train the LSTM model on historical price data
   * @param {number[]} prices - Array of historical prices
   * @param {Object} options - Training options
   * @returns {Object} Training results
   */
  async train(prices, options = {}) {
    const epochs = options.epochs || 50;
    const batchSize = options.batchSize || 32;
    const validationSplit = options.validationSplit || 0.1;
    
    // Prepare data
    const { X, y } = this.prepareData(prices);
    
    if (X.length === 0) {
      throw new Error('Not enough data for training');
    }
    
    // Convert to tensors
    const X_tensor = tf.tensor3d(X, [X.length, this.sequenceLength, 1]);
    const y_tensor = tf.tensor2d(y, [y.length, 1]);
    
    // Create model if it doesn't exist
    if (!this.model) {
      this.model = this.createModel();
    }
    
    // Train model
    const history = await this.model.fit(X_tensor, y_tensor, {
      epochs,
      batchSize,
      validationSplit,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
        }
      }
    });
    
    // Clean up tensors
    X_tensor.dispose();
    y_tensor.dispose();
    
    return {
      history: history.history,
      epochs: epochs
    };
  }

  /**
   * Predict future prices using the trained model
   * @param {number[]} prices - Array of recent prices (at least sequenceLength)
   * @param {number} steps - Number of future steps to predict
   * @returns {Promise<number[]>} Array of predicted prices
   */
  async predict(prices, steps = 1) {
    if (!this.model) {
      throw new Error('Model not trained yet');
    }
    
    if (prices.length < this.sequenceLength) {
      throw new Error(`Need at least ${this.sequenceLength} prices for prediction`);
    }
    
    const predictions = [];
    let inputSequence = [...prices.slice(-this.sequenceLength)];
    
    for (let i = 0; i < steps; i++) {
      // Reshape input for prediction
      const inputTensor = tf.tensor3d([inputSequence], [1, this.sequenceLength, 1]);
      
      // Make prediction
      const prediction = this.model.predict(inputTensor);
      const predictedValue = (await prediction.data())[0];
      
      // Clean up tensor
      prediction.dispose();
      inputTensor.dispose();
      
      predictions.push(predictedValue);
      
      // Update input sequence for next prediction
      inputSequence.shift();
      inputSequence.push(predictedValue);
    }
    
    return predictions;
  }

  /**
   * Calculate prediction confidence intervals
   * @param {number[]} prices - Array of recent prices
   * @param {number} steps - Number of future steps to predict
   * @param {number} confidence - Confidence level (0.95 for 95%)
   * @returns {Promise<Object>} Object with predictions and confidence intervals
   */
  async predictWithConfidence(prices, steps = 1, confidence = 0.95) {
    // For simplicity, we'll use a basic approach to estimate confidence
    // In a real implementation, you might use Monte Carlo dropout or other methods
    
    const predictions = await this.predict(prices, steps);
    
    // Calculate historical error for confidence intervals
    const { X, y } = this.prepareData(prices);
    
    if (X.length === 0) {
      return {
        predictions,
        confidenceIntervals: predictions.map(() => ({ lower: null, upper: null }))
      };
    }
    
    // Get model predictions for historical data to calculate error
    const historicalPredictions = [];
    for (let i = 0; i < Math.min(100, X.length); i++) {
      const inputTensor = tf.tensor3d([X[X.length - 1 - i]], [1, this.sequenceLength, 1]);
      const prediction = this.model.predict(inputTensor);
      const predictedValue = (await prediction.data())[0];
      historicalPredictions.push(predictedValue);
      prediction.dispose();
      inputTensor.dispose();
    }
    
    // Calculate mean absolute error
    const recentActual = y.slice(-historicalPredictions.length);
    const errors = recentActual.map((actual, i) => Math.abs(actual - historicalPredictions[i]));
    const meanError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    
    // Calculate confidence intervals (simple approach)
    const zScore = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90% confidence
    const marginOfError = zScore * meanError;
    
    const confidenceIntervals = predictions.map(prediction => ({
      lower: prediction - marginOfError,
      upper: prediction + marginOfError
    }));
    
    return {
      predictions,
      confidenceIntervals,
      meanError
    };
  }

  /**
   * Calculate prediction accuracy metrics
   * @param {number[]} actual - Array of actual prices
   * @param {number[]} predicted - Array of predicted prices
   * @returns {Object} Accuracy metrics
   */
  calculateAccuracyMetrics(actual, predicted) {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have the same length');
    }
    
    // Mean Absolute Error (MAE)
    const mae = actual.reduce((sum, _, i) => sum + Math.abs(actual[i] - predicted[i]), 0) / actual.length;
    
    // Mean Squared Error (MSE)
    const mse = actual.reduce((sum, _, i) => sum + Math.pow(actual[i] - predicted[i], 2), 0) / actual.length;
    
    // Root Mean Squared Error (RMSE)
    const rmse = Math.sqrt(mse);
    
    // Mean Absolute Percentage Error (MAPE)
    const mape = actual.reduce((sum, _, i) => {
      if (actual[i] === 0) return sum;
      return sum + Math.abs((actual[i] - predicted[i]) / actual[i]);
    }, 0) / actual.length * 100;
    
    return {
      mae: parseFloat(mae.toFixed(4)),
      mse: parseFloat(mse.toFixed(4)),
      rmse: parseFloat(rmse.toFixed(4)),
      mape: parseFloat(mape.toFixed(4))
    };
  }

  /**
   * Save the trained model
   * @param {string} path - Path to save the model
   */
  async saveModel(path) {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    await this.model.save(`file://${path}`);
  }

  /**
   * Load a trained model
   * @param {string} path - Path to load the model from
   */
  async loadModel(path) {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
  }
}

module.exports = MLPredictor;