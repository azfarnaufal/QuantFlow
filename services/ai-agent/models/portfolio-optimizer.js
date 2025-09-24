// Advanced Portfolio Optimization Engine
class PortfolioOptimizer {
  constructor() {
    // Optimization parameters
    this.riskFreeRate = 0.02; // 2% risk-free rate
    this.targetReturn = 0.15; // 15% target return
    this.maxIterations = 1000;
    this.tolerance = 1e-6;
    
    // Asset data
    this.assetReturns = new Map(); // Symbol -> historical returns
    this.assetCovariances = new Map(); // Symbol pair -> covariance
    this.assetWeights = new Map(); // Symbol -> current weights
    
    console.log('Portfolio Optimizer initialized');
  }

  // Calculate portfolio metrics
  calculatePortfolioMetrics(weights, returns, covariances) {
    if (!weights || !returns || !covariances) return null;
    
    // Portfolio return
    let portfolioReturn = 0;
    for (let i = 0; i < weights.length; i++) {
      portfolioReturn += weights[i] * returns[i];
    }
    
    // Portfolio variance
    let portfolioVariance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const covariance = covariances[`${i},${j}`] || 0;
        portfolioVariance += weights[i] * weights[j] * covariance;
      }
    }
    
    // Portfolio risk (standard deviation)
    const portfolioRisk = Math.sqrt(portfolioVariance);
    
    // Sharpe ratio
    const sharpeRatio = portfolioRisk > 0 ? (portfolioReturn - this.riskFreeRate) / portfolioRisk : 0;
    
    return {
      return: portfolioReturn,
      risk: portfolioRisk,
      sharpeRatio
    };
  }

  // Optimize portfolio for maximum Sharpe ratio
  optimizeMaxSharpe(assets, historicalReturns) {
    const n = assets.length;
    if (n === 0) return { weights: [], metrics: null };
    
    // Initialize weights equally
    const weights = new Array(n).fill(1 / n);
    
    // Calculate asset returns and covariances
    const assetReturns = this.calculateAssetReturns(historicalReturns);
    const assetCovariances = this.calculateAssetCovariances(historicalReturns);
    
    // Optimization using gradient ascent
    let bestSharpe = -Infinity;
    let bestWeights = [...weights];
    
    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Calculate current metrics
      const metrics = this.calculatePortfolioMetrics(weights, assetReturns, assetCovariances);
      if (!metrics) continue;
      
      // Check if this is the best solution so far
      if (metrics.sharpeRatio > bestSharpe) {
        bestSharpe = metrics.sharpeRatio;
        bestWeights = [...weights];
      }
      
      // Calculate gradient
      const gradient = this.calculateSharpeGradient(weights, assetReturns, assetCovariances);
      
      // Update weights
      const stepSize = 0.01;
      for (let i = 0; i < n; i++) {
        weights[i] += stepSize * gradient[i];
      }
      
      // Normalize weights to sum to 1
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= weightSum;
      }
      
      // Ensure weights are non-negative
      for (let i = 0; i < n; i++) {
        weights[i] = Math.max(0, weights[i]);
      }
      
      // Re-normalize
      const newWeightSum = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= newWeightSum;
      }
    }
    
    // Final metrics
    const finalMetrics = this.calculatePortfolioMetrics(bestWeights, assetReturns, assetCovariances);
    
    return {
      weights: bestWeights,
      assets,
      metrics: finalMetrics
    };
  }

  // Calculate asset returns from historical data
  calculateAssetReturns(historicalReturns) {
    const returns = [];
    
    for (const assetReturns of historicalReturns) {
      if (assetReturns.length === 0) {
        returns.push(0);
        continue;
      }
      
      // Calculate average return
      const avgReturn = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length;
      returns.push(avgReturn);
    }
    
    return returns;
  }

  // Calculate asset covariances
  calculateAssetCovariances(historicalReturns) {
    const n = historicalReturns.length;
    const covariances = {};
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          // Variance
          const returns = historicalReturns[i];
          if (returns.length === 0) {
            covariances[`${i},${j}`] = 0;
            continue;
          }
          
          const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
          const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
          covariances[`${i},${j}`] = variance;
        } else {
          // Covariance
          const returns1 = historicalReturns[i];
          const returns2 = historicalReturns[j];
          
          if (returns1.length === 0 || returns2.length === 0 || returns1.length !== returns2.length) {
            covariances[`${i},${j}`] = 0;
            continue;
          }
          
          const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
          const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;
          
          let covariance = 0;
          for (let k = 0; k < returns1.length; k++) {
            covariance += (returns1[k] - mean1) * (returns2[k] - mean2);
          }
          covariance /= returns1.length;
          
          covariances[`${i},${j}`] = covariance;
        }
      }
    }
    
    return covariances;
  }

  // Calculate gradient for Sharpe ratio optimization
  calculateSharpeGradient(weights, returns, covariances) {
    const n = weights.length;
    const gradient = new Array(n).fill(0);
    
    // Calculate portfolio metrics
    const metrics = this.calculatePortfolioMetrics(weights, returns, covariances);
    if (!metrics) return gradient;
    
    const { return: portfolioReturn, risk: portfolioRisk } = metrics;
    const excessReturn = portfolioReturn - this.riskFreeRate;
    
    // Calculate gradient components
    for (let i = 0; i < n; i++) {
      // Derivative of Sharpe ratio with respect to weight i
      let numeratorDerivative = 0;
      let denominatorDerivative = 0;
      
      // Numerator derivative: d/dw_i (E[r_p] - r_f)
      numeratorDerivative = returns[i];
      
      // Denominator derivative: d/dw_i sqrt(Var[r_p])
      let varianceDerivative = 0;
      for (let j = 0; j < n; j++) {
        const covariance = covariances[`${i},${j}`] || 0;
        varianceDerivative += 2 * weights[j] * covariance;
      }
      denominatorDerivative = varianceDerivative / (2 * portfolioRisk);
      
      // Apply quotient rule: d/dx (f/g) = (f'g - fg') / g^2
      gradient[i] = (numeratorDerivative * portfolioRisk - excessReturn * denominatorDerivative) / Math.pow(portfolioRisk, 2);
    }
    
    return gradient;
  }

  // Optimize portfolio for minimum variance
  optimizeMinVariance(assets, historicalReturns) {
    const n = assets.length;
    if (n === 0) return { weights: [], metrics: null };
    
    // Initialize weights equally
    const weights = new Array(n).fill(1 / n);
    
    // Calculate asset returns and covariances
    const assetReturns = this.calculateAssetReturns(historicalReturns);
    const assetCovariances = this.calculateAssetCovariances(historicalReturns);
    
    // Optimization using gradient descent on variance
    let bestVariance = Infinity;
    let bestWeights = [...weights];
    
    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Calculate current variance
      const metrics = this.calculatePortfolioMetrics(weights, assetReturns, assetCovariances);
      if (!metrics) continue;
      
      // Check if this is the best solution so far
      if (metrics.risk < bestVariance) {
        bestVariance = metrics.risk;
        bestWeights = [...weights];
      }
      
      // Calculate gradient of variance
      const gradient = this.calculateVarianceGradient(weights, assetCovariances);
      
      // Update weights (gradient descent)
      const stepSize = 0.01;
      for (let i = 0; i < n; i++) {
        weights[i] -= stepSize * gradient[i];
      }
      
      // Normalize weights to sum to 1
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= weightSum;
      }
      
      // Ensure weights are non-negative
      for (let i = 0; i < n; i++) {
        weights[i] = Math.max(0, weights[i]);
      }
      
      // Re-normalize
      const newWeightSum = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= newWeightSum;
      }
    }
    
    // Final metrics
    const finalMetrics = this.calculatePortfolioMetrics(bestWeights, assetReturns, assetCovariances);
    
    return {
      weights: bestWeights,
      assets,
      metrics: finalMetrics
    };
  }

  // Calculate gradient for variance optimization
  calculateVarianceGradient(weights, covariances) {
    const n = weights.length;
    const gradient = new Array(n).fill(0);
    
    // Derivative of portfolio variance with respect to each weight
    for (let i = 0; i < n; i++) {
      let derivative = 0;
      for (let j = 0; j < n; j++) {
        const covariance = covariances[`${i},${j}`] || 0;
        derivative += 2 * weights[j] * covariance;
      }
      gradient[i] = derivative;
    }
    
    return gradient;
  }

  // Rebalance portfolio based on new optimization
  rebalancePortfolio(currentHoldings, targetWeights, assets) {
    const rebalanceActions = [];
    const totalValue = currentHoldings.reduce((sum, h) => sum + h.value, 0);
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const targetWeight = targetWeights[i];
      const targetValue = totalValue * targetWeight;
      
      // Find current holding for this asset
      const currentHolding = currentHoldings.find(h => h.symbol === asset);
      const currentValue = currentHolding ? currentHolding.value : 0;
      
      // Calculate difference
      const valueDifference = targetValue - currentValue;
      
      if (Math.abs(valueDifference) > totalValue * 0.01) { // 1% threshold
        const action = valueDifference > 0 ? 'BUY' : 'SELL';
        const amount = Math.abs(valueDifference);
        
        rebalanceActions.push({
          symbol: asset,
          action,
          amount,
          targetWeight,
          currentWeight: currentValue / totalValue
        });
      }
    }
    
    return rebalanceActions;
  }

  // Get portfolio diversification score
  calculateDiversificationScore(weights, covariances) {
    if (weights.length === 0) return 0;
    
    // Calculate effective number of bets (ENB)
    let sumSquaredWeights = 0;
    for (const weight of weights) {
      sumSquaredWeights += Math.pow(weight, 2);
    }
    
    const enb = 1 / sumSquaredWeights;
    const maxEnb = weights.length;
    const diversificationScore = enb / maxEnb;
    
    return diversificationScore;
  }
}

module.exports = PortfolioOptimizer;