// Simple Machine Learning Price Predictor
// This module implements basic predictive models for cryptocurrency price forecasting

class SimpleMLPredictor {
  constructor() {
    this.sequenceLength = 10; // Use 10 time steps for prediction
  }

  /**
   * Prepare data for training/prediction
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
   * Simple linear regression implementation
   * @param {number[]} x - Independent variables
   * @param {number[]} y - Dependent variables
   * @returns {Object} Object with slope and intercept
   */
  linearRegression(x, y) {
    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  /**
   * Train a simple linear regression model on price trends
   * @param {number[]} prices - Array of historical prices
   * @returns {Object} Model parameters
   */
  trainLinearRegression(prices) {
    // Create time indices
    const timeIndices = prices.map((_, i) => i);
    
    // Calculate linear regression
    const model = this.linearRegression(timeIndices, prices);
    
    // Calculate R-squared
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const totalSumSquares = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
    const residualSumSquares = prices.reduce((sum, price, i) => {
      const predicted = model.slope * i + model.intercept;
      return sum + Math.pow(price - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    
    return {
      slope: model.slope,
      intercept: model.intercept,
      rSquared: rSquared
    };
  }

  /**
   * Predict future prices using linear regression
   * @param {Object} model - Trained model parameters
   * @param {number} steps - Number of future steps to predict
   * @param {number} lastTimeIndex - Last time index in training data
   * @returns {number[]} Array of predicted prices
   */
  predictLinearRegression(model, steps, lastTimeIndex) {
    const predictions = [];
    
    for (let i = 1; i <= steps; i++) {
      const timeIndex = lastTimeIndex + i;
      const predictedPrice = model.slope * timeIndex + model.intercept;
      predictions.push(predictedPrice);
    }
    
    return predictions;
  }

  /**
   * Simple moving average prediction
   * @param {number[]} prices - Array of historical prices
   * @param {number} period - Moving average period
   * @returns {number} Predicted next price
   */
  predictSMA(prices, period = 10) {
    if (prices.length < period) {
      return prices[prices.length - 1]; // Return last price if not enough data
    }
    
    const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
    return sma;
  }

  /**
   * Exponential smoothing prediction
   * @param {number[]} prices - Array of historical prices
   * @param {number} alpha - Smoothing factor (0 < alpha < 1)
   * @returns {number} Predicted next price
   */
  predictExponentialSmoothing(prices, alpha = 0.3) {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    let smoothed = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      smoothed = alpha * prices[i] + (1 - alpha) * smoothed;
    }
    
    return smoothed;
  }

  /**
   * Calculate prediction confidence intervals using historical errors
   * @param {number[]} actual - Array of actual prices
   * @param {number[]} predicted - Array of predicted prices
   * @param {number} confidence - Confidence level (0.95 for 95%)
   * @returns {Object} Object with mean error and confidence intervals
   */
  calculateConfidenceIntervals(actual, predicted, confidence = 0.95) {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have the same length');
    }
    
    // Calculate errors
    const errors = actual.map((actualPrice, i) => Math.abs(actualPrice - predicted[i]));
    const meanError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    
    // Calculate confidence intervals (simple approach)
    const zScore = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90% confidence
    const marginOfError = zScore * meanError;
    
    return {
      meanError: parseFloat(meanError.toFixed(4)),
      marginOfError: parseFloat(marginOfError.toFixed(4))
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
   * Ensemble prediction combining multiple methods
   * @param {number[]} prices - Array of historical prices
   * @returns {Object} Ensemble prediction with individual method results
   */
  ensemblePredict(prices) {
    // Linear regression prediction
    const lrModel = this.trainLinearRegression(prices);
    const lrPrediction = this.predictLinearRegression(lrModel, 1, prices.length - 1)[0];
    
    // Simple moving average prediction
    const smaPrediction = this.predictSMA(prices, 10);
    
    // Exponential smoothing prediction
    const esPrediction = this.predictExponentialSmoothing(prices, 0.3);
    
    // Weighted ensemble (simple average)
    const ensemblePrediction = (lrPrediction + smaPrediction + esPrediction) / 3;
    
    return {
      linearRegression: parseFloat(lrPrediction.toFixed(4)),
      simpleMovingAverage: parseFloat(smaPrediction.toFixed(4)),
      exponentialSmoothing: parseFloat(esPrediction.toFixed(4)),
      ensemble: parseFloat(ensemblePrediction.toFixed(4)),
      modelInfo: {
        linearRegression: {
          slope: parseFloat(lrModel.slope.toFixed(6)),
          intercept: parseFloat(lrModel.intercept.toFixed(4)),
          rSquared: parseFloat(lrModel.rSquared.toFixed(4))
        }
      }
    };
  }
}

module.exports = SimpleMLPredictor;