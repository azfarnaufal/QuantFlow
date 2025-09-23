# Real-time Technical Indicators Calculation

This document describes the implementation of real-time technical indicators calculation in QuantFlow.

## Overview

QuantFlow calculates technical indicators in real-time as price data is received from the Binance WebSocket. These indicators are used for:
- Trading signals
- Backtesting strategies
- Data visualization
- Alert generation

## Implemented Indicators

### 1. Moving Averages

#### Simple Moving Average (SMA)
```javascript
function calculateSMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}
```

#### Exponential Moving Average (EMA)
```javascript
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}
```

### 2. Relative Strength Index (RSI)

```javascript
function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return null;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI for subsequent periods
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
```

### 3. Moving Average Convergence Divergence (MACD)

```javascript
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length <= slowPeriod) return null;
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  if (fastEMA === null || slowEMA === null) return null;
  
  const macdLine = fastEMA - slowEMA;
  // Signal line and histogram calculation would require historical MACD values
  
  return {
    macdLine: macdLine,
    // signalLine: signalLine,
    // histogram: macdLine - signalLine
  };
}
```

### 4. Bollinger Bands

```javascript
function calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  if (prices.length < period) return null;
  
  const slice = prices.slice(-period);
  const mean = slice.reduce((sum, price) => sum + price, 0) / period;
  
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    middleBand: mean,
    upperBand: mean + (stdDevMultiplier * stdDev),
    lowerBand: mean - (stdDevMultiplier * stdDev)
  };
}
```

## Real-time Calculation Approach

### Streaming Window

QuantFlow maintains a sliding window of price data for each symbol:

```javascript
class PriceWindow {
  constructor(size) {
    this.size = size;
    this.prices = [];
  }
  
  addPrice(price) {
    this.prices.push(price);
    if (this.prices.length > this.size) {
      this.prices.shift();
    }
  }
  
  getPrices() {
    return [...this.prices];
  }
}
```

### Indicator Cache

To optimize performance, calculated indicators are cached:

```javascript
class IndicatorCache {
  constructor() {
    this.cache = new Map();
  }
  
  get(symbol, indicator, params) {
    const key = `${symbol}-${indicator}-${JSON.stringify(params)}`;
    return this.cache.get(key);
  }
  
  set(symbol, indicator, params, value) {
    const key = `${symbol}-${indicator}-${JSON.stringify(params)}`;
    this.cache.set(key, value);
    
    // Expire cache entries after 5 minutes
    setTimeout(() => {
      this.cache.delete(key);
    }, 5 * 60 * 1000);
  }
}
```

## Integration with WebSocket Client

The WebSocket client calculates indicators as new price data arrives:

```javascript
class BinanceWebSocketClient {
  constructor() {
    this.priceWindows = new Map();
    this.indicatorCache = new IndicatorCache();
  }
  
  handleMessage(data) {
    const symbol = data.symbol;
    const price = parseFloat(data.price);
    
    // Update price window
    if (!this.priceWindows.has(symbol)) {
      this.priceWindows.set(symbol, new PriceWindow(100)); // 100 price points
    }
    this.priceWindows.get(symbol).addPrice(price);
    
    // Calculate indicators
    const prices = this.priceWindows.get(symbol).getPrices();
    this.calculateIndicators(symbol, prices);
  }
  
  calculateIndicators(symbol, prices) {
    // Calculate various indicators
    const sma20 = calculateSMA(prices, 20);
    const ema12 = calculateEMA(prices, 12);
    const rsi14 = calculateRSI(prices, 14);
    const bollinger = calculateBollingerBands(prices, 20);
    
    // Cache results
    this.indicatorCache.set(symbol, 'sma', { period: 20 }, sma20);
    this.indicatorCache.set(symbol, 'ema', { period: 12 }, ema12);
    this.indicatorCache.set(symbol, 'rsi', { period: 14 }, rsi14);
    this.indicatorCache.set(symbol, 'bollinger', { period: 20 }, bollinger);
  }
}
```

## Performance Considerations

### Efficient Calculation

1. **Incremental Updates**: Update indicators incrementally rather than recalculating from scratch
2. **Selective Calculation**: Only calculate indicators that are actively being used
3. **Caching**: Cache results to avoid redundant calculations
4. **Batch Processing**: Process multiple price updates in batches when possible

### Memory Management

1. **Fixed Window Size**: Maintain fixed-size price windows to limit memory usage
2. **Cache Expiration**: Expire cached indicator values after a reasonable time
3. **Garbage Collection**: Remove unused price windows and cache entries

## API Endpoints

### Get Indicator Values

```javascript
// GET /api/indicators/{symbol}/{indicator}
app.get('/api/indicators/:symbol/:indicator', (req, res) => {
  const symbol = req.params.symbol;
  const indicator = req.params.indicator;
  const params = req.query;
  
  const value = indicatorCache.get(symbol, indicator, params);
  if (value) {
    res.json({ symbol, indicator, params, value });
  } else {
    res.status(404).json({ error: 'Indicator not available' });
  }
});
```

### Get Multiple Indicators

```javascript
// GET /api/indicators/{symbol}
app.get('/api/indicators/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  const indicators = ['sma', 'ema', 'rsi', 'bollinger'];
  
  const results = {};
  for (const indicator of indicators) {
    // Get default parameters for each indicator
    const params = getDefaultParams(indicator);
    const value = indicatorCache.get(symbol, indicator, params);
    if (value) {
      results[indicator] = value;
    }
  }
  
  res.json({ symbol, indicators: results });
});
```

## Visualization Endpoints

### Chart Data

```javascript
// GET /api/chart/{symbol}
app.get('/api/chart/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  const limit = parseInt(req.query.limit) || 100;
  
  // Get historical price data
  const priceData = getPriceHistory(symbol, limit);
  
  // Calculate indicators for charting
  const chartData = priceData.map((price, index) => {
    const prices = priceData.slice(0, index + 1).map(p => p.price);
    return {
      time: price.time,
      price: price.price,
      sma20: calculateSMA(prices, 20),
      ema12: calculateEMA(prices, 12),
      rsi14: calculateRSI(prices, 14),
      bollinger: calculateBollingerBands(prices, 20)
    };
  });
  
  res.json(chartData);
});
```

## Alert Integration

Indicators are used to trigger alerts:

```javascript
class AlertEngine {
  checkAlerts(symbol, price) {
    const alerts = getActiveAlerts(symbol);
    
    for (const alert of alerts) {
      const indicatorValue = indicatorCache.get(symbol, alert.indicator, alert.params);
      
      if (indicatorValue !== null) {
        switch (alert.condition) {
          case 'above':
            if (indicatorValue > alert.threshold) {
              triggerAlert(alert, symbol, indicatorValue);
            }
            break;
          case 'below':
            if (indicatorValue < alert.threshold) {
              triggerAlert(alert, symbol, indicatorValue);
            }
            break;
        }
      }
    }
  }
}
```

## Future Enhancements

### Additional Indicators

1. **Stochastic Oscillator**
2. **Average True Range (ATR)**
3. **Ichimoku Cloud**
4. **Fibonacci Retracement**
5. **Volume-weighted Average Price (VWAP)**

### Machine Learning Integration

1. **Neural Network-based Predictions**
2. **Clustering for Market Regime Detection**
3. **Anomaly Detection for Market Events**

### Custom Indicator Framework

```javascript
class CustomIndicator {
  constructor(name, calculationFunction, requiredParams) {
    this.name = name;
    this.calculate = calculationFunction;
    this.requiredParams = requiredParams;
  }
  
  register() {
    indicatorRegistry.register(this.name, this);
  }
}
```

## Testing

### Unit Tests

```javascript
describe('Technical Indicators', () => {
  describe('SMA Calculation', () => {
    it('should calculate correct SMA value', () => {
      const prices = [10, 11, 12, 13, 14];
      const sma = calculateSMA(prices, 5);
      expect(sma).toBe(12);
    });
  });
  
  describe('RSI Calculation', () => {
    it('should calculate correct RSI value', () => {
      const prices = [10, 11, 12, 13, 14, 13, 12, 11, 10, 11];
      const rsi = calculateRSI(prices, 9);
      expect(rsi).toBeCloseTo(50, 0);
    });
  });
});
```

### Performance Tests

```javascript
describe('Indicator Performance', () => {
  it('should calculate indicators quickly for large datasets', () => {
    const prices = Array.from({length: 10000}, () => Math.random() * 100);
    
    const start = Date.now();
    const sma = calculateSMA(prices, 20);
    const end = Date.now();
    
    expect(end - start).toBeLessThan(10); // Should take less than 10ms
  });
});
```