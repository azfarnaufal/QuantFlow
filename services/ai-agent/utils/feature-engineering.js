const TechnicalIndicators = require('./technical-indicators');

class FeatureEngineering {
  constructor() {
    this.indicators = TechnicalIndicators;
  }

  // Create features from raw price data
  createFeatures(priceData, volumeData = null, highData = null, lowData = null) {
    if (!priceData || priceData.length === 0) {
      throw new Error('Price data is required');
    }

    const features = [];
    
    // Basic price features
    features.push(this.calculateReturns(priceData));
    features.push(this.calculateVolatility(priceData, 10));
    features.push(this.calculateVolatility(priceData, 30));
    
    // Technical indicators
    features.push(this.indicators.calculateRSI(priceData, 14));
    features.push(this.indicators.calculateMACD(priceData));
    features.push(this.indicators.calculateBollingerBands(priceData));
    
    // Advanced indicators
    features.push(this.calculateOBV(priceData, volumeData));
    features.push(this.calculateStochasticOscillator(priceData, highData, lowData, 14));
    features.push(this.calculateWilliamsR(priceData, highData, lowData, 14));
    
    // Volume features (if available)
    if (volumeData && volumeData.length > 0) {
      features.push(this.calculateVolumeChange(volumeData));
      features.push(this.calculateVolumeVolatility(volumeData, 10));
      features.push(this.calculateVolumePriceTrend(priceData, volumeData));
    }
    
    // Time-based features
    features.push(this.calculateTimeFeatures(priceData.length));
    
    // Market regime features
    features.push(this.calculateMarketRegime(priceData));
    
    // Momentum features
    features.push(this.calculateMomentum(priceData, 10));
    features.push(this.calculateRateOfChange(priceData, 10));
    
    // Pattern recognition features
    features.push(this.calculateCandlestickPatterns(priceData, highData, lowData, volumeData));
    
    return this.flattenFeatures(features);
  }

  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return returns;
  }

  calculateVolatility(prices, period) {
    if (prices.length < period) return 0;
    
    const returns = this.calculateReturns(prices.slice(-period));
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  calculateVolumeChange(volumes) {
    if (volumes.length < 2) return 0;
    const current = volumes[volumes.length - 1];
    const previous = volumes[volumes.length - 2];
    return (current - previous) / previous;
  }

  calculateVolumeVolatility(volumes, period) {
    if (volumes.length < period) return 0;
    
    const recentVolumes = volumes.slice(-period);
    const mean = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const variance = recentVolumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentVolumes.length;
    return Math.sqrt(variance);
  }

  calculateTimeFeatures(dataLength) {
    const now = new Date();
    return [
      now.getHours() / 24, // Hour of day
      now.getDay() / 7,    // Day of week
      now.getMonth() / 12  // Month of year
    ];
  }

  calculateMarketRegime(prices) {
    if (prices.length < 50) return [0, 0, 0]; // Not enough data
    
    // Simple regime detection based on recent trend and volatility
    const recentPrices = prices.slice(-20);
    const trend = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    const volatility = this.calculateVolatility(recentPrices, recentPrices.length);
    
    // Regime classification
    let bull = 0, bear = 0, sideways = 0;
    
    if (trend > 0.02 && volatility < 0.05) {
      bull = 1; // Bull market
    } else if (trend < -0.02 && volatility < 0.05) {
      bear = 1; // Bear market
    } else {
      sideways = 1; // Sideways/uncertain market
    }
    
    return [bull, bear, sideways];
  }

  flattenFeatures(featureArrays) {
    const flattened = [];
    for (const featureArray of featureArrays) {
      if (Array.isArray(featureArray)) {
        flattened.push(...featureArray);
      } else if (featureArray && typeof featureArray === 'object') {
        // Handle objects like MACD, Bollinger Bands, etc.
        Object.values(featureArray).forEach(value => {
          if (typeof value === 'number') {
            flattened.push(value);
          }
        });
      } else {
        flattened.push(featureArray);
      }
    }
    return flattened;
  }

  // Normalize features for ML models
  normalizeFeatures(features) {
    const normalized = [];
    const means = [];
    const stds = [];
    
    // Calculate mean and standard deviation for each feature
    for (let i = 0; i < features[0].length; i++) {
      const values = features.map(row => row[i]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      
      means.push(mean);
      stds.push(std);
    }
    
    // Normalize each feature
    for (const featureRow of features) {
      const normalizedRow = [];
      for (let i = 0; i < featureRow.length; i++) {
        if (stds[i] !== 0) {
          normalizedRow.push((featureRow[i] - means[i]) / stds[i]);
        } else {
          normalizedRow.push(0);
        }
      }
      normalized.push(normalizedRow);
    }
    
    return {
      features: normalized,
      means,
      stds
    };
  }

  // Create time series sequences for LSTM models
  createTimeSeriesSequences(data, sequenceLength) {
    const sequences = [];
    const targets = [];
    
    for (let i = sequenceLength; i < data.length; i++) {
      sequences.push(data.slice(i - sequenceLength, i));
      targets.push(data[i]);
    }
    
    return { sequences, targets };
  }

  // On-Balance Volume (OBV)
  calculateOBV(prices, volumes) {
    if (!prices || !volumes || prices.length !== volumes.length || prices.length < 2) return 0;
    
    let obv = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i-1]) {
        obv += volumes[i];
      } else if (prices[i] < prices[i-1]) {
        obv -= volumes[i];
      }
      // If prices are equal, OBV doesn't change
    }
    
    return obv;
  }

  // Stochastic Oscillator
  calculateStochasticOscillator(prices, highs, lows, period) {
    if (!prices || !highs || !lows || prices.length < period) return null;
    
    const currentPrice = prices[prices.length - 1];
    const lowestLow = Math.min(...lows.slice(-period));
    const highestHigh = Math.max(...highs.slice(-period));
    
    if (highestHigh - lowestLow === 0) return 0;
    
    return ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
  }

  // Williams %R
  calculateWilliamsR(prices, highs, lows, period) {
    if (!prices || !highs || !lows || prices.length < period) return null;
    
    const currentPrice = prices[prices.length - 1];
    const lowestLow = Math.min(...lows.slice(-period));
    const highestHigh = Math.max(...highs.slice(-period));
    
    if (highestHigh - lowestLow === 0) return 0;
    
    return ((highestHigh - currentPrice) / (highestHigh - lowestLow)) * -100;
  }

  // Volume Price Trend (VPT)
  calculateVolumePriceTrend(prices, volumes) {
    if (!prices || !volumes || prices.length !== volumes.length || prices.length < 2) return 0;
    
    let vpt = 0;
    for (let i = 1; i < prices.length; i++) {
      const priceChange = (prices[i] - prices[i-1]) / prices[i-1];
      vpt += priceChange * volumes[i];
    }
    
    return vpt;
  }

  // Momentum
  calculateMomentum(prices, period) {
    if (prices.length < period + 1) return 0;
    return prices[prices.length - 1] - prices[prices.length - 1 - period];
  }

  // Rate of Change (ROC)
  calculateRateOfChange(prices, period) {
    if (prices.length < period + 1) return 0;
    return ((prices[prices.length - 1] - prices[prices.length - 1 - period]) / 
            prices[prices.length - 1 - period]) * 100;
  }

  // Simple candlestick pattern recognition
  calculateCandlestickPatterns(prices, highs, lows, volumes) {
    if (!prices || !highs || !lows || !volumes || 
        prices.length < 3 || 
        prices.length !== highs.length || 
        prices.length !== lows.length || 
        prices.length !== volumes.length) {
      return [0, 0, 0]; // No pattern detected
    }
    
    const len = prices.length;
    const current = len - 1;
    const previous = len - 2;
    const prevPrevious = len - 3;
    
    // Doji pattern (open ≈ close)
    const doji = Math.abs(prices[current] - prices[previous]) / prices[previous] < 0.001 ? 1 : 0;
    
    // Hammer pattern (long lower shadow, small body)
    const hammer = ((prices[current] - lows[current]) > (highs[current] - prices[current]) * 2) ? 1 : 0;
    
    // Shooting star pattern (long upper shadow, small body)
    const shootingStar = ((highs[current] - prices[current]) > (prices[current] - lows[current]) * 2) ? 1 : 0;
    
    return [doji, hammer, shootingStar];
  }
}

module.exports = FeatureEngineering;