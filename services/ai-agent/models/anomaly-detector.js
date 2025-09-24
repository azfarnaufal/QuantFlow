// Advanced Anomaly Detection System
class AnomalyDetector {
  constructor() {
    // Detection parameters
    this.windowSize = 100; // Number of data points for baseline
    this.threshold = 3; // Number of standard deviations for anomaly
    this.minDataPoints = 20; // Minimum data points needed for detection
    
    // Historical data
    this.baselines = new Map(); // Symbol -> baseline statistics
    this.anomalyHistory = []; // History of detected anomalies
    
    console.log('Anomaly Detector initialized');
  }

  // Detect anomalies in price data
  detectPriceAnomalies(symbol, currentPrice, historicalPrices) {
    if (historicalPrices.length < this.minDataPoints) {
      return { isAnomaly: false, score: 0, reason: 'Insufficient data' };
    }
    
    // Calculate baseline statistics
    const baseline = this.calculateBaseline(historicalPrices);
    this.baselines.set(symbol, baseline);
    
    // Calculate z-score
    const zScore = Math.abs(currentPrice - baseline.mean) / baseline.std;
    
    // Check if anomaly
    const isAnomaly = zScore > this.threshold;
    
    // Record anomaly
    if (isAnomaly) {
      const anomaly = {
        symbol,
        type: 'PRICE',
        value: currentPrice,
        expected: baseline.mean,
        zScore,
        timestamp: Date.now()
      };
      
      this.anomalyHistory.push(anomaly);
      
      // Keep only last 1000 anomalies
      if (this.anomalyHistory.length > 1000) {
        this.anomalyHistory.shift();
      }
    }
    
    return {
      isAnomaly,
      score: zScore,
      reason: isAnomaly ? `Price ${currentPrice} deviates ${zScore.toFixed(2)} standard deviations from mean ${baseline.mean.toFixed(2)}` : 'Normal price movement'
    };
  }

  // Detect anomalies in volume data
  detectVolumeAnomalies(symbol, currentVolume, historicalVolumes) {
    if (historicalVolumes.length < this.minDataPoints) {
      return { isAnomaly: false, score: 0, reason: 'Insufficient data' };
    }
    
    // Calculate baseline statistics
    const baseline = this.calculateBaseline(historicalVolumes);
    
    // Calculate z-score
    const zScore = Math.abs(currentVolume - baseline.mean) / baseline.std;
    
    // Check if anomaly
    const isAnomaly = zScore > this.threshold;
    
    // Record anomaly
    if (isAnomaly) {
      const anomaly = {
        symbol,
        type: 'VOLUME',
        value: currentVolume,
        expected: baseline.mean,
        zScore,
        timestamp: Date.now()
      };
      
      this.anomalyHistory.push(anomaly);
    }
    
    return {
      isAnomaly,
      score: zScore,
      reason: isAnomaly ? `Volume ${currentVolume} deviates ${zScore.toFixed(2)} standard deviations from mean ${baseline.mean.toFixed(2)}` : 'Normal volume movement'
    };
  }

  // Detect anomalies in price patterns
  detectPatternAnomalies(symbol, currentPattern, historicalPatterns) {
    if (historicalPatterns.length < this.minDataPoints) {
      return { isAnomaly: false, score: 0, reason: 'Insufficient data' };
    }
    
    // Calculate pattern frequency
    const patternCounts = {};
    for (const pattern of historicalPatterns) {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }
    
    // Calculate expected frequency
    const totalPatterns = historicalPatterns.length;
    const expectedFrequency = patternCounts[currentPattern] ? patternCounts[currentPattern] / totalPatterns : 0;
    
    // Simple anomaly detection based on low frequency
    const isAnomaly = expectedFrequency < 0.05; // Less than 5% frequency
    
    // Record anomaly
    if (isAnomaly) {
      const anomaly = {
        symbol,
        type: 'PATTERN',
        value: currentPattern,
        expected: 'common pattern',
        frequency: expectedFrequency,
        timestamp: Date.now()
      };
      
      this.anomalyHistory.push(anomaly);
    }
    
    return {
      isAnomaly,
      score: 1 - expectedFrequency,
      reason: isAnomaly ? `Unusual pattern detected with frequency ${expectedFrequency.toFixed(3)}` : 'Common pattern'
    };
  }

  // Calculate baseline statistics
  calculateBaseline(data) {
    if (data.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0 };
    }
    
    // Calculate mean
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    
    // Calculate standard deviation
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);
    
    // Calculate min and max
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    return { mean, std, min, max };
  }

  // Detect sudden changes in correlation
  detectCorrelationAnomalies(symbol, correlatedSymbols, correlationMatrix) {
    const anomalies = [];
    
    // Get historical correlations for this symbol
    // In a real implementation, we would store historical correlations
    // For now, we'll simulate detection based on current correlation values
    
    for (const [otherSymbol, correlation] of Object.entries(correlationMatrix)) {
      if (otherSymbol === symbol) continue;
      
      // Detect extreme correlations (very high or very low)
      if (Math.abs(correlation) > 0.9) {
        const anomaly = {
          symbol,
          type: 'CORRELATION',
          value: correlation,
          relatedSymbol: otherSymbol,
          reason: `Extreme correlation (${correlation.toFixed(3)}) with ${otherSymbol}`,
          timestamp: Date.now()
        };
        
        anomalies.push(anomaly);
        this.anomalyHistory.push(anomaly);
      }
    }
    
    // Keep only last 1000 anomalies
    if (this.anomalyHistory.length > 1000) {
      this.anomalyHistory = this.anomalyHistory.slice(-1000);
    }
    
    return anomalies;
  }

  // Detect order book anomalies
  detectOrderBookAnomalies(symbol, orderBook) {
    if (!orderBook || !orderBook.bids || !orderBook.asks) {
      return { isAnomaly: false, score: 0, reason: 'Invalid order book data' };
    }
    
    // Calculate bid-ask spread
    const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0][0] : 0;
    const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0][0] : 0;
    const spread = bestAsk - bestBid;
    const relativeSpread = bestBid > 0 ? spread / bestBid : 0;
    
    // Detect wide spreads
    const wideSpreadAnomaly = relativeSpread > 0.01; // 1% relative spread
    
    // Calculate order book depth ratio
    let totalBids = 0, totalAsks = 0;
    for (const [price, quantity] of orderBook.bids) {
      totalBids += price * quantity;
    }
    for (const [price, quantity] of orderBook.asks) {
      totalAsks += price * quantity;
    }
    
    const depthRatio = totalBids > 0 && totalAsks > 0 ? Math.min(totalBids, totalAsks) / Math.max(totalBids, totalAsks) : 0;
    
    // Detect imbalanced order books
    const imbalanceAnomaly = depthRatio < 0.5;
    
    // Record anomalies
    const anomalies = [];
    
    if (wideSpreadAnomaly) {
      const anomaly = {
        symbol,
        type: 'ORDER_BOOK',
        value: relativeSpread,
        reason: `Wide bid-ask spread (${(relativeSpread * 100).toFixed(2)}%)`,
        timestamp: Date.now()
      };
      
      anomalies.push(anomaly);
      this.anomalyHistory.push(anomaly);
    }
    
    if (imbalanceAnomaly) {
      const anomaly = {
        symbol,
        type: 'ORDER_BOOK',
        value: depthRatio,
        reason: `Imbalanced order book (depth ratio: ${depthRatio.toFixed(3)})`,
        timestamp: Date.now()
      };
      
      anomalies.push(anomaly);
      this.anomalyHistory.push(anomaly);
    }
    
    // Keep only last 1000 anomalies
    if (this.anomalyHistory.length > 1000) {
      this.anomalyHistory = this.anomalyHistory.slice(-1000);
    }
    
    return {
      isAnomaly: anomalies.length > 0,
      anomalies,
      score: anomalies.length,
      reason: anomalies.length > 0 ? 'Order book anomalies detected' : 'Normal order book'
    };
  }

  // Get anomaly statistics
  getAnomalyStatistics() {
    if (this.anomalyHistory.length === 0) return { total: 0 };
    
    const stats = {
      total: this.anomalyHistory.length,
      byType: {},
      bySymbol: {},
      recent: this.anomalyHistory.slice(-10) // Last 10 anomalies
    };
    
    // Count by type and symbol
    for (const anomaly of this.anomalyHistory) {
      // By type
      stats.byType[anomaly.type] = (stats.byType[anomaly.type] || 0) + 1;
      
      // By symbol
      stats.bySymbol[anomaly.symbol] = (stats.bySymbol[anomaly.symbol] || 0) + 1;
    }
    
    return stats;
  }

  // Get baseline for a symbol
  getBaseline(symbol) {
    return this.baselines.get(symbol) || null;
  }

  // Reset baseline for a symbol
  resetBaseline(symbol) {
    this.baselines.delete(symbol);
  }

  // Update detection parameters
  updateParameters(newParams) {
    if (newParams.windowSize !== undefined) {
      this.windowSize = newParams.windowSize;
    }
    
    if (newParams.threshold !== undefined) {
      this.threshold = newParams.threshold;
    }
    
    if (newParams.minDataPoints !== undefined) {
      this.minDataPoints = newParams.minDataPoints;
    }
  }
}

module.exports = AnomalyDetector;