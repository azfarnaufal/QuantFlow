const BacktestService = require('./backtest-service');

async function testBacktestService() {
  console.log('Testing Backtest Service...');
  
  // Create backtest service instance
  const backtestService = new BacktestService();
  
  try {
    // Generate synthetic data for testing
    console.log('Generating synthetic historical data...');
    const testData = backtestService.generateSyntheticData('BTCUSDT', 1000);
    console.log(`Generated ${testData.length} data points`);
    
    // Run backtest with lower confidence threshold
    console.log('Running backtest...');
    const results = await backtestService.runBacktest(testData, 10000, {
      commission: 0.001,
      slippage: 0.0005,
      riskPercent: 0.02,
      enableShort: true,
      confidenceThreshold: 0.3 // Lower threshold to generate more trades
    });
    
    // Display results
    console.log('\n=== BACKTEST RESULTS ===');
    console.log(`Initial Capital: $${results.initialCapital.toFixed(2)}`);
    console.log(`Final Capital: $${results.finalCapital.toFixed(2)}`);
    console.log(`Total Return: ${results.performanceMetrics.totalReturn}`);
    console.log(`Number of Trades: ${results.numTrades}`);
    console.log(`Win Rate: ${results.performanceMetrics.winRate}`);
    console.log(`Max Drawdown: ${results.performanceMetrics.maxDrawdown}`);
    console.log(`Sharpe Ratio: ${results.performanceMetrics.sharpeRatio}`);
    
    // Show sample trades
    console.log('\n=== SAMPLE TRADES ===');
    if (results.trades.length > 0) {
      const sampleTrades = results.trades.slice(0, 10); // Show first 10 trades
      sampleTrades.forEach((trade, index) => {
        console.log(`${index + 1}. ${trade.type} ${trade.side} ${trade.size.toFixed(4)} @ ${trade.price.toFixed(2)}`);
        if (trade.pnl !== undefined) {
          console.log(`   PnL: $${trade.pnl.toFixed(2)}`);
        }
        console.log(`   Confidence: ${(trade.confidence * 100).toFixed(1)}%`);
      });
      
      if (results.trades.length > 10) {
        console.log(`... and ${results.trades.length - 10} more trades`);
      }
    } else {
      console.log('No trades were executed during the backtest.');
    }
    
    console.log('\nBacktest Service test completed successfully!');
  } catch (error) {
    console.error('Error testing Backtest Service:', error);
  }
}

// Run the test
testBacktestService();