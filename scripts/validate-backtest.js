// Script to validate backtesting results against actual market performance

const axios = require('axios');
const fs = require('fs');

// Configuration
const CONFIG = {
  apiUrl: 'http://localhost:3001', // Staging environment
  symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  validationPeriod: 30, // Days to validate
  strategies: [
    'lstm_strategy',
    'transformer_strategy',
    'reinforcement_strategy',
    'ensemble_strategy'
  ]
};

/**
 * Fetch real-time market data
 * @param {string} symbol - Trading symbol
 * @returns {Promise<Object>} Market data
 */
async function fetchRealTimeData(symbol) {
  try {
    const response = await axios.get(`${CONFIG.apiUrl}/price/${symbol}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching real-time data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Run backtest for a strategy
 * @param {string} symbol - Trading symbol
 * @param {string} strategy - Strategy name
 * @returns {Promise<Object>} Backtest results
 */
async function runBacktest(symbol, strategy) {
  try {
    const response = await axios.post(`${CONFIG.apiUrl}/backtest/run`, {
      symbol: symbol,
      strategy: strategy,
      startDate: new Date(Date.now() - CONFIG.validationPeriod * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      initialCapital: 10000
    });
    return response.data;
  } catch (error) {
    console.error(`Error running backtest for ${strategy} on ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Calculate actual performance based on real market data
 * @param {Array} priceHistory - Historical price data
 * @param {number} initialCapital - Initial capital
 * @returns {Object} Performance metrics
 */
function calculateActualPerformance(priceHistory, initialCapital) {
  if (!priceHistory || priceHistory.length === 0) {
    return { totalReturn: 0, sharpeRatio: 0, maxDrawdown: 0 };
  }

  // Calculate buy-and-hold strategy performance
  const initialPrice = priceHistory[0].price;
  const finalPrice = priceHistory[priceHistory.length - 1].price;
  const totalReturn = ((finalPrice - initialPrice) / initialPrice) * 100;

  // Calculate daily returns for Sharpe ratio
  const dailyReturns = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const returnPct = ((priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price) * 100;
    dailyReturns.push(returnPct);
  }

  // Calculate Sharpe ratio (assuming risk-free rate of 0)
  const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

  // Calculate max drawdown
  let peak = priceHistory[0].price;
  let maxDrawdown = 0;
  
  for (let i = 1; i < priceHistory.length; i++) {
    const price = priceHistory[i].price;
    if (price > peak) {
      peak = price;
    } else {
      const drawdown = ((peak - price) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2))
  };
}

/**
 * Compare backtest results with actual performance
 * @param {Object} backtestResults - Backtest results
 * @param {Object} actualPerformance - Actual market performance
 * @returns {Object} Comparison results
 */
function compareResults(backtestResults, actualPerformance) {
  if (!backtestResults || !actualPerformance) {
    return { error: 'Invalid data for comparison' };
  }

  const backtestMetrics = backtestResults.results?.portfolio ? 
    calculateBacktestMetrics(backtestResults.results.portfolio) : 
    { totalReturn: 0, sharpeRatio: 0, maxDrawdown: 0 };

  return {
    symbol: backtestResults.symbol,
    strategy: backtestResults.strategy,
    backtest: backtestMetrics,
    actual: actualPerformance,
    comparison: {
      returnDifference: parseFloat((backtestMetrics.totalReturn - actualPerformance.totalReturn).toFixed(2)),
      sharpeDifference: parseFloat((backtestMetrics.sharpeRatio - actualPerformance.sharpeRatio).toFixed(2)),
      drawdownDifference: parseFloat((backtestMetrics.maxDrawdown - actualPerformance.maxDrawdown).toFixed(2))
    }
  };
}

/**
 * Calculate backtest metrics from portfolio data
 * @param {Array} portfolio - Portfolio data from backtest
 * @returns {Object} Performance metrics
 */
function calculateBacktestMetrics(portfolio) {
  if (!portfolio || portfolio.length === 0) {
    return { totalReturn: 0, sharpeRatio: 0, maxDrawdown: 0 };
  }

  // Calculate total return
  const initialPortfolioValue = portfolio[0].portfolioValue;
  const finalPortfolioValue = portfolio[portfolio.length - 1].portfolioValue;
  const totalReturn = ((finalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100;

  // Calculate returns for each period
  const returns = [];
  for (let i = 1; i < portfolio.length; i++) {
    const previousValue = portfolio[i-1].portfolioValue;
    const currentValue = portfolio[i].portfolioValue;
    const periodReturn = (currentValue - previousValue) / previousValue;
    returns.push(periodReturn * 100); // Convert to percentage
  }

  // Calculate Sharpe ratio (assuming risk-free rate of 0)
  if (returns.length === 0) {
    return { totalReturn, sharpeRatio: 0, maxDrawdown: 0 };
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

  // Calculate max drawdown
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

  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2))
  };
}

/**
 * Main validation function
 */
async function validateBacktesting() {
  console.log('Starting backtesting validation...\n');

  const validationResults = [];

  for (const symbol of CONFIG.symbols) {
    console.log(`Validating ${symbol}...`);

    // Fetch recent price history for actual performance calculation
    try {
      const historyResponse = await axios.get(`${CONFIG.apiUrl}/history/${symbol}?limit=100`);
      const priceHistory = historyResponse.data;

      // Calculate actual performance
      const actualPerformance = calculateActualPerformance(priceHistory, 10000);

      for (const strategy of CONFIG.strategies) {
        console.log(`  Running ${strategy}...`);

        // Run backtest
        const backtestResults = await runBacktest(symbol, strategy);

        // Compare results
        const comparison = compareResults(backtestResults, actualPerformance);
        validationResults.push(comparison);

        console.log(`    Backtest Return: ${comparison.backtest?.totalReturn || 0}%`);
        console.log(`    Actual Return: ${actualPerformance.totalReturn}%`);
        console.log(`    Difference: ${comparison.comparison?.returnDifference || 0}%\n`);
      }
    } catch (error) {
      console.error(`Error validating ${symbol}:`, error.message);
    }
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `backtest-validation-${timestamp}.json`;
  
  fs.writeFileSync(
    resultsFile, 
    JSON.stringify(validationResults, null, 2)
  );
  
  console.log(`Validation results saved to ${resultsFile}`);

  // Print summary
  console.log('\n=== VALIDATION SUMMARY ===');
  validationResults.forEach(result => {
    if (result.error) {
      console.log(`${result.symbol} - ${result.strategy}: ${result.error}`);
      return;
    }
    
    const diff = result.comparison;
    console.log(`${result.symbol} - ${result.strategy}:`);
    console.log(`  Return Difference: ${diff.returnDifference > 0 ? '+' : ''}${diff.returnDifference}%`);
    console.log(`  Sharpe Difference: ${diff.sharpeDifference > 0 ? '+' : ''}${diff.sharpeDifference}`);
    console.log(`  Drawdown Difference: ${diff.drawdownDifference > 0 ? '+' : ''}${diff.drawdownDifference}%`);
    console.log('');
  });

  return validationResults;
}

// Run validation if script is executed directly
if (require.main === module) {
  validateBacktesting()
    .then(() => {
      console.log('Backtesting validation completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateBacktesting };