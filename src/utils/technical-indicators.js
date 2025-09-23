// Technical Indicators Module
// This module provides implementations of common technical indicators
// including RSI, MACD, and various moving averages

class TechnicalIndicators {
  /**
   * Calculate Simple Moving Average (SMA)
   * @param {number[]} prices - Array of prices
   * @param {number} period - Number of periods
   * @returns {number|null} SMA value or null if not enough data
   */
  static calculateSMA(prices, period) {
    if (!prices || prices.length < period) return null;
    
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {number[]} prices - Array of prices
   * @param {number} period - Number of periods
   * @returns {number|null} EMA value or null if not enough data
   */
  static calculateEMA(prices, period) {
    if (!prices || prices.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = prices[prices.length - period];
    
    for (let i = prices.length - period + 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * @param {number[]} prices - Array of prices
   * @param {number} period - Number of periods (default 14)
   * @returns {number|null} RSI value or null if not enough data
   */
  static calculateRSI(prices, period = 14) {
    if (!prices || prices.length <= period) return null;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI
    if (avgLoss === 0) {
      return 100;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {number[]} prices - Array of prices
   * @param {number} fastPeriod - Fast EMA period (default 12)
   * @param {number} slowPeriod - Slow EMA period (default 26)
   * @param {number} signalPeriod - Signal line period (default 9)
   * @returns {Object|null} Object with MACD line, signal line, and histogram or null if not enough data
   */
  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!prices || prices.length <= slowPeriod + signalPeriod) return null;
    
    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (fastEMA === null || slowEMA === null) return null;
    
    // Calculate MACD line
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line (EMA of MACD line)
    // We need to calculate the MACD line for the last signalPeriod values
    const macdLineHistory = [];
    for (let i = signalPeriod; i <= prices.length; i++) {
      const fast = this.calculateEMA(prices.slice(0, i), fastPeriod);
      const slow = this.calculateEMA(prices.slice(0, i), slowPeriod);
      if (fast !== null && slow !== null) {
        macdLineHistory.push(fast - slow);
      }
    }
    
    const signalLine = this.calculateEMA(macdLineHistory, signalPeriod);
    if (signalLine === null) return null;
    
    // Calculate histogram
    const histogram = macdLine - signalLine;
    
    return {
      macdLine: parseFloat(macdLine.toFixed(2)),
      signalLine: parseFloat(signalLine.toFixed(2)),
      histogram: parseFloat(histogram.toFixed(2))
    };
  }

  /**
   * Calculate Bollinger Bands
   * @param {number[]} prices - Array of prices
   * @param {number} period - Number of periods (default 20)
   * @param {number} stdDevMultiplier - Standard deviation multiplier (default 2)
   * @returns {Object|null} Object with upper, middle, and lower bands or null if not enough data
   */
  static calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
    if (!prices || prices.length < period) return null;
    
    // Calculate SMA (middle band)
    const middleBand = this.calculateSMA(prices, period);
    if (middleBand === null) return null;
    
    // Calculate standard deviation
    const recentPrices = prices.slice(-period);
    const squaredDifferences = recentPrices.map(price => Math.pow(price - middleBand, 2));
    const meanSquaredDifference = squaredDifferences.reduce((sum, val) => sum + val, 0) / period;
    const standardDeviation = Math.sqrt(meanSquaredDifference);
    
    // Calculate upper and lower bands
    const upperBand = middleBand + (stdDevMultiplier * standardDeviation);
    const lowerBand = middleBand - (stdDevMultiplier * standardDeviation);
    
    return {
      upper: parseFloat(upperBand.toFixed(2)),
      middle: parseFloat(middleBand.toFixed(2)),
      lower: parseFloat(lowerBand.toFixed(2))
    };
  }

  /**
   * Calculate all technical indicators for a given symbol
   * @param {number[]} prices - Array of prices
   * @returns {Object} Object containing all calculated indicators
   */
  static calculateAllIndicators(prices) {
    return {
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      rsi14: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices)
    };
  }
}

module.exports = TechnicalIndicators;