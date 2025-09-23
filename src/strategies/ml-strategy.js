// Machine Learning Based Trading Strategy
// This strategy uses a simple neural network to predict price movements

class MLStrategy {
  /**
   * Machine Learning Strategy Constructor
   * @param {Object} options - Strategy options
   */
  constructor(options = {}) {
    this.name = 'mlStrategy';
    this.description = 'Machine Learning Based Trading Strategy';
    this.options = {
      lookbackPeriod: options.lookbackPeriod || 20,
      threshold: options.threshold || 0.5,
      ...options
    };
  }

  /**
   * Prepare features for ML model
   * @param {Array} prices - Array of price data
   * @param {number} index - Current index
   * @returns {Array} Feature vector
   */
  prepareFeatures(prices, index) {
    if (index < this.options.lookbackPeriod) return null;
    
    const features = [];
    const lookback = prices.slice(index - this.options.lookbackPeriod, index);
    
    // Calculate various technical indicators as features
    // 1. Price changes
    for (let i = 1; i < lookback.length; i++) {
      features.push((lookback[i] - lookback[i-1]) / lookback[i-1]);
    }
    
    // 2. Moving averages
    const sma5 = lookback.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const sma10 = lookback.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const sma20 = lookback.reduce((a, b) => a + b, 0) / lookback.length;
    
    features.push(sma5 / lookback[lookback.length - 1]);
    features.push(sma10 / lookback[lookback.length - 1]);
    features.push(sma20 / lookback[lookback.length - 1]);
    
    // 3. RSI-like feature
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < lookback.length; i++) {
      const change = lookback[i] - lookback[i-1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const rs = losses !== 0 ? gains / losses : 0;
    features.push(rs);
    
    return features;
  }

  /**
   * Simple prediction function (in a real implementation, this would use an actual ML model)
   * @param {Array} features - Feature vector
   * @returns {number} Prediction score between 0 and 1
   */
  predict(features) {
    // This is a simplified prediction function
    // In a real implementation, this would use a trained ML model
    if (!features || features.length === 0) return 0.5;
    
    // Simple weighted sum of features
    const weights = Array(features.length).fill(0).map((_, i) => Math.random() * 2 - 1);
    let score = 0;
    for (let i = 0; i < features.length; i++) {
      score += features[i] * weights[i];
    }
    
    // Normalize to 0-1 range using sigmoid function
    return 1 / (1 + Math.exp(-score));
  }

  /**
   * Generate signals based on price data
   * @param {Array} prices - Array of price data
   * @returns {Object} Strategy results
   */
  generateSignals(prices) {
    const signals = [];
    const portfolio = [];
    
    if (prices.length <= this.options.lookbackPeriod) {
      return { signals, portfolio };
    }
    
    let position = 0; // 0 = no position, 1 = long position
    let cash = 10000;
    let shares = 0;
    let previousSignal = 'HOLD';
    
    for (let i = this.options.lookbackPeriod; i < prices.length; i++) {
      // Prepare features
      const features = this.prepareFeatures(prices, i);
      if (!features) {
        signals.push({
          time: i,
          price: prices[i],
          signal: 'HOLD',
          confidence: 0.5
        });
        continue;
      }
      
      // Make prediction
      const prediction = this.predict(features);
      
      // Generate signal based on prediction
      let signal = 'HOLD';
      if (prediction > this.options.threshold) {
        signal = 'BUY';
      } else if (prediction < (1 - this.options.threshold)) {
        signal = 'SELL';
      }
      
      signals.push({
        time: i,
        price: prices[i],
        signal: signal,
        confidence: prediction
      });
      
      // Simulate portfolio with transaction costs
      let transactionCost = 0;
      
      if (signal === 'BUY' && previousSignal !== 'BUY' && position === 0) {
        transactionCost = cash * 0.001;
        const netCash = cash - transactionCost;
        shares = netCash / prices[i];
        cash = 0;
        position = 1;
      } else if (signal === 'SELL' && previousSignal !== 'SELL' && position === 1) {
        const grossValue = shares * prices[i];
        transactionCost = grossValue * 0.001;
        cash = grossValue - transactionCost;
        shares = 0;
        position = 0;
      }
      
      previousSignal = signal;
      
      portfolio.push({
        time: i,
        price: prices[i],
        signal: signal,
        cash: cash,
        shares: shares,
        transactionCost: transactionCost,
        portfolioValue: cash + (shares * prices[i])
      });
    }
    
    return { signals, portfolio };
  }
}

module.exports = MLStrategy;