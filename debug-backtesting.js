// Detailed debug test for backtesting engine
const backtestingEngine = require('./backtesting-engine');

// Create a simple upward trend dataset
const prices = [];
for (let i = 0; i < 50; i++) {
  // Create a clear upward trend
  prices.push(100 + (i * 2) + (Math.random() * 5)); // Start at 100, trend upward
}

console.log('Debug Test for Backtesting Engine');
console.log('================================');
console.log('Generated prices:');
prices.forEach((price, i) => {
  console.log(`  ${i}: ${price.toFixed(2)}`);
});

console.log('\nTesting SMA Crossover Strategy...');
const result = backtestingEngine.backtest('smaCrossover', prices, {
  shortPeriod: 5,
  longPeriod: 10
});

console.log(`Generated ${result.signals.length} signals`);

if (result.signals.length > 0) {
  console.log('\nFirst 10 signals:');
  result.signals.slice(0, 10).forEach((signal, i) => {
    console.log(`  ${i+1}. Time ${signal.time}: ${signal.price.toFixed(2)} - ${signal.signal} (SMA5: ${signal.shortSMA.toFixed(2)}, SMA10: ${signal.longSMA.toFixed(2)})`);
  });
  
  // Count different signal types
  const buySignals = result.signals.filter(s => s.signal === 'BUY').length;
  const sellSignals = result.signals.filter(s => s.signal === 'SELL').length;
  const holdSignals = result.signals.filter(s => s.signal === 'HOLD').length;
  
  console.log(`\nSignal counts:`);
  console.log(`  BUY: ${buySignals}`);
  console.log(`  SELL: ${sellSignals}`);
  console.log(`  HOLD: ${holdSignals}`);
} else {
  console.log('No signals generated');
}

console.log('\nTesting RSI Mean Reversion Strategy...');
const rsiResult = backtestingEngine.backtest('rsiMeanReversion', prices, {
  period: 14,
  overbought: 70,
  oversold: 30
});

console.log(`Generated ${rsiResult.signals.length} signals`);

if (rsiResult.signals.length > 0) {
  console.log('\nFirst 10 RSI signals:');
  rsiResult.signals.slice(0, 10).forEach((signal, i) => {
    console.log(`  ${i+1}. Time ${signal.time}: ${signal.price.toFixed(2)} - ${signal.signal} (RSI: ${signal.rsi ? signal.rsi.toFixed(2) : 'N/A'})`);
  });
} else {
  console.log('No RSI signals generated');
}