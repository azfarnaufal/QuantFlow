// Backtesting Engine
// Enhanced backtesting engine with sophisticated strategies and walk-forward analysis

// Import new strategies
const MLStrategy = require('../strategies/ml-strategy');
const PortfolioStrategy = require('../strategies/portfolio-strategy');

/**
 * Backtesting Engine
 * Implements strategy backtesting with historical data, performance metrics, and walk-forward analysis
 */
class BacktestingEngine {
  constructor() {
    this.strategies = new Map();
  }

  /**
   * Register a trading strategy
   * @param {string} name - Strategy name
   * @param {Function} strategyFunction - Strategy implementation function
   */
  registerStrategy(name, strategyFunction) {
    this.strategies.set(name, strategyFunction);
  }

  /**
   * Get all registered strategies
   * @returns {Array} List of strategy names
   */
  getStrategies() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Simple Moving Average Crossover Strategy
   * @param {Array} prices - Array of price data
   * @param {number} shortPeriod - Short SMA period
   * @param {number} longPeriod - Long SMA period
   * @returns {Object} Strategy results
   */
  static smaCrossoverStrategy(prices, shortPeriod = 10, longPeriod = 20) {
    const startPeriod = Math.max(shortPeriod, longPeriod);
    
    if (prices.length <= startPeriod) {
      return { signals: [], portfolio: [] };
    }

    const signals = [];
    const portfolio = [];

    for (let i = startPeriod; i < prices.length; i++) {
      // Calculate SMAs
      const shortSMA = prices.slice(i - shortPeriod, i).reduce((sum, price) => sum + price, 0) / shortPeriod;
      const longSMA = prices.slice(i - longPeriod, i).reduce((sum, price) => sum + price, 0) / longPeriod;

      // Generate signal
      let signal = 'HOLD';
      if (shortSMA > longSMA) {
        signal = 'BUY';
      } else if (shortSMA < longSMA) {
        signal = 'SELL';
      }

      signals.push({
        time: i,
        price: prices[i],
        signal: signal,
        shortSMA: shortSMA,
        longSMA: longSMA
      });
    }

    // Simulate portfolio with transaction costs
    let position = 0;
    let cash = 10000;
    let shares = 0;
    let previousSignal = 'HOLD';

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      let transactionCost = 0;
      
      if (signal.signal === 'BUY' && previousSignal !== 'BUY') {
        if (position === 0) {
          // Apply transaction cost (0.1%)
          transactionCost = cash * 0.001;
          const netCash = cash - transactionCost;
          shares = netCash / signal.price;
          cash = 0;
          position = 1;
        }
      } else if (signal.signal === 'SELL' && previousSignal !== 'SELL') {
        if (position === 1) {
          // Apply transaction cost (0.1%)
          const grossValue = shares * signal.price;
          transactionCost = grossValue * 0.001;
          cash = grossValue - transactionCost;
          shares = 0;
          position = 0;
        }
      }
      
      previousSignal = signal.signal;

      portfolio.push({
        time: signal.time,
        price: signal.price,
        signal: signal.signal,
        cash: cash,
        shares: shares,
        transactionCost: transactionCost,
        portfolioValue: cash + (shares * signal.price)
      });
    }

    return { signals, portfolio };
  }

  /**
   * RSI Mean Reversion Strategy
   * @param {Array} prices - Array of price data
   * @param {number} period - RSI calculation period
   * @param {number} overbought - Overbought threshold
   * @param {number} oversold - Oversold threshold
   * @returns {Object} Strategy results
   */
  static rsiMeanReversionStrategy(prices, period = 14, overbought = 70, oversold = 30) {
    if (prices.length <= period) {
      return { signals: [], portfolio: [] };
    }

    const signals = [];
    const portfolio = [];

    // Calculate RSI values
    for (let i = period; i < prices.length; i++) {
      // Calculate RSI
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = prices[j] - prices[j - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses -= change;
        }
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      
      // Avoid division by zero
      if (avgLoss === 0) {
        if (avgGain === 0) {
          signals.push({
            time: i,
            price: prices[i],
            signal: 'HOLD',
            rsi: 50
          });
          continue;
        } else {
          signals.push({
            time: i,
            price: prices[i],
            signal: 'BUY',
            rsi: 100
          });
          continue;
        }
      }
      
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // Generate signal
      let signal = 'HOLD';
      if (rsi < oversold) {
        signal = 'BUY';
      } else if (rsi > overbought) {
        signal = 'SELL';
      }

      signals.push({
        time: i,
        price: prices[i],
        signal: signal,
        rsi: rsi
      });
    }

    // Simulate portfolio with transaction costs
    let position = 0;
    let cash = 10000;
    let shares = 0;
    let previousSignal = 'HOLD';

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      let transactionCost = 0;
      
      if (signal.signal === 'BUY' && previousSignal !== 'BUY') {
        if (position === 0) {
          transactionCost = cash * 0.001;
          const netCash = cash - transactionCost;
          shares = netCash / signal.price;
          cash = 0;
          position = 1;
        }
      } else if (signal.signal === 'SELL' && previousSignal !== 'SELL') {
        if (position === 1) {
          const grossValue = shares * signal.price;
          transactionCost = grossValue * 0.001;
          cash = grossValue - transactionCost;
          shares = 0;
          position = 0;
        }
      }
      
      previousSignal = signal.signal;

      portfolio.push({
        time: signal.time,
        price: signal.price,
        signal: signal.signal,
        cash: cash,
        shares: shares,
        transactionCost: transactionCost,
        portfolioValue: cash + (shares * signal.price)
      });
    }

    return { signals, portfolio };
  }

  /**
   * Momentum Strategy
   * @param {Array} prices - Array of price data
   * @param {number} period - Momentum calculation period
   * @returns {Object} Strategy results
   */
  static momentumStrategy(prices, period = 10) {
    if (prices.length <= period) {
      return { signals: [], portfolio: [] };
    }

    const signals = [];
    const portfolio = [];

    // Calculate momentum
    for (let i = period; i < prices.length; i++) {
      const momentum = prices[i] - prices[i - period];
      
      // Generate signal
      let signal = 'HOLD';
      if (momentum > 0) {
        signal = 'BUY';
      } else if (momentum < 0) {
        signal = 'SELL';
      }

      signals.push({
        time: i,
        price: prices[i],
        signal: signal,
        momentum: momentum
      });
    }

    // Simulate portfolio with transaction costs
    let position = 0;
    let cash = 10000;
    let shares = 0;
    let previousSignal = 'HOLD';

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      let transactionCost = 0;
      
      if (signal.signal === 'BUY' && previousSignal !== 'BUY') {
        if (position === 0) {
          transactionCost = cash * 0.001;
          const netCash = cash - transactionCost;
          shares = netCash / signal.price;
          cash = 0;
          position = 1;
        }
      } else if (signal.signal === 'SELL' && previousSignal !== 'SELL') {
        if (position === 1) {
          const grossValue = shares * signal.price;
          transactionCost = grossValue * 0.001;
          cash = grossValue - transactionCost;
          shares = 0;
          position = 0;
        }
      }
      
      previousSignal = signal.signal;

      portfolio.push({
        time: signal.time,
        price: signal.price,
        signal: signal.signal,
        cash: cash,
        shares: shares,
        transactionCost: transactionCost,
        portfolioValue: cash + (shares * signal.price)
      });
    }

    return { signals, portfolio };
  }

  /**
   * Mean Reversion Strategy
   * @param {Array} prices - Array of price data
   * @param {number} period - Lookback period
   * @param {number} threshold - Deviation threshold
   * @returns {Object} Strategy results
   */
  static meanReversionStrategy(prices, period = 20, threshold = 2) {
    if (prices.length <= period) {
      return { signals: [], portfolio: [] };
    }

    const signals = [];
    const portfolio = [];

    // Calculate mean reversion signals
    for (let i = period; i < prices.length; i++) {
      // Calculate mean and standard deviation
      const lookback = prices.slice(i - period, i);
      const mean = lookback.reduce((sum, price) => sum + price, 0) / period;
      const variance = lookback.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      // Calculate z-score
      const zScore = (prices[i] - mean) / stdDev;
      
      // Generate signal
      let signal = 'HOLD';
      if (zScore > threshold) {
        signal = 'SELL'; // Price is too high, sell
      } else if (zScore < -threshold) {
        signal = 'BUY'; // Price is too low, buy
      }

      signals.push({
        time: i,
        price: prices[i],
        signal: signal,
        zScore: zScore,
        mean: mean
      });
    }

    // Simulate portfolio with transaction costs
    let position = 0;
    let cash = 10000;
    let shares = 0;
    let previousSignal = 'HOLD';

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      let transactionCost = 0;
      
      if (signal.signal === 'BUY' && previousSignal !== 'BUY') {
        if (position === 0) {
          transactionCost = cash * 0.001;
          const netCash = cash - transactionCost;
          shares = netCash / signal.price;
          cash = 0;
          position = 1;
        }
      } else if (signal.signal === 'SELL' && previousSignal !== 'SELL') {
        if (position === 1) {
          const grossValue = shares * signal.price;
          transactionCost = grossValue * 0.001;
          cash = grossValue - transactionCost;
          shares = 0;
          position = 0;
        }
      }
      
      previousSignal = signal.signal;

      portfolio.push({
        time: signal.time,
        price: signal.price,
        signal: signal.signal,
        cash: cash,
        shares: shares,
        transactionCost: transactionCost,
        portfolioValue: cash + (shares * signal.price)
      });
    }

    return { signals, portfolio };
  }

  /**
   * Machine Learning Strategy
   * @param {Array} prices - Array of price data
   * @param {Object} options - Strategy options
   * @returns {Object} Strategy results
   */
  static mlStrategy(prices, options = {}) {
    const strategy = new MLStrategy(options);
    return strategy.generateSignals(prices);
  }

  /**
   * Portfolio Strategy
   * @param {Object} multiAssetData - Price data for multiple assets
   * @param {Object} options - Strategy options
   * @returns {Object} Strategy results
   */
  static portfolioStrategy(multiAssetData, options = {}) {
    const strategy = new PortfolioStrategy(options);
    return strategy.generateBacktest(multiAssetData);
  }

  /**
   * Backtest a strategy
   * @param {string} strategyName - Name of the strategy to backtest
   * @param {Array|Object} data - Array of price data for single asset or object for multi-asset
   * @param {Object} options - Strategy options
   * @returns {Object} Backtest results
   */
  backtest(strategyName, data, options = {}) {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    const strategy = this.strategies.get(strategyName);
    return strategy(data, options);
  }

  /**
   * Walk-forward analysis
   * @param {string} strategyName - Name of the strategy to analyze
   * @param {Array} priceData - Array of price data
   * @param {Object} options - Strategy options
   * @param {number} inSamplePeriod - In-sample period for optimization
   * @param {number} outSamplePeriod - Out-of-sample period for testing
   * @returns {Object} Walk-forward analysis results
   */
  walkForwardAnalysis(strategyName, priceData, options = {}, inSamplePeriod = 100, outSamplePeriod = 50) {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    const results = [];
    let currentIndex = 0;

    while (currentIndex + inSamplePeriod + outSamplePeriod <= priceData.length) {
      // In-sample data for optimization
      const inSampleData = priceData.slice(currentIndex, currentIndex + inSamplePeriod);
      
      // Out-of-sample data for testing
      const outSampleData = priceData.slice(
        currentIndex + inSamplePeriod, 
        currentIndex + inSamplePeriod + outSamplePeriod
      );

      // Run backtest on out-of-sample data
      const result = this.backtest(strategyName, outSampleData, options);
      const metrics = this.calculateMetrics(result.portfolio);
      
      results.push({
        periodStart: currentIndex + inSamplePeriod,
        periodEnd: currentIndex + inSamplePeriod + outSamplePeriod,
        metrics: metrics,
        signals: result.signals,
        portfolio: result.portfolio
      });

      currentIndex += outSamplePeriod;
    }

    return results;
  }

  /**
   * Calculate performance metrics
   * @param {Array} portfolio - Portfolio data
   * @returns {Object} Performance metrics
   */
  calculateMetrics(portfolio) {
    if (portfolio.length === 0) {
      return {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        trades: 0,
        totalTransactionCosts: 0
      };
    }

    // Calculate total return
    const initialPortfolioValue = portfolio[0].portfolioValue;
    const finalPortfolioValue = portfolio[portfolio.length - 1].portfolioValue;
    const totalReturn = initialPortfolioValue !== 0 ? ((finalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100 : 0;

    // Calculate returns for each period
    const returns = [];
    for (let i = 1; i < portfolio.length; i++) {
      const prevValue = portfolio[i-1].portfolioValue;
      const currentValue = portfolio[i].portfolioValue;
      if (prevValue !== 0) {
        const returnPct = ((currentValue - prevValue) / prevValue) * 100;
        returns.push(returnPct);
      }
    }

    // Calculate Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    if (returns.length === 0) {
      return {
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        trades: 0,
        totalTransactionCosts: portfolio.reduce((sum, entry) => sum + (entry.transactionCost || 0), 0)
      };
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

    // Calculate max drawdown
    let peak = portfolio[0].portfolioValue;
    let maxDrawdown = 0;
    
    for (let i = 1; i < portfolio.length; i++) {
      if (portfolio[i].portfolioValue > peak) {
        peak = portfolio[i].portfolioValue;
      }
      
      if (peak !== 0) {
        const drawdown = ((peak - portfolio[i].portfolioValue) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    // Count trades
    let trades = 0;
    let previousSignal = 'HOLD';
    
    for (const entry of portfolio) {
      if (entry.signal !== previousSignal && entry.signal !== 'HOLD') {
        trades++;
        previousSignal = entry.signal;
      }
    }

    // Calculate total transaction costs
    const totalTransactionCosts = portfolio.reduce((sum, entry) => sum + (entry.transactionCost || 0), 0);

    return {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      volatility: parseFloat(stdDev.toFixed(2)),
      trades: trades,
      totalTransactionCosts: parseFloat(totalTransactionCosts.toFixed(2))
    };
  }

  /**
   * Compare multiple strategies
   * @param {Array} priceData - Array of price data
   * @param {Array} strategyNames - List of strategy names to compare
   * @param {Object} options - Strategy options
   * @returns {Object} Comparison results
   */
  compareStrategies(priceData, strategyNames, options = {}) {
    const results = {};
    
    for (const strategyName of strategyNames) {
      try {
        const result = this.backtest(strategyName, priceData, options[strategyName] || {});
        const metrics = this.calculateMetrics(result.portfolio);
        
        results[strategyName] = {
          signals: result.signals,
          portfolio: result.portfolio,
          metrics: metrics
        };
      } catch (error) {
        results[strategyName] = {
          error: error.message
        };
      }
    }
    
    return results;
  }
}

// Register built-in strategies
const engine = new BacktestingEngine();
engine.registerStrategy('smaCrossover', BacktestingEngine.smaCrossoverStrategy);
engine.registerStrategy('rsiMeanReversion', BacktestingEngine.rsiMeanReversionStrategy);
engine.registerStrategy('momentum', BacktestingEngine.momentumStrategy);
engine.registerStrategy('meanReversion', BacktestingEngine.meanReversionStrategy);
engine.registerStrategy('mlStrategy', BacktestingEngine.mlStrategy);
engine.registerStrategy('portfolioStrategy', BacktestingEngine.portfolioStrategy);

module.exports = engine;