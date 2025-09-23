// Test script for ML strategy
const MLStrategy = require('../src/strategies/ml-strategy');
const PortfolioStrategy = require('../src/strategies/portfolio-strategy');

// Test the ML strategy
console.log('Testing ML Strategy...');

// Generate sample price data
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

// Test ML Strategy
function testMLStrategy() {
  console.log('Testing ML Strategy...\n');
  
  try {
    // Generate sample data
    const prices = generateSampleData();
    console.log(`Generated ${prices.length} sample prices`);
    console.log(`Price range: $${prices[0].toFixed(2)} to $${prices[prices.length-1].toFixed(2)}`);
    console.log(`Total price change: ${(((prices[prices.length-1] - prices[0]) / prices[0]) * 100).toFixed(2)}%\n`);
    
    // Create ML strategy instance
    const mlStrategy = new MLStrategy({
      lookbackPeriod: 20,
      threshold: 0.55
    });
    
    // Generate signals
    const result = mlStrategy.generateSignals(prices);
    
    console.log(`ML Strategy - Generated ${result.signals.length} signals and ${result.portfolio.length} portfolio entries`);
    
    if (result.portfolio.length > 0) {
      // Calculate simple metrics
      const initialPortfolioValue = result.portfolio[0].portfolioValue;
      const finalPortfolioValue = result.portfolio[result.portfolio.length - 1].portfolioValue;
      const totalReturn = initialPortfolioValue !== 0 ? ((finalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100 : 0;
      
      console.log(`ML Strategy Results:`);
      console.log(`  Total Return: ${totalReturn.toFixed(2)}%`);
      console.log(`  Initial Portfolio Value: $${initialPortfolioValue.toFixed(2)}`);
      console.log(`  Final Portfolio Value: $${finalPortfolioValue.toFixed(2)}`);
      
      // Show some sample signals
      if (result.signals.length > 0) {
        console.log(`  Sample signals:`);
        const sampleSignals = result.signals.slice(0, 10);
        sampleSignals.forEach((signal, i) => {
          console.log(`    ${i+1}. Time ${signal.time}: $${signal.price.toFixed(2)} - ${signal.signal} (Confidence: ${signal.confidence !== undefined ? signal.confidence.toFixed(2) : 'undefined'})`);
        });
      }
      
      // Check if we have any BUY/SELL signals
      const buySignals = result.signals.filter(s => s.signal === 'BUY');
      const sellSignals = result.signals.filter(s => s.signal === 'SELL');
      console.log(`  BUY signals: ${buySignals.length}`);
      console.log(`  SELL signals: ${sellSignals.length}`);
    } else {
      console.log(`  No portfolio data generated`);
    }
    
    console.log('\n✅ ML Strategy test completed successfully');
  } catch (error) {
    console.error('❌ Error testing ML strategy:', error);
  }
}

// Test Portfolio Strategy
function testPortfolioStrategy() {
  console.log('\nTesting Portfolio Strategy...\n');
  
  try {
    // Generate sample multi-asset data
    const multiAssetData = {
      'BTCUSDT': generateSampleData(),
      'ETHUSDT': generateSampleData().map(p => p * 0.06), // ETH price is roughly 6% of BTC
      'SOLUSDT': generateSampleData().map(p => p * 0.002) // SOL price is roughly 0.2% of BTC
    };
    
    console.log('Generated multi-asset data:');
    Object.keys(multiAssetData).forEach(symbol => {
      const prices = multiAssetData[symbol];
      console.log(`  ${symbol}: ${prices.length} prices, range: $${prices[0].toFixed(2)} to $${prices[prices.length-1].toFixed(2)}`);
    });
    
    // Create Portfolio strategy instance
    const portfolioStrategy = new PortfolioStrategy({
      rebalanceFrequency: 20,
      allocationMethod: 'momentum'
    });
    
    // Generate backtest
    const result = portfolioStrategy.generateBacktest(multiAssetData);
    
    console.log(`\nPortfolio Strategy - Generated ${result.portfolioHistory.length} portfolio entries`);
    
    if (result.portfolioHistory.length > 0) {
      console.log(`Portfolio Strategy Results:`);
      console.log(`  Initial Value: $${result.metrics.initialValue.toFixed(2)}`);
      console.log(`  Final Value: $${result.metrics.finalValue.toFixed(2)}`);
      console.log(`  Total Return: ${result.metrics.totalReturn}%`);
      console.log(`  Periods: ${result.metrics.periods}`);
      
      // Show some sample portfolio history
      console.log(`  Sample portfolio history:`);
      const sampleHistory = result.portfolioHistory.slice(0, 5);
      sampleHistory.forEach((entry, i) => {
        console.log(`    ${i+1}. Time ${entry.time}: $${entry.value.toFixed(2)}`);
      });
    } else {
      console.log(`  No portfolio history generated`);
    }
    
    console.log('\n✅ Portfolio Strategy test completed successfully');
  } catch (error) {
    console.error('❌ Error testing Portfolio strategy:', error);
  }
}

// Run the tests
testMLStrategy();
testPortfolioStrategy();