// Test script for technical indicators
const TechnicalIndicators = require('./technical-indicators');

// Generate sample price data for testing
function generateSampleData() {
  const prices = [];
  let basePrice = 45000; // Starting price
  
  // Generate 100 sample prices with some realistic fluctuations
  for (let i = 0; i < 100; i++) {
    // Add some random fluctuation (-2% to +2%)
    const changePercent = (Math.random() - 0.5) * 0.04;
    basePrice = basePrice * (1 + changePercent);
    prices.push(basePrice);
  }
  
  return prices;
}

// Test all indicators
function testIndicators() {
  console.log('Testing Technical Indicators...\n');
  
  const prices = generateSampleData();
  console.log(`Generated ${prices.length} sample prices`);
  console.log(`Price range: $${prices[0].toFixed(2)} to $${prices[prices.length-1].toFixed(2)}\n`);
  
  // Test SMA
  const sma20 = TechnicalIndicators.calculateSMA(prices, 20);
  console.log(`SMA(20): ${sma20 ? '$' + sma20.toFixed(2) : 'Not enough data'}`);
  
  const sma50 = TechnicalIndicators.calculateSMA(prices, 50);
  console.log(`SMA(50): ${sma50 ? '$' + sma50.toFixed(2) : 'Not enough data'}`);
  
  // Test EMA
  const ema12 = TechnicalIndicators.calculateEMA(prices, 12);
  console.log(`EMA(12): ${ema12 ? '$' + ema12.toFixed(2) : 'Not enough data'}`);
  
  const ema26 = TechnicalIndicators.calculateEMA(prices, 26);
  console.log(`EMA(26): ${ema26 ? '$' + ema26.toFixed(2) : 'Not enough data'}`);
  
  // Test RSI
  const rsi14 = TechnicalIndicators.calculateRSI(prices, 14);
  console.log(`RSI(14): ${rsi14 ? rsi14.toFixed(2) : 'Not enough data'}`);
  
  // Test MACD
  const macd = TechnicalIndicators.calculateMACD(prices);
  if (macd) {
    console.log(`MACD Line: ${macd.macdLine}`);
    console.log(`Signal Line: ${macd.signalLine}`);
    console.log(`Histogram: ${macd.histogram}`);
  } else {
    console.log('MACD: Not enough data');
  }
  
  // Test Bollinger Bands
  const bb = TechnicalIndicators.calculateBollingerBands(prices, 20, 2);
  if (bb) {
    console.log(`Bollinger Bands:`);
    console.log(`  Upper: $${bb.upper.toFixed(2)}`);
    console.log(`  Middle: $${bb.middle.toFixed(2)}`);
    console.log(`  Lower: $${bb.lower.toFixed(2)}`);
  } else {
    console.log('Bollinger Bands: Not enough data');
  }
  
  console.log('\nAll tests completed.');
}

// Run the tests
testIndicators();