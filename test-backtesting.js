// Test script for backtesting engine
const express = require('express');
const backtestingEngine = require('./backtesting-engine');

// Test the backtesting engine directly
console.log('Testing backtesting engine...');

// Test data - simple price series
const testData = [100, 101, 102, 101, 100, 99, 100, 101, 102, 103, 102, 101, 100, 101, 102, 103, 104, 105, 104, 103];

console.log('Test data:', testData);

// Test SMA crossover strategy
console.log('\nTesting SMA Crossover Strategy...');
try {
  const smaResult = backtestingEngine.backtest('smaCrossover', testData, { shortPeriod: 3, longPeriod: 5 });
  console.log('SMA Result signals length:', smaResult.signals.length);
  console.log('SMA Result portfolio length:', smaResult.portfolio.length);
  console.log('First few signals:', smaResult.signals.slice(0, 3));
} catch (error) {
  console.error('Error in SMA strategy:', error.message);
}

// Test RSI strategy
console.log('\nTesting RSI Mean Reversion Strategy...');
try {
  const rsiResult = backtestingEngine.backtest('rsiMeanReversion', testData, { period: 5, overbought: 70, oversold: 30 });
  console.log('RSI Result signals length:', rsiResult.signals.length);
  console.log('RSI Result portfolio length:', rsiResult.portfolio.length);
  console.log('First few signals:', rsiResult.signals.slice(0, 3));
} catch (error) {
  console.error('Error in RSI strategy:', error.message);
}

// Test available strategies
console.log('\nAvailable strategies:');
try {
  const strategies = backtestingEngine.getStrategies();
  console.log(strategies);
} catch (error) {
  console.error('Error getting strategies:', error.message);
}

console.log('\nTest completed.');

// Generate sample price data for testing with more volatility and trends
function generateSampleData() {
  const prices = [];
  let basePrice = 45000; // Starting price
  
  // Generate 200 sample prices with more pronounced trends and volatility
  for (let i = 0; i < 200; i++) {
    // Create more pronounced trends and patterns
    if (i < 50) {
      // Strong upward trend with some volatility
      const trend = 0.005; // 0.5% per period
      const noise = (Math.random() - 0.5) * 0.02; // ±1% noise
      basePrice = basePrice * (1 + trend + noise);
    } else if (i < 100) {
      // Sharp downward trend
      const trend = -0.008; // -0.8% per period
      const noise = (Math.random() - 0.5) * 0.025; // ±1.25% noise
      basePrice = basePrice * (1 + trend + noise);
    } else if (i < 150) {
      // Sideways movement with volatility
      const noise = (Math.random() - 0.5) * 0.03; // ±1.5% noise
      basePrice = basePrice * (1 + noise);
    } else {
      // Strong upward trend
      const trend = 0.01; // 1% per period
      const noise = (Math.random() - 0.5) * 0.02; // ±1% noise
      basePrice = basePrice * (1 + trend + noise);
    }
    
    prices.push(basePrice);
  }
  
  return prices;
}

// Test the backtesting engine
function testBacktestingEngine() {
  console.log('Testing Backtesting Engine...\n');
  
  try {
    // Get available strategies
    const strategies = backtestingEngine.getStrategies();
    console.log('Available strategies:', strategies);
    
    // Generate sample data
    const prices = generateSampleData();
    console.log(`\nGenerated ${prices.length} sample prices`);
    console.log(`Price range: $${prices[0].toFixed(2)} to $${prices[prices.length-1].toFixed(2)}`);
    console.log(`Total price change: ${(((prices[prices.length-1] - prices[0]) / prices[0]) * 100).toFixed(2)}%\n`);
    
    // Show some statistics
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    console.log(`Min price: $${minPrice.toFixed(2)}`);
    console.log(`Max price: $${maxPrice.toFixed(2)}`);
    console.log(`Price volatility: ${((maxPrice - minPrice) / minPrice * 100).toFixed(2)}%\n`);
    
    // Debug: Check first few prices
    console.log('First 25 prices:');
    for (let i = 0; i < Math.min(25, prices.length); i++) {
      console.log(`  ${i}: $${prices[i].toFixed(2)}`);
    }
    console.log();
    
    // Test SMA Crossover strategy
    console.log('Testing SMA Crossover Strategy...');
    const smaResult = backtestingEngine.backtest('smaCrossover', prices, {
      shortPeriod: 10,
      longPeriod: 20
    });
    
    console.log(`SMA Crossover - Generated ${smaResult.signals.length} signals and ${smaResult.portfolio.length} portfolio entries`);
    
    if (smaResult.portfolio.length > 0) {
      const smaMetrics = backtestingEngine.calculateMetrics(smaResult.portfolio);
      console.log(`SMA Crossover Results:`);
      console.log(`  Total Return: ${smaMetrics.totalReturn}%`);
      console.log(`  Sharpe Ratio: ${smaMetrics.sharpeRatio}`);
      console.log(`  Max Drawdown: ${smaMetrics.maxDrawdown}%`);
      console.log(`  Volatility: ${smaMetrics.volatility}%`);
      console.log(`  Number of Trades: ${smaMetrics.trades}`);
      
      // Show some sample signals
      if (smaResult.signals.length > 0) {
        console.log(`  Sample signals:`);
        const sampleSignals = smaResult.signals.slice(0, 10);
        sampleSignals.forEach((signal, i) => {
          console.log(`    ${i+1}. Time ${signal.time}: $${signal.price.toFixed(2)} - ${signal.signal} (SMA${10}: ${signal.shortSMA !== undefined ? signal.shortSMA.toFixed(2) : 'undefined'}, SMA${20}: ${signal.longSMA !== undefined ? signal.longSMA.toFixed(2) : 'undefined'})`);
        });
      }
      
      // Check if we have any BUY/SELL signals
      const buySignals = smaResult.signals.filter(s => s.signal === 'BUY');
      const sellSignals = smaResult.signals.filter(s => s.signal === 'SELL');
      console.log(`  BUY signals: ${buySignals.length}`);
      console.log(`  SELL signals: ${sellSignals.length}`);
    } else {
      console.log(`  No portfolio data generated`);
    }
    console.log();
    
    // Test RSI Mean Reversion strategy
    console.log('Testing RSI Mean Reversion Strategy...');
    const rsiResult = backtestingEngine.backtest('rsiMeanReversion', prices, {
      period: 14,
      overbought: 70,
      oversold: 30
    });
    
    console.log(`RSI Mean Reversion - Generated ${rsiResult.signals.length} signals and ${rsiResult.portfolio.length} portfolio entries`);
    
    if (rsiResult.portfolio.length > 0) {
      const rsiMetrics = backtestingEngine.calculateMetrics(rsiResult.portfolio);
      console.log(`RSI Mean Reversion Results:`);
      console.log(`  Total Return: ${rsiMetrics.totalReturn}%`);
      console.log(`  Sharpe Ratio: ${rsiMetrics.sharpeRatio}`);
      console.log(`  Max Drawdown: ${rsiMetrics.maxDrawdown}%`);
      console.log(`  Volatility: ${rsiMetrics.volatility}%`);
      console.log(`  Number of Trades: ${rsiMetrics.trades}`);
      
      // Show some sample signals
      if (rsiResult.signals.length > 0) {
        console.log(`  Sample signals:`);
        const sampleSignals = rsiResult.signals.slice(0, 10);
        sampleSignals.forEach((signal, i) => {
          console.log(`    ${i+1}. Time ${signal.time}: $${signal.price.toFixed(2)} - ${signal.signal} (RSI: ${signal.rsi !== undefined ? signal.rsi.toFixed(2) : 'undefined'})`);
        });
      }
      
      // Check if we have any BUY/SELL signals
      const buySignals = rsiResult.signals.filter(s => s.signal === 'BUY');
      const sellSignals = rsiResult.signals.filter(s => s.signal === 'SELL');
      console.log(`  BUY signals: ${buySignals.length}`);
      console.log(`  SELL signals: ${sellSignals.length}`);
    } else {
      console.log(`  No portfolio data generated`);
    }
    console.log();
    
    // Compare strategies
    console.log('Comparing Strategies...');
    const comparison = backtestingEngine.compareStrategies(prices, ['smaCrossover', 'rsiMeanReversion']);
    
    console.log('Strategy Comparison:');
    for (const [strategy, result] of Object.entries(comparison)) {
      if (result.error) {
        console.log(`  ${strategy}: Error - ${result.error}`);
      } else {
        console.log(`  ${strategy}: ${result.metrics.totalReturn}% return, ${result.metrics.trades} trades`);
      }
    }
    
    console.log('\n✅ All backtesting tests completed successfully');
  } catch (error) {
    console.error('❌ Error testing backtesting engine:', error);
  }
}

// Run the tests
testBacktestingEngine();