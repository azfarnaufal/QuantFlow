# Machine Learning Model Integration

This document describes how to integrate machine learning models into QuantFlow for price prediction and trading signal generation.

## Overview

QuantFlow supports integration with machine learning models for:
- Price prediction
- Trading signal generation
- Risk assessment
- Portfolio optimization

## Supported ML Frameworks

### TensorFlow.js

TensorFlow.js is used for client-side ML inference directly in Node.js:

```javascript
const tf = require('@tensorflow/tfjs-node');

class TensorFlowModel {
  constructor(modelPath) {
    this.model = null;
    this.loadModel(modelPath);
  }
  
  async loadModel(path) {
    try {
      this.model = await tf.loadLayersModel(`file://${path}`);
      console.log('Model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }
  
  async predict(inputData) {
    if (!this.model) {
      throw new Error('Model not loaded');
    }
    
    const inputTensor = tf.tensor2d([inputData]);
    const prediction = this.model.predict(inputTensor);
    const result = await prediction.data();
    
    inputTensor.dispose();
    prediction.dispose();
    
    return result[0];
  }
}
```

### Python Integration

For more complex models, Python integration is supported using child processes:

```javascript
const { spawn } = require('child_process');
const path = require('path');

class PythonMLModel {
  constructor(scriptPath) {
    this.scriptPath = scriptPath;
  }
  
  async predict(inputData) {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.scriptPath]);
      
      python.stdin.write(JSON.stringify(inputData));
      python.stdin.end();
      
      let result = '';
      python.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const prediction = JSON.parse(result);
            resolve(prediction);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Python script exited with code ${code}`));
        }
      });
      
      python.on('error', (error) => {
        reject(error);
      });
    });
  }
}
```

## Feature Engineering

### Technical Indicators as Features

```javascript
class FeatureExtractor {
  static extractFeatures(prices, volumes = null) {
    const features = [];
    
    // Price-based features
    features.push(prices[prices.length - 1]); // Current price
    features.push(calculateReturns(prices)); // Price returns
    features.push(calculateSMA(prices, 10)); // 10-period SMA
    features.push(calculateSMA(prices, 20)); // 20-period SMA
    features.push(calculateEMA(prices, 12)); // 12-period EMA
    features.push(calculateEMA(prices, 26)); // 26-period EMA
    features.push(calculateRSI(prices, 14)); // 14-period RSI
    features.push(calculateMACD(prices)); // MACD
    features.push(calculateBollingerBands(prices)); // Bollinger Bands
    
    // Volume-based features (if available)
    if (volumes && volumes.length > 0) {
      features.push(volumes[volumes.length - 1]); // Current volume
      features.push(calculateSMA(volumes, 10)); // 10-period volume SMA
      features.push(calculateVolumeOscillator(volumes)); // Volume oscillator
    }
    
    // Time-based features
    const now = new Date();
    features.push(now.getHours()); // Hour of day
    features.push(now.getDay()); // Day of week
    features.push(now.getMonth()); // Month
    
    return features;
  }
}
```

### Feature Scaling

```javascript
class FeatureScaler {
  constructor() {
    this.scalers = new Map();
  }
  
  fit(features) {
    for (let i = 0; i < features[0].length; i++) {
      const column = features.map(row => row[i]);
      const min = Math.min(...column);
      const max = Math.max(...column);
      this.scalers.set(i, { min, max });
    }
  }
  
  transform(features) {
    return features.map(row => {
      return row.map((value, index) => {
        const scaler = this.scalers.get(index);
        if (scaler) {
          return (value - scaler.min) / (scaler.max - scaler.min);
        }
        return value;
      });
    });
  }
  
  fitTransform(features) {
    this.fit(features);
    return this.transform(features);
  }
}
```

## Model Training Pipeline

### Data Preparation

```javascript
class DataPipeline {
  static prepareTrainingData(historicalData, lookbackPeriod = 20, predictionHorizon = 1) {
    const features = [];
    const targets = [];
    
    for (let i = lookbackPeriod; i < historicalData.length - predictionHorizon; i++) {
      // Extract features from lookback period
      const lookbackPrices = historicalData.slice(i - lookbackPeriod, i).map(d => d.price);
      const lookbackVolumes = historicalData.slice(i - lookbackPeriod, i).map(d => d.volume);
      
      const featureVector = FeatureExtractor.extractFeatures(lookbackPrices, lookbackVolumes);
      features.push(featureVector);
      
      // Define target (e.g., price direction)
      const currentPrice = historicalData[i].price;
      const futurePrice = historicalData[i + predictionHorizon].price;
      const target = futurePrice > currentPrice ? 1 : 0; // 1 for up, 0 for down
      targets.push(target);
    }
    
    return { features, targets };
  }
}
```

### Model Training

```javascript
const tf = require('@tensorflow/tfjs-node');

class PricePredictionModel {
  constructor() {
    this.model = this.createModel();
    this.scaler = new FeatureScaler();
  }
  
  createModel() {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      inputShape: [20], // Number of features
      units: 64,
      activation: 'relu'
    }));
    
    // Hidden layers
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    // Output layer
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }
  
  async train(features, targets, epochs = 100) {
    // Scale features
    const scaledFeatures = this.scaler.fitTransform(features);
    
    // Convert to tensors
    const xs = tf.tensor2d(scaledFeatures);
    const ys = tf.tensor1d(targets);
    
    // Train model
    await this.model.fit(xs, ys, {
      epochs: epochs,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
        }
      }
    });
    
    // Clean up tensors
    xs.dispose();
    ys.dispose();
  }
  
  async predict(features) {
    const scaledFeatures = this.scaler.transform([features]);
    const xs = tf.tensor2d(scaledFeatures);
    const prediction = this.model.predict(xs);
    const result = await prediction.data();
    
    xs.dispose();
    prediction.dispose();
    
    return result[0];
  }
  
  async saveModel(path) {
    await this.model.save(`file://${path}`);
  }
  
  async loadModel(path) {
    this.model = await tf.loadLayersModel(`file://${path}`);
  }
}
```

## Real-time Prediction Integration

### Streaming Prediction

```javascript
class RealTimePredictor {
  constructor(model) {
    this.model = model;
    this.priceBuffer = new Map(); // Buffer for each symbol
  }
  
  async processPriceUpdate(symbol, price, volume) {
    // Update price buffer
    if (!this.priceBuffer.has(symbol)) {
      this.priceBuffer.set(symbol, []);
    }
    
    this.priceBuffer.get(symbol).push({ price, volume, timestamp: Date.now() });
    
    // Keep only last 100 data points
    const buffer = this.priceBuffer.get(symbol);
    if (buffer.length > 100) {
      buffer.shift();
    }
    
    // Generate prediction when we have enough data
    if (buffer.length >= 20) {
      return await this.generatePrediction(symbol);
    }
    
    return null;
  }
  
  async generatePrediction(symbol) {
    const buffer = this.priceBuffer.get(symbol);
    const prices = buffer.map(d => d.price);
    const volumes = buffer.map(d => d.volume);
    
    // Extract features
    const features = FeatureExtractor.extractFeatures(prices, volumes);
    
    // Generate prediction
    const prediction = await this.model.predict(features);
    
    return {
      symbol: symbol,
      prediction: prediction,
      confidence: Math.abs(prediction - 0.5) * 2, // Confidence score
      timestamp: new Date()
    };
  }
}
```

## Strategy Integration

### ML-Based Trading Strategy

```javascript
class MLTradingStrategy {
  constructor(model, options = {}) {
    this.model = model;
    this.options = {
      confidenceThreshold: options.confidenceThreshold || 0.6,
      positionSize: options.positionSize || 0.1, // 10% of portfolio
      ...options
    };
  }
  
  async generateSignal(symbol, priceData) {
    // Extract features
    const features = FeatureExtractor.extractFeatures(
      priceData.prices, 
      priceData.volumes
    );
    
    // Generate prediction
    const prediction = await this.model.predict(features);
    const confidence = Math.abs(prediction - 0.5) * 2;
    
    // Generate signal based on prediction and confidence
    let signal = 'HOLD';
    if (confidence >= this.options.confidenceThreshold) {
      signal = prediction > 0.5 ? 'BUY' : 'SELL';
    }
    
    return {
      signal: signal,
      confidence: confidence,
      prediction: prediction,
      timestamp: new Date()
    };
  }
}
```

## Model Management

### Model Registry

```javascript
class ModelRegistry {
  constructor() {
    this.models = new Map();
  }
  
  registerModel(name, model) {
    this.models.set(name, model);
  }
  
  getModel(name) {
    return this.models.get(name);
  }
  
  listModels() {
    return Array.from(this.models.keys());
  }
  
  async saveModel(name, path) {
    const model = this.models.get(name);
    if (model && typeof model.saveModel === 'function') {
      await model.saveModel(path);
    }
  }
  
  async loadModel(name, path) {
    // Implementation depends on model type
    const model = new PricePredictionModel();
    await model.loadModel(path);
    this.registerModel(name, model);
  }
}
```

### Model Versioning

```javascript
class ModelVersioning {
  static getVersionedPath(basePath, version) {
    return `${basePath}/v${version}`;
  }
  
  static async saveWithVersion(model, basePath, version) {
    const versionedPath = this.getVersionedPath(basePath, version);
    await model.saveModel(versionedPath);
  }
  
  static async loadWithVersion(modelName, basePath, version) {
    const versionedPath = this.getVersionedPath(basePath, version);
    const registry = new ModelRegistry();
    await registry.loadModel(modelName, versionedPath);
    return registry.getModel(modelName);
  }
}
```

## Performance Monitoring

### Prediction Accuracy Tracking

```javascript
class PredictionTracker {
  constructor() {
    this.predictions = [];
  }
  
  recordPrediction(symbol, prediction, actualOutcome) {
    this.predictions.push({
      symbol: symbol,
      prediction: prediction,
      actual: actualOutcome,
      timestamp: new Date(),
      accuracy: prediction > 0.5 ? (actualOutcome === 1 ? 1 : 0) : (actualOutcome === 0 ? 1 : 0)
    });
  }
  
  getAccuracyStats(symbol = null) {
    let predictions = this.predictions;
    if (symbol) {
      predictions = predictions.filter(p => p.symbol === symbol);
    }
    
    if (predictions.length === 0) return { accuracy: 0, count: 0 };
    
    const correct = predictions.filter(p => p.accuracy === 1).length;
    const accuracy = correct / predictions.length;
    
    return {
      accuracy: accuracy,
      count: predictions.length,
      correct: correct,
      incorrect: predictions.length - correct
    };
  }
}
```

## API Integration

### Model Management API

```javascript
// POST /api/ml/models
app.post('/api/ml/models', async (req, res) => {
  try {
    const { name, type, config } = req.body;
    
    let model;
    switch (type) {
      case 'tensorflow':
        model = new TensorFlowModel(config.path);
        break;
      case 'python':
        model = new PythonMLModel(config.scriptPath);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported model type' });
    }
    
    modelRegistry.registerModel(name, model);
    res.json({ message: 'Model registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ml/predict
app.post('/api/ml/predict', async (req, res) => {
  try {
    const { model, symbol, data } = req.body;
    
    const mlModel = modelRegistry.getModel(model);
    if (!mlModel) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const prediction = await mlModel.predict(data);
    res.json({ prediction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Testing

### Unit Tests

```javascript
describe('ML Integration', () => {
  describe('Feature Extraction', () => {
    it('should extract correct number of features', () => {
      const prices = [100, 101, 102, 101, 100];
      const volumes = [1000, 1100, 1200, 1100, 1000];
      
      const features = FeatureExtractor.extractFeatures(prices, volumes);
      expect(features.length).toBe(20); // Expected number of features
    });
  });
  
  describe('Model Prediction', () => {
    it('should generate prediction between 0 and 1', async () => {
      const model = new PricePredictionModel();
      const features = Array(20).fill(0.5); // Mock features
      
      const prediction = await model.predict(features);
      expect(prediction).toBeGreaterThanOrEqual(0);
      expect(prediction).toBeLessThanOrEqual(1);
    });
  });
});
```

## Deployment Considerations

### Model Serving

1. **Containerization**: Package models with their dependencies in Docker containers
2. **Model Registry**: Use a central model registry for version management
3. **Load Balancing**: Distribute prediction requests across multiple model instances
4. **Caching**: Cache predictions for identical inputs to reduce computation

### Resource Management

1. **Memory**: Monitor and limit memory usage of ML models
2. **CPU**: Use CPU affinity and process isolation for intensive computations
3. **GPU**: Utilize GPU acceleration when available
4. **Scaling**: Auto-scale model instances based on request volume

### Security

1. **Model Integrity**: Verify model files haven't been tampered with
2. **Input Validation**: Validate all inputs to prevent adversarial attacks
3. **Access Control**: Restrict access to model management APIs
4. **Encryption**: Encrypt model files at rest and in transit