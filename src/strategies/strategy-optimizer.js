// Strategy Optimizer
// This module provides parameter optimization for trading strategies

class StrategyOptimizer {
  /**
   * Strategy Optimizer Constructor
   * @param {Object} strategy - Trading strategy to optimize
   * @param {Object} data - Historical price data
   * @param {Object} parameterRanges - Parameter ranges to optimize
   */
  constructor(strategy, data, parameterRanges) {
    this.strategy = strategy;
    this.data = data;
    this.parameterRanges = parameterRanges;
  }

  /**
   * Generate all parameter combinations within ranges
   * @returns {Array} Array of parameter combinations
   */
  generateParameterCombinations() {
    const combinations = [];
    const keys = Object.keys(this.parameterRanges);
    const values = Object.values(this.parameterRanges);
    
    // Recursive function to generate combinations
    const generate = (index, current) => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }
      
      const key = keys[index];
      const range = values[index];
      
      if (Array.isArray(range)) {
        // Discrete values
        range.forEach(value => {
          current[key] = value;
          generate(index + 1, current);
        });
      } else if (typeof range === 'object' && range.min !== undefined && range.max !== undefined) {
        // Continuous range - sample values
        const step = range.step || Math.max(1, Math.floor((range.max - range.min) / 10));
        for (let value = range.min; value <= range.max; value += step) {
          current[key] = value;
          generate(index + 1, current);
        }
      }
    };
    
    generate(0, {});
    return combinations;
  }

  /**
   * Evaluate a strategy with specific parameters
   * @param {Object} parameters - Strategy parameters
   * @returns {Object} Evaluation results
   */
  async evaluateStrategy(parameters) {
    // Create a new instance of the strategy with these parameters
    const strategyInstance = new this.strategy.constructor({
      ...this.strategy.options,
      ...parameters
    });
    
    // Run backtest
    let results;
    if (this.strategy.name === 'portfolioStrategy') {
      // For portfolio strategy, we need multi-asset data
      results = strategyInstance.generateBacktest(this.data);
    } else {
      // For single asset strategies
      const symbol = Object.keys(this.data)[0];
      const prices = this.data[symbol];
      results = strategyInstance.generateSignals(prices);
    }
    
    // Calculate performance metrics
    const metrics = this.calculateMetrics(results, parameters);
    return { parameters, metrics, results };
  }

  /**
   * Calculate performance metrics
   * @param {Object} results - Strategy results
   * @param {Object} parameters - Strategy parameters
   * @returns {Object} Performance metrics
   */
  calculateMetrics(results, parameters) {
    if (this.strategy.name === 'portfolioStrategy') {
      // Portfolio strategy metrics
      return {
        totalReturn: results.metrics.totalReturn || 0,
        sharpeRatio: this.calculateSharpeRatio(results.portfolioHistory) || 0,
        maxDrawdown: this.calculateMaxDrawdown(results.portfolioHistory) || 0,
        volatility: this.calculateVolatility(results.portfolioHistory) || 0,
        parameters: parameters
      };
    } else {
      // Single asset strategy metrics
      const portfolio = results.portfolio;
      if (!portfolio || portfolio.length === 0) {
        return {
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          parameters: parameters
        };
      }
      
      return {
        totalReturn: this.calculateTotalReturn(portfolio) || 0,
        sharpeRatio: this.calculateSharpeRatio(portfolio) || 0,
        maxDrawdown: this.calculateMaxDrawdown(portfolio) || 0,
        volatility: this.calculateVolatility(portfolio) || 0,
        parameters: parameters
      };
    }
  }

  /**
   * Calculate total return
   * @param {Array} portfolio - Portfolio history
   * @returns {number} Total return percentage
   */
  calculateTotalReturn(portfolio) {
    if (portfolio.length < 2) return 0;
    
    const initialValue = portfolio[0].portfolioValue;
    const finalValue = portfolio[portfolio.length - 1].portfolioValue;
    return ((finalValue - initialValue) / initialValue) * 100;
  }

  /**
   * Calculate Sharpe ratio
   * @param {Array} portfolio - Portfolio history
   * @returns {number} Sharpe ratio
   */
  calculateSharpeRatio(portfolio) {
    if (portfolio.length < 2) return 0;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < portfolio.length; i++) {
      const returnPct = ((portfolio[i].portfolioValue - portfolio[i-1].portfolioValue) / portfolio[i-1].portfolioValue) * 100;
      returns.push(returnPct);
    }
    
    // Calculate average return and standard deviation
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    return stdDev !== 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate maximum drawdown
   * @param {Array} portfolio - Portfolio history
   * @returns {number} Maximum drawdown percentage
   */
  calculateMaxDrawdown(portfolio) {
    if (portfolio.length < 2) return 0;
    
    let peak = portfolio[0].portfolioValue;
    let maxDrawdown = 0;
    
    for (let i = 1; i < portfolio.length; i++) {
      const value = portfolio[i].portfolioValue;
      if (value > peak) {
        peak = value;
      } else {
        const drawdown = ((peak - value) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   * @param {Array} portfolio - Portfolio history
   * @returns {number} Volatility percentage
   */
  calculateVolatility(portfolio) {
    if (portfolio.length < 2) return 0;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < portfolio.length; i++) {
      const returnPct = ((portfolio[i].portfolioValue - portfolio[i-1].portfolioValue) / portfolio[i-1].portfolioValue) * 100;
      returns.push(returnPct);
    }
    
    // Calculate standard deviation
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Optimize strategy parameters
   * @param {string} objective - Optimization objective ('return', 'sharpe', 'drawdown')
   * @param {number} maxIterations - Maximum number of iterations (optional)
   * @returns {Object} Best parameters and results
   */
  async optimize(objective = 'sharpe', maxIterations = 100) {
    console.log(`Optimizing strategy with ${objective} objective...`);
    
    // Generate parameter combinations
    const combinations = this.generateParameterCombinations();
    console.log(`Generated ${combinations.length} parameter combinations`);
    
    // Limit combinations if too many
    let limitedCombinations = combinations;
    if (combinations.length > maxIterations) {
      // Randomly sample combinations
      limitedCombinations = [];
      const step = Math.max(1, Math.floor(combinations.length / maxIterations));
      for (let i = 0; i < combinations.length; i += step) {
        limitedCombinations.push(combinations[i]);
        if (limitedCombinations.length >= maxIterations) break;
      }
      console.log(`Limited to ${limitedCombinations.length} combinations for optimization`);
    }
    
    // Evaluate all combinations
    const results = [];
    for (let i = 0; i < limitedCombinations.length; i++) {
      const combination = limitedCombinations[i];
      try {
        const evaluation = await this.evaluateStrategy(combination);
        results.push(evaluation);
        console.log(`Evaluated combination ${i+1}/${limitedCombinations.length}`);
      } catch (error) {
        console.error(`Error evaluating combination ${i+1}:`, error);
      }
    }
    
    // Find best result based on objective
    if (results.length === 0) {
      throw new Error('No valid evaluations completed');
    }
    
    let bestResult;
    switch (objective) {
      case 'return':
        bestResult = results.reduce((best, current) => 
          current.metrics.totalReturn > best.metrics.totalReturn ? current : best
        );
        break;
      case 'sharpe':
        bestResult = results.reduce((best, current) => 
          current.metrics.sharpeRatio > best.metrics.sharpeRatio ? current : best
        );
        break;
      case 'drawdown':
        bestResult = results.reduce((best, current) => 
          current.metrics.maxDrawdown < best.metrics.maxDrawdown ? current : best
        );
        break;
      default:
        bestResult = results[0];
    }
    
    return {
      bestParameters: bestResult.parameters,
      bestMetrics: bestResult.metrics,
      allResults: results
    };
  }
}

module.exports = StrategyOptimizer;