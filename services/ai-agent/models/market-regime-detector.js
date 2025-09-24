// Advanced Market Regime Detection System
class MarketRegimeDetector {
  constructor() {
    // Regime definitions
    this.regimes = {
      BULL: 'Bull Market',
      BEAR: 'Bear Market',
      SIDEWAYS: 'Sideways Market',
      VOLATILE: 'High Volatility',
      LOW_VOLATILE: 'Low Volatility',
      TRENDING: 'Trending',
      MEAN_REVERTING: 'Mean Reverting'
    };
    
    // Regime characteristics
    this.regimeCharacteristics = {
      BULL: { trend: 1, volatility: 0.5, momentum: 1 },
      BEAR: { trend: -1, volatility: 0.5, momentum: -1 },
      SIDEWAYS: { trend: 0, volatility: 0.3, momentum: 0 },
      VOLATILE: { trend: 0, volatility: 1, momentum: 0 },
      LOW_VOLATILE: { trend: 0, volatility: 0.1, momentum: 0 },
      TRENDING: { trend: 0.7, volatility: 0.4, momentum: 0.7 },
      MEAN_REVERTING: { trend: 0, volatility: 0.3, momentum: -0.5 }
    };
    
    // Historical regime data
    this.regimeHistory = [];
    
    console.log('Market Regime Detector initialized');
  }

  // Detect current market regime
  detectRegime(priceData, volumeData = null) {
    if (!priceData || priceData.length < 30) {
      return { regime: this.regimes.SIDEWAYS, confidence: 0.5 };
    }
    
    // Calculate key metrics
    const returns = this.calculateReturns(priceData);
    const volatility = this.calculateVolatility(returns);
    const trend = this.calculateTrend(priceData);
    const momentum = this.calculateMomentum(returns);
    const volumeTrend = volumeData ? this.calculateTrend(volumeData) : 0;
    
    // Score each regime
    const scores = {};
    
    // Bull market: positive trend, moderate volatility, positive momentum
    scores.BULL = this.calculateRegimeScore(
      trend, 1, 0.3,
      volatility, 0.5, 0.2,
      momentum, 1, 0.3
    );
    
    // Bear market: negative trend, moderate volatility, negative momentum
    scores.BEAR = this.calculateRegimeScore(
      trend, -1, 0.3,
      volatility, 0.5, 0.2,
      momentum, -1, 0.3
    );
    
    // Sideways market: near-zero trend, low volatility, near-zero momentum
    scores.SIDEWAYS = this.calculateRegimeScore(
      trend, 0, 0.2,
      volatility, 0.3, 0.1,
      momentum, 0, 0.2
    );
    
    // High volatility: any trend, high volatility
    scores.VOLATILE = this.calculateRegimeScore(
      trend, 0, 0.5,
      volatility, 1, 0.2,
      momentum, 0, 0.5
    );
    
    // Low volatility: any trend, very low volatility
    scores.LOW_VOLATILE = this.calculateRegimeScore(
      trend, 0, 0.5,
      volatility, 0.1, 0.05,
      momentum, 0, 0.5
    );
    
    // Trending: strong trend, moderate volatility, consistent momentum
    scores.TRENDING = this.calculateRegimeScore(
      Math.abs(trend), 1, 0.3,
      volatility, 0.4, 0.2,
      Math.abs(momentum), 1, 0.3
    );
    
    // Mean reverting: low trend, moderate volatility, negative momentum
    scores.MEAN_REVERTING = this.calculateRegimeScore(
      trend, 0, 0.2,
      volatility, 0.3, 0.1,
      momentum, -0.5, 0.3
    );
    
    // Find regime with highest score
    let bestRegime = this.regimes.SIDEWAYS;
    let bestScore = -Infinity;
    let totalScore = 0;
    
    for (const [regime, score] of Object.entries(scores)) {
      totalScore += Math.exp(score);
      if (score > bestScore) {
        bestScore = score;
        bestRegime = regime;
      }
    }
    
    // Calculate confidence (softmax)
    const confidence = Math.exp(bestScore) / totalScore;
    
    // Record regime detection
    const detection = {
      regime: this.regimes[bestRegime],
      confidence,
      metrics: { trend, volatility, momentum, volumeTrend },
      timestamp: Date.now()
    };
    
    this.regimeHistory.push(detection);
    
    // Keep only last 1000 detections
    if (this.regimeHistory.length > 1000) {
      this.regimeHistory.shift();
    }
    
    return detection;
  }

  // Calculate returns from price data
  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return returns;
  }

  // Calculate volatility (standard deviation of returns)
  calculateVolatility(returns) {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  // Calculate trend (linear regression slope)
  calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  // Calculate momentum (rate of change)
  calculateMomentum(returns) {
    if (returns.length < 5) return 0;
    
    const recent = returns.slice(-5);
    return recent.reduce((sum, r) => sum + r, 0) / recent.length;
  }

  // Calculate regime score using Gaussian function
  calculateRegimeScore(actualValue, targetValue, targetVolatility, actualVolatility, targetVolatilityVol, actualMomentum, targetMomentum, momentumVolatility) {
    // Score based on how close actual values are to target values
    const valueScore = this.gaussianScore(actualValue, targetValue, targetVolatility);
    const volatilityScore = this.gaussianScore(actualVolatility, targetVolatilityVol, targetVolatilityVol * 0.5);
    const momentumScore = this.gaussianScore(actualMomentum, targetMomentum, momentumVolatility);
    
    return valueScore + volatilityScore + momentumScore;
  }

  // Gaussian scoring function
  gaussianScore(actual, target, sigma) {
    const diff = actual - target;
    return -0.5 * Math.pow(diff / sigma, 2);
  }

  // Get regime transition probabilities
  getRegimeTransitions() {
    if (this.regimeHistory.length < 2) return {};
    
    const transitions = {};
    const regimeCounts = {};
    
    // Count regime occurrences
    for (const detection of this.regimeHistory) {
      const regime = detection.regime;
      regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
    }
    
    // Count transitions
    for (let i = 1; i < this.regimeHistory.length; i++) {
      const from = this.regimeHistory[i-1].regime;
      const to = this.regimeHistory[i].regime;
      
      if (!transitions[from]) {
        transitions[from] = {};
      }
      
      transitions[from][to] = (transitions[from][to] || 0) + 1;
    }
    
    // Convert to probabilities
    const probabilities = {};
    for (const [from, toCounts] of Object.entries(transitions)) {
      probabilities[from] = {};
      const totalCount = regimeCounts[from];
      
      for (const [to, count] of Object.entries(toCounts)) {
        probabilities[from][to] = count / totalCount;
      }
    }
    
    return probabilities;
  }

  // Predict next regime based on current regime and transition probabilities
  predictNextRegime(currentRegime) {
    const transitions = this.getRegimeTransitions();
    
    if (!transitions[currentRegime]) {
      return { regime: currentRegime, probability: 1.0 };
    }
    
    let mostLikelyRegime = currentRegime;
    let highestProbability = 0;
    
    for (const [regime, probability] of Object.entries(transitions[currentRegime])) {
      if (probability > highestProbability) {
        highestProbability = probability;
        mostLikelyRegime = regime;
      }
    }
    
    return { regime: mostLikelyRegime, probability: highestProbability };
  }

  // Get regime statistics
  getRegimeStatistics() {
    if (this.regimeHistory.length === 0) return {};
    
    const stats = {};
    
    // Count regime occurrences
    for (const detection of this.regimeHistory) {
      const regime = detection.regime;
      if (!stats[regime]) {
        stats[regime] = { count: 0, totalConfidence: 0 };
      }
      stats[regime].count++;
      stats[regime].totalConfidence += detection.confidence;
    }
    
    // Calculate averages
    for (const [regime, data] of Object.entries(stats)) {
      stats[regime].averageConfidence = data.totalConfidence / data.count;
      stats[regime].percentage = (data.count / this.regimeHistory.length) * 100;
    }
    
    return stats;
  }
}

module.exports = MarketRegimeDetector;