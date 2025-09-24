// LSTM-Based Trading Strategy
// This strategy uses Long Short-Term Memory networks for price prediction

const tf = require('@tensorflow/tfjs');

class LSTMStrategy {
  /**
   * LSTM Strategy Constructor
   * @param {Object} options - Strategy options
   */
  constructor(options = {}) {
    this.name = 'lstmStrategy';
    this.description = 'LSTM-Based Trading Strategy';
    this.options = {
      lookbackPeriod: options.lookbackPeriod || 60,
      predictionHorizon: options.predictionHorizon || 1,
      hiddenUnits: options.hiddenUnits || 50,
      epochs: options.epochs || 100,
      batchSize: options.batchSize || 32,
      learningRate: options.learningRate || 0.001,
      threshold: options.threshold || 0.01, // 1% threshold for trading signals
      ...options
    };
    
    // Initialize model
    this.model = null;
    this.isTrained = false;
  }

  /**
   * Prepare data for LSTM model
   * @param {Array} prices - Array of price data
   * @returns {Object} Normalized data with features and targets
   */
  prepareData(prices) {
    if (prices.length < this.options.lookbackPeriod + this.options.predictionHorizon) {
      throw new Error('Insufficient data for LSTM model');
    }

    // Normalize prices to [0, 1] range
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const normalizedPrices = prices.map(price => (price - minPrice) / priceRange);

    const features = [];
    const targets = [];

    // Create sequences for training
    for (let i = 0; i <= normalizedPrices.length - this.options.lookbackPeriod - this.options.predictionHorizon; i++) {
      // Extract lookback period prices as features
      const sequence = normalizedPrices.slice(i, i + this.options.lookbackPeriod);
      features.push(sequence);
      
      // Target is the price after prediction horizon
      const target = normalizedPrices[i + this.options.lookbackPeriod + this.options.predictionHorizon - 1];
      targets.push(target);
    }

    return {
      features: tf.tensor2d(features, [features.length, this.options.lookbackPeriod]),
      targets: tf.tensor1d(targets),
      minPrice: minPrice,
      priceRange: priceRange
    };
  }

  /**
   * Create LSTM model
   */
  createModel() {
    const model = tf.sequential();
    
    // Add LSTM layer
    model.add(tf.layers.lstm({
      units: this.options.hiddenUnits,
      inputShape: [this.options.lookbackPeriod, 1],
      returnSequences: false
    }));
    
    // Add dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Add dense layer for output
    model.add(tf.layers.dense({ units: 1 }));
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.options.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    return model;
  }

  /**
   * Train LSTM model
   * @param {Array} prices - Array of price data
   */
  async train(prices) {
    try {
      // Prepare data
      const { features, targets } = this.prepareData(prices);
      
      // Reshape features for LSTM (samples, time steps, features)
      const reshapedFeatures = features.reshape([features.shape[0], features.shape[1], 1]);
      
      // Create model if not exists
      if (!this.model) {
        this.model = this.createModel();
      }
      
      // Train model
      await this.model.fit(reshapedFeatures, targets, {
        epochs: this.options.epochs,
        batchSize: this.options.batchSize,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
            }
          }
        }
      });
      
      // Clean up tensors
      features.dispose();
      targets.dispose();
      reshapedFeatures.dispose();
      
      this.isTrained = true;
      console.log('LSTM model trained successfully');
    } catch (error) {
      console.error('Error training LSTM model:', error);
      throw error;
    }
  }

  /**
   * Predict next price using trained model
   * @param {Array} prices - Recent price data
   * @returns {number} Predicted normalized price
   */
  async predict(prices) {
    if (!this.isTrained || !this.model) {
      throw new Error('Model not trained yet');
    }

    if (prices.length < this.options.lookbackPeriod) {
      throw new Error('Insufficient data for prediction');
    }

    // Take the last lookbackPeriod prices
    const recentPrices = prices.slice(-this.options.lookbackPeriod);
    
    // Normalize using training parameters (in a real implementation, you'd save these)
    // For now, we'll use the last batch of data for normalization
    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
    
    const normalizedPrices = recentPrices.map(price => (price - minPrice) / priceRange);
    
    // Reshape for prediction
    const inputTensor = tf.tensor2d([normalizedPrices], [1, this.options.lookbackPeriod]);
    const reshapedInput = inputTensor.reshape([1, this.options.lookbackPeriod, 1]);
    
    // Make prediction
    const prediction = this.model.predict(reshapedInput);
    const predictedValue = (await prediction.data())[0];
    
    // Denormalize prediction
    const denormalizedPrediction = predictedValue * priceRange + minPrice;
    
    // Clean up tensors
    inputTensor.dispose();
    reshapedInput.dispose();
    prediction.dispose();
    
    return denormalizedPrediction;
  }

  /**
   * Generate trading signals based on LSTM predictions
   * @param {Array} prices - Array of price data
   * @returns {Object} Strategy results with signals and portfolio
   */
  async generateSignals(prices) {
    const signals = [];
    const portfolio = [];
    
    if (prices.length <= this.options.lookbackPeriod) {
      return { signals, portfolio };
    }
    
    try {
      // Train model if not already trained
      if (!this.isTrained) {
        console.log('Training LSTM model...');
        await this.train(prices);
      }
      
      let position = 0; // 0 = no position, 1 = long position
      let cash = 10000;
      let shares = 0;
      let previousSignal = 'HOLD';
      
      // Generate signals for each time point
      for (let i = this.options.lookbackPeriod; i < prices.length - this.options.predictionHorizon; i++) {
        // Get historical data up to current point
        const historicalPrices = prices.slice(0, i + 1);
        
        // Predict next price
        const predictedPrice = await this.predict(historicalPrices);
        const currentPrice = prices[i];
        
        // Calculate expected return
        const expectedReturn = (predictedPrice - currentPrice) / currentPrice;
        
        // Generate signal based on expected return
        let signal = 'HOLD';
        if (expectedReturn > this.options.threshold) {
          signal = 'BUY';
        } else if (expectedReturn < -this.options.threshold) {
          signal = 'SELL';
        }
        
        signals.push({
          time: i,
          price: currentPrice,
          predictedPrice: predictedPrice,
          expectedReturn: expectedReturn,
          signal: signal,
          confidence: Math.abs(expectedReturn)
        });
        
        // Simulate portfolio with transaction costs
        let transactionCost = 0;
        
        if (signal === 'BUY' && previousSignal !== 'BUY' && position === 0) {
          transactionCost = cash * 0.001; // 0.1% transaction cost
          const netCash = cash - transactionCost;
          shares = netCash / currentPrice;
          cash = 0;
          position = 1;
        } else if (signal === 'SELL' && previousSignal !== 'SELL' && position === 1) {
          const grossValue = shares * currentPrice;
          transactionCost = grossValue * 0.001; // 0.1% transaction cost
          cash = grossValue - transactionCost;
          shares = 0;
          position = 0;
        }
        
        previousSignal = signal;
        
        portfolio.push({
          time: i,
          price: currentPrice,
          signal: signal,
          cash: cash,
          shares: shares,
          transactionCost: transactionCost,
          portfolioValue: cash + (shares * currentPrice)
        });
      }
      
      return { signals, portfolio };
    } catch (error) {
      console.error('Error generating LSTM signals:', error);
      return { signals: [], portfolio: [] };
    }
  }
}

module.exports = LSTMStrategy;