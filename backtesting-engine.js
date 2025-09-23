// Backtesting Engine
// This module implements strategy backtesting with historical data

class BacktestingEngine {
  constructor() {
    this.strategies = new Map();
  }

  // Register a trading strategy
  registerStrategy(name, strategyFunction) {
    this.strategies.set(name, strategyFunction);
  }

  // Get all registered strategies
  getStrategies() {
    return Array.from(this.strategies.keys());
  }

  // Simple moving average crossover strategy
  static smaCrossoverStrategy(prices, shortPeriod = 10, longPeriod = 20) {
    // Start at the larger of the two periods
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

    // Simulate portfolio
    let position = 0; // 0 = no position, 1 = long position
    let cash = 10000; // Starting cash
    let shares = 0;   // Number of shares held
    let previousSignal = 'HOLD';

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      
      if (signal.signal === 'BUY' && previousSignal !== 'BUY') {
        // Buy signal - go long
        if (position === 0) {
          shares = cash / signal.price;
          cash = 0;
          position = 1;
        }
      } else if (signal.signal === 'SELL' && previousSignal !== 'SELL') {
        // Sell signal - close position
        if (position === 1) {
          cash = shares * signal.price;
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
        portfolioValue: cash + (shares * signal.price)
      });
    }

    return { signals, portfolio };
  }

  // RSI mean reversion strategy
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
          // No change
          signals.push({
            time: i,
            price: prices[i],
            signal: 'HOLD',
            rsi: 50
          });
          continue;
        } else {
          // All gains
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

    // Simulate portfolio
    let position = 0; // 0 = no position, 1 = long position
    let cash = 10000; // Starting cash
    let shares = 0;   // Number of shares held
    let previousSignal = 'HOLD';

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      
      if (signal.signal === 'BUY' && previousSignal !== 'BUY') {
        // Buy signal - go long
        if (position === 0) {
          shares = cash / signal.price;
          cash = 0;
          position = 1;
        }
      } else if (signal.signal === 'SELL' && previousSignal !== 'SELL') {
        // Sell signal - close position
        if (position === 1) {
          cash = shares * signal.price;
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
        portfolioValue: cash + (shares * signal.price)
      });
    }

    return { signals, portfolio };
  }

  // Backtest a strategy
  backtest(strategyName, priceData, options = {}) {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    const strategy = this.strategies.get(strategyName);
    // Pass options as individual parameters to the strategy function
    return strategy(priceData, options.shortPeriod, options.longPeriod, options.period, options.overbought, options.oversold);
  }

  // Calculate performance metrics
  calculateMetrics(portfolio) {
    if (portfolio.length === 0) {
      return {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        trades: 0
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
        trades: 0
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

    return {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      volatility: parseFloat(stdDev.toFixed(2)),
      trades: trades
    };
  }

  // Compare multiple strategies
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

module.exports = engine;