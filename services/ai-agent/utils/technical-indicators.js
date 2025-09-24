class TechnicalIndicators {
  // Calculate Simple Moving Average
  static calculateSMA(prices, period) {
    if (prices.length < period) return null;
    
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  // Calculate Exponential Moving Average
  static calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  // Calculate Relative Strength Index
  static calculateRSI(prices, period) {
    if (prices.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
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
      macd,
      signal,
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
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i-1]);
      const tr3 = Math.abs(lows[i] - closes[i-1]);
      const tr = Math.max(tr1, tr2, tr3);
      trValues.push(tr);
    }
    
    return this.calculateSMA(trValues, period);
  }

  // Calculate all indicators at once
  static calculateAllIndicators(prices) {
    return {
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices)
    };
  }

  // Calculate Ichimoku Cloud
  static calculateIchimokuCloud(highs, lows, closes) {
    if (highs.length < 52 || lows.length < 52 || closes.length < 52) return null;
    
    // Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
    const ninePeriodHigh = Math.max(...highs.slice(-9));
    const ninePeriodLow = Math.min(...lows.slice(-9));
    const tenkanSen = (ninePeriodHigh + ninePeriodLow) / 2;
    
    // Kijun-sen (Base Line): (26-period high + 26-period low) / 2
    const twentySixPeriodHigh = Math.max(...highs.slice(-26));
    const twentySixPeriodLow = Math.min(...lows.slice(-26));
    const kijunSen = (twentySixPeriodHigh + twentySixPeriodLow) / 2;
    
    // Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    
    // Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2, plotted 26 periods ahead
    const fiftyTwoPeriodHigh = Math.max(...highs.slice(-52));
    const fiftyTwoPeriodLow = Math.min(...lows.slice(-52));
    const senkouSpanB = (fiftyTwoPeriodHigh + fiftyTwoPeriodLow) / 2;
    
    // Chikou Span (Lagging Span): Current closing price plotted 26 periods in the past
    const chikouSpan = closes[closes.length - 1];
    
    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan
    };
  }

  // Calculate Fibonacci Retracement Levels
  static calculateFibonacciRetracement(high, low) {
    const diff = high - low;
    return {
      level0: high,
      level236: high - (0.236 * diff),
      level382: high - (0.382 * diff),
      level5: high - (0.5 * diff),
      level618: high - (0.618 * diff),
      level786: high - (0.786 * diff),
      level1: low
    };
  }

  // Calculate Parabolic SAR
  static calculateParabolicSAR(highs, lows, closes, step = 0.02, maxStep = 0.2) {
    if (highs.length < 2 || lows.length < 2 || closes.length < 2) return null;
    
    let sar = lows[0];
    let isLong = true;
    let ep = highs[0]; // Extreme point
    let af = step; // Acceleration factor
    
    const sarValues = [sar];
    
    for (let i = 1; i < highs.length; i++) {
      if (isLong) {
        sar = sar + af * (ep - sar);
        sar = Math.min(sar, lows[i-1], lows[i]); // SAR should not be above recent lows
        
        if (highs[i] > ep) {
          ep = highs[i];
          af = Math.min(af + step, maxStep);
        }
        
        if (closes[i] < sar) {
          isLong = false;
          sar = ep;
          ep = lows[i];
          af = step;
        }
      } else {
        sar = sar + af * (ep - sar);
        sar = Math.max(sar, highs[i-1], highs[i]); // SAR should not be below recent highs
        
        if (lows[i] < ep) {
          ep = lows[i];
          af = Math.min(af + step, maxStep);
        }
        
        if (closes[i] > sar) {
          isLong = true;
          sar = ep;
          ep = highs[i];
          af = step;
        }
      }
      
      sarValues.push(sar);
    }
    
    return sarValues[sarValues.length - 1];
  }

  // Calculate ADX (Average Directional Index)
  static calculateADX(highs, lows, closes, period = 14) {
    if (highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) return null;
    
    // Calculate +DM and -DM
    const plusDM = [];
    const minusDM = [];
    
    for (let i = 1; i < highs.length; i++) {
      const upMove = highs[i] - highs[i-1];
      const downMove = lows[i-1] - lows[i];
      
      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }
      
      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }
    
    // Calculate +DI and -DI
    const atr = this.calculateATR(highs, lows, closes, period);
    if (!atr) return null;
    
    const plusDI = (plusDM.slice(-period).reduce((a, b) => a + b, 0) / period) / atr * 100;
    const minusDI = (minusDM.slice(-period).reduce((a, b) => a + b, 0) / period) / atr * 100;
    
    // Calculate DX
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    // Calculate ADX
    const adxValues = [];
    adxValues.push(dx);
    
    // Smooth ADX over period
    for (let i = 1; i < period; i++) {
      const prevADX = adxValues[i-1];
      const currentDX = dx; // Simplified
      adxValues.push((prevADX * (period - 1) + currentDX) / period);
    }
    
    return adxValues[adxValues.length - 1];
  }
}

module.exports = TechnicalIndicators;