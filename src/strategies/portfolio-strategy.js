// Portfolio Backtesting Strategy
// This strategy supports backtesting with multiple assets

class PortfolioStrategy {
  /**
   * Portfolio Strategy Constructor
   * @param {Object} options - Strategy options
   */
  constructor(options = {}) {
    this.name = 'portfolioStrategy';
    this.description = 'Portfolio Backtesting Strategy';
    this.options = {
      rebalanceFrequency: options.rebalanceFrequency || 20, // Rebalance every 20 periods
      allocationMethod: options.allocationMethod || 'equal', // equal, momentum, volatility
      ...options
    };
  }

  /**
   * Calculate asset weights based on allocation method
   * @param {Object} assetData - Price data for all assets
   * @param {string} method - Allocation method
   * @returns {Object} Asset weights
   */
  calculateWeights(assetData, method = 'equal') {
    const symbols = Object.keys(assetData);
    const weights = {};
    
    switch (method) {
      case 'equal':
        // Equal weight allocation
        const equalWeight = 1 / symbols.length;
        symbols.forEach(symbol => {
          weights[symbol] = equalWeight;
        });
        break;
        
      case 'momentum':
        // Momentum-based allocation
        let totalMomentum = 0;
        const momentums = {};
        
        symbols.forEach(symbol => {
          const prices = assetData[symbol];
          if (prices.length >= 2) {
            const momentum = (prices[prices.length - 1] - prices[0]) / prices[0];
            momentums[symbol] = momentum;
            totalMomentum += Math.abs(momentum);
          } else {
            momentums[symbol] = 0;
          }
        });
        
        if (totalMomentum > 0) {
          symbols.forEach(symbol => {
            weights[symbol] = Math.abs(momentums[symbol]) / totalMomentum;
          });
        } else {
          // Fallback to equal weight if no momentum
          const equalWeight = 1 / symbols.length;
          symbols.forEach(symbol => {
            weights[symbol] = equalWeight;
          });
        }
        break;
        
      case 'volatility':
        // Volatility-based allocation (inverse volatility weighting)
        let totalInverseVolatility = 0;
        const inverseVolatilities = {};
        
        symbols.forEach(symbol => {
          const prices = assetData[symbol];
          if (prices.length >= 2) {
            // Calculate returns
            const returns = [];
            for (let i = 1; i < prices.length; i++) {
              returns.push((prices[i] - prices[i-1]) / prices[i-1]);
            }
            
            // Calculate standard deviation (volatility)
            if (returns.length > 0) {
              const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
              const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
              const volatility = Math.sqrt(variance);
              
              // Inverse volatility (higher weight for lower volatility)
              const inverseVolatility = volatility > 0 ? 1 / volatility : 1;
              inverseVolatilities[symbol] = inverseVolatility;
              totalInverseVolatility += inverseVolatility;
            } else {
              inverseVolatilities[symbol] = 1;
              totalInverseVolatility += 1;
            }
          } else {
            inverseVolatilities[symbol] = 1;
            totalInverseVolatility += 1;
          }
        });
        
        if (totalInverseVolatility > 0) {
          symbols.forEach(symbol => {
            weights[symbol] = inverseVolatilities[symbol] / totalInverseVolatility;
          });
        } else {
          // Fallback to equal weight
          const equalWeight = 1 / symbols.length;
          symbols.forEach(symbol => {
            weights[symbol] = equalWeight;
          });
        }
        break;
        
      default:
        // Equal weight as default
        const defaultEqualWeight = 1 / symbols.length;
        symbols.forEach(symbol => {
          weights[symbol] = defaultEqualWeight;
        });
    }
    
    return weights;
  }

  /**
   * Rebalance portfolio
   * @param {Object} portfolio - Current portfolio state
   * @param {Object} weights - Asset weights
   * @param {number} portfolioValue - Current portfolio value
   * @returns {Object} New portfolio allocation
   */
  rebalancePortfolio(portfolio, weights, portfolioValue) {
    const newAllocation = {};
    const symbols = Object.keys(weights);
    
    symbols.forEach(symbol => {
      const targetValue = portfolioValue * weights[symbol];
      newAllocation[symbol] = {
        targetValue: targetValue,
        targetShares: targetValue / portfolio.assets[symbol].price,
        weight: weights[symbol]
      };
    });
    
    return newAllocation;
  }

  /**
   * Generate portfolio backtest
   * @param {Object} multiAssetData - Price data for multiple assets
   * @returns {Object} Backtest results
   */
  generateBacktest(multiAssetData) {
    // Get all symbols
    const symbols = Object.keys(multiAssetData);
    
    // Find the minimum length to align all assets
    let minLength = Infinity;
    symbols.forEach(symbol => {
      if (multiAssetData[symbol].length < minLength) {
        minLength = multiAssetData[symbol].length;
      }
    });
    
    // Align all assets to the same length
    const alignedData = {};
    symbols.forEach(symbol => {
      alignedData[symbol] = multiAssetData[symbol].slice(-minLength);
    });
    
    // Initialize portfolio
    let portfolio = {
      cash: 10000,
      assets: {},
      value: 10000,
      history: []
    };
    
    // Initialize assets in portfolio
    symbols.forEach(symbol => {
      portfolio.assets[symbol] = {
        shares: 0,
        price: alignedData[symbol][0]
      };
    });
    
    // Calculate initial weights
    const initialWeights = this.calculateWeights(alignedData, this.options.allocationMethod);
    
    // Rebalance at the beginning
    const initialAllocation = this.rebalancePortfolio(portfolio, initialWeights, portfolio.value);
    
    // Execute initial allocation (simplified)
    symbols.forEach(symbol => {
      const targetShares = initialAllocation[symbol].targetShares;
      const price = alignedData[symbol][0];
      const cost = targetShares * price;
      
      if (portfolio.cash >= cost) {
        portfolio.assets[symbol].shares = targetShares;
        portfolio.cash -= cost;
      }
    });
    
    // Update portfolio value
    portfolio.value = portfolio.cash;
    symbols.forEach(symbol => {
      portfolio.value += portfolio.assets[symbol].shares * alignedData[symbol][0];
    });
    
    // Track portfolio history
    portfolio.history.push({
      time: 0,
      value: portfolio.value,
      cash: portfolio.cash,
      weights: initialWeights,
      allocations: initialAllocation
    });
    
    // Run backtest
    const results = {
      portfolioHistory: [],
      trades: [],
      metrics: {}
    };
    
    // For each time period
    for (let t = 1; t < minLength; t++) {
      // Update asset prices
      symbols.forEach(symbol => {
        portfolio.assets[symbol].price = alignedData[symbol][t];
      });
      
      // Update portfolio value
      portfolio.value = portfolio.cash;
      symbols.forEach(symbol => {
        portfolio.value += portfolio.assets[symbol].shares * portfolio.assets[symbol].price;
      });
      
      // Check if we need to rebalance
      if (t % this.options.rebalanceFrequency === 0) {
        // Calculate new weights
        const currentData = {};
        symbols.forEach(symbol => {
          currentData[symbol] = alignedData[symbol].slice(0, t + 1);
        });
        
        const newWeights = this.calculateWeights(currentData, this.options.allocationMethod);
        
        // Record rebalancing (simplified)
        results.trades.push({
          time: t,
          type: 'REBALANCE',
          weights: newWeights
        });
      }
      
      // Record portfolio state
      portfolio.history.push({
        time: t,
        value: portfolio.value,
        cash: portfolio.cash,
        priceData: {},
        weights: t % this.options.rebalanceFrequency === 0 ? 
          this.calculateWeights(
            symbols.reduce((acc, symbol) => {
              acc[symbol] = alignedData[symbol].slice(0, t + 1);
              return acc;
            }, {}),
            this.options.allocationMethod
          ) : portfolio.history[portfolio.history.length - 1].weights
      });
      
      // Add price data to history
      symbols.forEach(symbol => {
        portfolio.history[portfolio.history.length - 1].priceData[symbol] = alignedData[symbol][t];
      });
    }
    
    // Calculate metrics
    if (portfolio.history.length > 0) {
      const initialValue = portfolio.history[0].value;
      const finalValue = portfolio.history[portfolio.history.length - 1].value;
      const totalReturn = ((finalValue - initialValue) / initialValue) * 100;
      
      results.metrics = {
        initialValue: initialValue,
        finalValue: finalValue,
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        periods: portfolio.history.length
      };
    }
    
    results.portfolioHistory = portfolio.history;
    
    return results;
  }
}

module.exports = PortfolioStrategy;