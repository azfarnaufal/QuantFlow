// Simple strategy test to verify our backtesting framework
class SimpleStrategy {
  constructor() {
    this.previousPrice = null;
  }
  
  // Simple moving average crossover strategy
  predict(marketData) {
    if (this.previousPrice === null) {
      this.previousPrice = marketData.close;
      return { action: 'HOLD', confidence: 0.5 };
    }
    
    // Simple trend following
    const priceChange = (marketData.close - this.previousPrice) / this.previousPrice;
    this.previousPrice = marketData.close;
    
    if (priceChange > 0.005) { // 0.5% increase
      return { action: 'LONG', confidence: 0.7 };
    } else if (priceChange < -0.005) { // 0.5% decrease
      return { action: 'SHORT', confidence: 0.7 };
    } else {
      return { action: 'HOLD', confidence: 0.3 };
    }
  }
}

// Test the simple strategy with our backtest framework
const BacktestService = require('./backtest-service');

async function testSimpleStrategy() {
  console.log('Testing Simple Strategy with Backtest Framework...');
  
  // Create a modified backtest service that uses our simple strategy
  class SimpleStrategyBacktest extends BacktestService {
    constructor() {
      super();
      this.strategy = new SimpleStrategy();
    }
    
    // Override the predict method to use our simple strategy
    async predict(marketData) {
      return this.strategy.predict(marketData);
    }
  }
  
  // Create backtest service instance
  const backtestService = new SimpleStrategyBacktest();
  
  try {
    // Generate synthetic data for testing
    console.log('Generating synthetic historical data...');
    const testData = backtestService.generateSyntheticData('BTCUSDT', 1000);
    console.log(`Generated ${testData.length} data points`);
    
    // Run backtest
    console.log('Running backtest with simple strategy...');
    
    // We'll manually run the backtest logic here since we're overriding the prediction
    const initialCapital = 10000;
    const commission = 0.001;
    const slippage = 0.0005;
    const riskPercent = 0.02;
    const confidenceThreshold = 0.5;
    
    let capital = initialCapital;
    let position = null;
    let trades = [];
    
    for (let i = 0; i < testData.length; i++) {
      const dataPoint = testData[i];
      
      // Extract market data
      const marketData = {
        price: dataPoint.close,
        open: dataPoint.open,
        high: dataPoint.high,
        low: dataPoint.low,
        volume: dataPoint.volume,
        close: dataPoint.close
      };
      
      // Get prediction from simple strategy
      const prediction = backtestService.strategy.predict(marketData);
      
      // Only trade if confidence is above threshold
      if (prediction.confidence >= confidenceThreshold) {
        // Risk management - fixed position sizing
        const positionSize = (capital * riskPercent) / dataPoint.close;
        
        // Execute trading logic
        if (position === null) {
          // No position, consider entering
          if (prediction.action === 'LONG') {
            // Enter long position
            position = {
              side: 'LONG',
              entryPrice: dataPoint.close * (1 + slippage),
              size: positionSize,
              timestamp: dataPoint.timestamp
            };
            
            capital -= position.size * position.entryPrice * (1 + commission);
            
            trades.push({
              type: 'ENTRY',
              side: 'LONG',
              price: position.entryPrice,
              size: position.size,
              timestamp: dataPoint.timestamp,
              capitalBefore: capital + position.size * position.entryPrice * (1 + commission),
              confidence: prediction.confidence
            });
          } else if (prediction.action === 'SHORT') {
            // Enter short position
            position = {
              side: 'SHORT',
              entryPrice: dataPoint.close * (1 - slippage),
              size: positionSize,
              timestamp: dataPoint.timestamp
            };
            
            trades.push({
              type: 'ENTRY',
              side: 'SHORT',
              price: position.entryPrice,
              size: position.size,
              timestamp: dataPoint.timestamp,
              capitalBefore: capital,
              confidence: prediction.confidence
            });
          }
        } else {
          // Have position, consider exit or reversal
          let shouldExit = false;
          
          if (position.side === 'LONG' && prediction.action !== 'LONG') {
            shouldExit = true;
          } else if (position.side === 'SHORT' && prediction.action !== 'SHORT') {
            shouldExit = true;
          }
          
          if (shouldExit) {
            // Exit position
            const exitPrice = position.side === 'LONG' ? 
              dataPoint.close * (1 - slippage) : 
              dataPoint.close * (1 + slippage);
              
            const pnl = position.side === 'LONG' ? 
              (exitPrice - position.entryPrice) * position.size :
              (position.entryPrice - exitPrice) * position.size;
              
            capital += position.size * exitPrice * (1 - commission);
            capital += pnl;
            
            trades.push({
              type: 'EXIT',
              side: position.side,
              price: exitPrice,
              size: position.size,
              pnl: pnl,
              timestamp: dataPoint.timestamp,
              capitalAfter: capital,
              confidence: prediction.confidence
            });
            
            position = null;
          }
        }
      }
    }
    
    // Close any open position at the end
    if (position !== null) {
      const finalDataPoint = testData[testData.length - 1];
      const exitPrice = position.side === 'LONG' ? 
        finalDataPoint.close * (1 - slippage) : 
        finalDataPoint.close * (1 + slippage);
        
      const pnl = position.side === 'LONG' ? 
        (exitPrice - position.entryPrice) * position.size :
        (position.entryPrice - exitPrice) * position.size;
        
      capital += position.size * exitPrice * (1 - commission);
      capital += pnl;
      
      trades.push({
        type: 'EXIT',
        side: position.side,
        price: exitPrice,
        size: position.size,
        pnl: pnl,
        timestamp: finalDataPoint.timestamp,
        capitalAfter: capital
      });
      
      position = null;
    }
    
    // Display results
    console.log('\n=== SIMPLE STRATEGY BACKTEST RESULTS ===');
    console.log(`Initial Capital: $${initialCapital.toFixed(2)}`);
    console.log(`Final Capital: $${capital.toFixed(2)}`);
    const totalReturn = (capital - initialCapital) / initialCapital;
    console.log(`Total Return: ${(totalReturn * 100).toFixed(2)}%`);
    console.log(`Number of Trades: ${trades.length}`);
    
    // Count winning trades
    const exitTrades = trades.filter(t => t.type === 'EXIT');
    const winningTrades = exitTrades.filter(t => t.pnl > 0);
    const winRate = exitTrades.length > 0 ? winningTrades.length / exitTrades.length : 0;
    console.log(`Win Rate: ${(winRate * 100).toFixed(2)}%`);
    
    // Show sample trades
    console.log('\n=== SAMPLE TRADES ===');
    if (trades.length > 0) {
      const sampleTrades = trades.slice(0, 10);
      sampleTrades.forEach((trade, index) => {
        console.log(`${index + 1}. ${trade.type} ${trade.side} ${trade.size.toFixed(4)} @ ${trade.price.toFixed(2)}`);
        if (trade.pnl !== undefined) {
          console.log(`   PnL: $${trade.pnl.toFixed(2)}`);
        }
        console.log(`   Confidence: ${(trade.confidence * 100).toFixed(1)}%`);
      });
      
      if (trades.length > 10) {
        console.log(`... and ${trades.length - 10} more trades`);
      }
    } else {
      console.log('No trades were executed during the backtest.');
    }
    
    console.log('\nSimple strategy test completed successfully!');
  } catch (error) {
    console.error('Error testing simple strategy:', error);
  }
}

// Run the test
testSimpleStrategy();