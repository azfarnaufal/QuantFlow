class TechnicalIndicators {
  // Calculate Simple Moving Average
  static calculateSMA(data, period) {
    if (data.length < period) return null;
    
    const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  // Calculate Exponential Moving Average
  static calculateEMA(data, period) {
    if (data.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  // Calculate Relative Strength Index
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50; // Default neutral value
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i <= period; i++) {
      const index = prices.length - i;
      const prevIndex = index - 1;
      
      if (index < 0 || prevIndex < 0) break;
      
      const change = prices[index] - prices[prevIndex];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }
    
    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
    
    if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Calculate MACD
  static calculateMACD(prices) {
    if (prices.length < 26) return null;
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    if (ema12 === null || ema26 === null) return null;
    
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([ema12, ema26], 9); // Simplified signal line
    
    return {
      macd: macd,
      signal: signal,
      histogram: macd - (signal || 0)
    };
  }

  // Calculate Bollinger Bands
  static calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const sma = this.calculateSMA(prices, period);
    if (sma === null) return null;
    
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * standardDeviation),
      middle: sma,
      lower: sma - (stdDev * standardDeviation)
    };
  }

  // Calculate Average True Range
  static calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) return null;
    
    let trValues = [];
    
    for (let i = 1; i < highs.length && i < lows.length && i < closes.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i-1]);
      const tr3 = Math.abs(lows[i] - closes[i-1]);
      const tr = Math.max(tr1, tr2, tr3);
      trValues.push(tr);
    }
    
    return this.calculateSMA(trValues, period);
  }

  // Calculate Moving Average Convergence Divergence
  static calculateMovingAverageConvergenceDivergence(prices) {
    return this.calculateMACD(prices);
  }

  // Calculate Stochastic Oscillator
  static calculateStochasticOscillator(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const currentClose = closes[closes.length - 1];
    
    if (highestHigh === lowestLow) return 50; // Neutral value
    
    const stochastic = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    return stochastic;
  }

  // Calculate Williams %R
  static calculateWilliamsR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const currentClose = closes[closes.length - 1];
    
    if (highestHigh === lowestLow) return 0; // Neutral value
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    return williamsR;
  }

  // Calculate On-Balance Volume (OBV)
  static calculateOBV(closes, volumes) {
    if (closes.length !== volumes.length || closes.length < 2) return null;
    
    let obv = 0;
    let prevClose = closes[0];
    
    for (let i = 1; i < closes.length; i++) {
      const close = closes[i];
      const volume = volumes[i];
      
      if (close > prevClose) {
        obv += volume;
      } else if (close < prevClose) {
        obv -= volume;
      }
      // If close == prevClose, OBV doesn't change
      
      prevClose = close;
    }
    
    return obv;
  }

  // Calculate Rate of Change (ROC)
  static calculateROC(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period - 1];
    
    if (pastPrice === 0) return null;
    
    const roc = ((currentPrice - pastPrice) / pastPrice) * 100;
    return roc;
  }

  // Calculate Commodity Channel Index (CCI)
  static calculateCCI(highs, lows, closes, period = 20) {
    if (highs.length < period || lows.length < period || closes.length < period) return null;
    
    const typicalPrices = [];
    for (let i = 0; i < highs.length && i < lows.length && i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    const sma = this.calculateSMA(typicalPrices, period);
    if (sma === null) return null;
    
    const meanDeviation = typicalPrices.slice(-period).reduce((sum, price) => {
      return sum + Math.abs(price - sma);
    }, 0) / period;
    
    const currentTypicalPrice = typicalPrices[typicalPrices.length - 1];
    const cci = (currentTypicalPrice - sma) / (0.015 * meanDeviation);
    
    return cci;
  }

  // Calculate all indicators at once for a single data point
  static calculateAllIndicatorsForDataPoint(historicalData, currentIndex) {
    if (currentIndex < 14) return {}; // Need at least 14 data points for most indicators
    
    // Extract data series up to current index
    const prices = historicalData.slice(0, currentIndex + 1).map(d => d.close);
    const opens = historicalData.slice(0, currentIndex + 1).map(d => d.open);
    const highs = historicalData.slice(0, currentIndex + 1).map(d => d.high);
    const lows = historicalData.slice(0, currentIndex + 1).map(d => d.low);
    const volumes = historicalData.slice(0, currentIndex + 1).map(d => d.volume);
    
    return {
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices),
      atr: this.calculateATR(highs, lows, prices, 14),
      stochastic: this.calculateStochasticOscillator(highs, lows, prices, 14),
      williamsR: this.calculateWilliamsR(highs, lows, prices, 14),
      obv: this.calculateOBV(prices, volumes),
      roc: this.calculateROC(prices, 14),
      cci: this.calculateCCI(highs, lows, prices, 20)
    };
  }

  // Calculate all indicators for entire dataset
  static calculateAllIndicators(historicalData) {
    const results = [];
    
    for (let i = 0; i < historicalData.length; i++) {
      results.push(this.calculateAllIndicatorsForDataPoint(historicalData, i));
    }
    
    return results;
  }
}

module.exports = TechnicalIndicators;