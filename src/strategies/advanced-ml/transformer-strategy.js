// Transformer-Based Trading Strategy
// This strategy uses Transformer architecture for price prediction

const tf = require('@tensorflow/tfjs');

class TransformerStrategy {
  /**
   * Transformer Strategy Constructor
   * @param {Object} options - Strategy options
   */
  constructor(options = {}) {
    this.name = 'transformerStrategy';
    this.description = 'Transformer-Based Trading Strategy';
    this.options = {
      lookbackPeriod: options.lookbackPeriod || 60,
      predictionHorizon: options.predictionHorizon || 1,
      dModel: options.dModel || 64, // Model dimension
      numHeads: options.numHeads || 8, // Number of attention heads
      numLayers: options.numLayers || 2, // Number of transformer layers
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
   * Positional encoding for transformer
   * @param {number} position - Position index
   * @param {number} dModel - Model dimension
   * @returns {tf.Tensor} Positional encoding tensor
   */
  positionalEncoding(position, dModel) {
    const angleRates = [];
    for (let i = 0; i < dModel; i += 2) {
      angleRates.push(1 / Math.pow(10000, i / dModel));
    }
    
    const angleRads = [];
    for (let i = 0; i < angleRates.length; i++) {
      angleRads.push(position * angleRates[i]);
    }
    
    const sinCos = [];
    for (let i = 0; i < angleRads.length; i++) {
      sinCos.push(Math.sin(angleRads[i]));
      sinCos.push(Math.cos(angleRads[i]));
    }
    
    return tf.tensor1d(sinCos);
  }

  /**
   * Prepare data for Transformer model
   * @param {Array} prices - Array of price data
   * @returns {Object} Normalized data with features and targets
   */
  prepareData(prices) {
    if (prices.length < this.options.lookbackPeriod + this.options.predictionHorizon) {
      throw new Error('Insufficient data for Transformer model');
    }

    // Normalize prices to [0, 1] range
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
    
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
   * Create a simple attention layer
   * @param {number} dModel - Model dimension
   * @param {number} numHeads - Number of attention heads
   */
  createAttentionLayer(dModel, numHeads) {
    // In a full implementation, this would be a proper multi-head attention
    // For simplicity, we'll use a dense layer that mimics attention behavior
    return tf.layers.dense({
      units: dModel,
      activation: 'relu'
    });
  }

  /**
   * Create Transformer model
   */
  createModel() {
    // Input layer
    const input = tf.input({ shape: [this.options.lookbackPeriod] });
    
    // Reshape for dense layers
    let x = tf.layers.reshape({ targetShape: [this.options.lookbackPeriod, 1] }).apply(input);
    
    // Add positional encoding
    // In a full implementation, we would add proper positional encoding
    // For now, we'll add a dense layer to increase dimensionality
    x = tf.layers.dense({ units: this.options.dModel }).apply(x);
    
    // Transformer layers
    for (let i = 0; i < this.options.numLayers; i++) {
      // Attention layer
      const attention = this.createAttentionLayer(this.options.dModel, this.options.numHeads);
      x = attention.apply(x);
      
      // Feed forward layer
      x = tf.layers.dense({ units: this.options.dModel * 2, activation: 'relu' }).apply(x);
      x = tf.layers.dense({ units: this.options.dModel }).apply(x);
    }
    
    // Global average pooling
    x = tf.layers.globalAveragePooling1d().apply(x);
    
    // Output layer
    const output = tf.layers.dense({ units: 1 }).apply(x);
    
    // Create model
    const model = tf.model({ inputs: input, outputs: output });
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.options.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    return model;
  }

  /**
   * Train Transformer model
   * @param {Array} prices - Array of price data
   */
  async train(prices) {
    try {
      // Prepare data
      const { features, targets } = this.prepareData(prices);
      
      // Create model if not exists
      if (!this.model) {
        this.model = this.createModel();
      }
      
      // Train model
      await this.model.fit(features, targets, {
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
      
      this.isTrained = true;
      console.log('Transformer model trained successfully');
    } catch (error) {
      console.error('Error training Transformer model:', error);
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
    
    // Normalize using the last batch of data for normalization
    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
    
    const normalizedPrices = recentPrices.map(price => (price - minPrice) / priceRange);
    
    // Reshape for prediction
    const inputTensor = tf.tensor2d([normalizedPrices], [1, this.options.lookbackPeriod]);
    
    // Make prediction
    const prediction = this.model.predict(inputTensor);
    const predictedValue = (await prediction.data())[0];
    
    // Denormalize prediction
    const denormalizedPrediction = predictedValue * priceRange + minPrice;
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    return denormalizedPrediction;
  }

  /**
   * Generate trading signals based on Transformer predictions
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
        console.log('Training Transformer model...');
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
      console.error('Error generating Transformer signals:', error);
      return { signals: [], portfolio: [] };
    }
  }
}

module.exports = TransformerStrategy;