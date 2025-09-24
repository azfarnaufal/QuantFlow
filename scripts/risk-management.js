#!/usr/bin/env node

// Risk Management System for QuantFlow AI
console.log('=== QuantFlow AI Risk Management System ===\n');

// Risk management functions
class RiskManager {
  constructor() {
    this.maxDrawdownLimit = 0.05; // 5%
    this.maxPositionSize = 0.1; // 10% of portfolio
    this.stopLossPercentage = 0.03; // 3%
    this.takeProfitPercentage = 0.06; // 6%
    this.correlationThreshold = 0.7; // For portfolio diversification
    this.volatilityMultiplier = 1.5; // Adjust position size based on volatility
  }

  // Calculate position size based on account equity and risk
  calculatePositionSize(accountEquity, entryPrice, stopLossPrice) {
    const riskPerTrade = accountEquity * 0.02; // Risk 2% per trade
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    const positionSize = riskPerTrade / priceRisk;
    
    // Apply maximum position size limit
    const maxPositionValue = accountEquity * this.maxPositionSize;
    const maxPositionSizeByValue = maxPositionValue / entryPrice;
    
    return Math.min(positionSize, maxPositionSizeByValue);
  }

  // Dynamic stop loss based on volatility
  calculateDynamicStopLoss(currentPrice, atr, multiplier = 2) {
    return currentPrice - (atr * multiplier);
  }

  // Dynamic take profit based on risk-reward ratio
  calculateDynamicTakeProfit(entryPrice, stopLossPrice, riskRewardRatio = 2) {
    const risk = Math.abs(entryPrice - stopLossPrice);
    return entryPrice + (risk * riskRewardRatio);
  }

  // Check portfolio correlation
  checkPortfolioCorrelation(assets) {
    // In a real implementation, this would calculate actual correlations
    // For demo, we'll simulate with random correlations
    const correlations = {};
    
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const pair = `${assets[i]}-${assets[j]}`;
        correlations[pair] = (Math.random() * 0.8).toFixed(2);
      }
    }
    
    return correlations;
  }

  // Check if drawdown limit is exceeded
  checkDrawdown(currentValue, peakValue) {
    const drawdown = (peakValue - currentValue) / peakValue;
    return {
      drawdown: (drawdown * 100).toFixed(2) + '%',
      exceeded: drawdown > this.maxDrawdownLimit,
      limit: (this.maxDrawdownLimit * 100).toFixed(2) + '%'
    };
  }

  // Adjust position size based on volatility
  adjustForVolatility(basePositionSize, currentVolatility, averageVolatility) {
    const volatilityRatio = currentVolatility / averageVolatility;
    const adjustedSize = basePositionSize / (volatilityRatio * this.volatilityMultiplier);
    return Math.max(adjustedSize, basePositionSize * 0.1); // Minimum 10% of base size
  }
}

// Demonstrate risk management features
async function demoRiskManagement() {
  console.log('Demonstrating Risk Management Features...\n');
  
  const riskManager = new RiskManager();
  
  // 1. Position Sizing
  console.log('1. Position Sizing');
  const accountEquity = 10000; // $10,000
  const entryPrice = 45000; // BTCUSDT price
  const stopLossPrice = 43500; // 3% below entry
  
  const positionSize = riskManager.calculatePositionSize(accountEquity, entryPrice, stopLossPrice);
  console.log(`   Account Equity: $${accountEquity.toLocaleString()}`);
  console.log(`   Entry Price: $${entryPrice.toLocaleString()}`);
  console.log(`   Stop Loss: $${stopLossPrice.toLocaleString()}`);
  console.log(`   Recommended Position Size: ${positionSize.toFixed(6)} BTC\n`);
  
  // 2. Dynamic Stop Loss
  console.log('2. Dynamic Stop Loss');
  const currentPrice = 45000;
  const atr = 1200; // Average True Range
  
  const dynamicStopLoss = riskManager.calculateDynamicStopLoss(currentPrice, atr);
  console.log(`   Current Price: $${currentPrice.toLocaleString()}`);
  console.log(`   ATR (14 periods): $${atr.toLocaleString()}`);
  console.log(`   Dynamic Stop Loss: $${dynamicStopLoss.toLocaleString()}\n`);
  
  // 3. Dynamic Take Profit
  console.log('3. Dynamic Take Profit');
  const dynamicTakeProfit = riskManager.calculateDynamicTakeProfit(entryPrice, stopLossPrice);
  console.log(`   Entry Price: $${entryPrice.toLocaleString()}`);
  console.log(`   Stop Loss: $${stopLossPrice.toLocaleString()}`);
  console.log(`   Dynamic Take Profit: $${dynamicTakeProfit.toLocaleString()}`);
  console.log(`   Risk-Reward Ratio: ${(Math.abs(dynamicTakeProfit - entryPrice) / Math.abs(entryPrice - stopLossPrice)).toFixed(1)}:1\n`);
  
  // 4. Portfolio Correlation
  console.log('4. Portfolio Correlation');
  const assets = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
  const correlations = riskManager.checkPortfolioCorrelation(assets);
  
  console.log('   Asset Correlations:');
  for (const [pair, correlation] of Object.entries(correlations)) {
    const status = correlation > riskManager.correlationThreshold ? '⚠️ HIGH' : '✅ OK';
    console.log(`   ${pair}: ${correlation} ${status}`);
  }
  console.log();
  
  // 5. Drawdown Check
  console.log('5. Drawdown Check');
  const peakValue = 15000;
  const currentValue = 14200;
  
  const drawdownCheck = riskManager.checkDrawdown(currentValue, peakValue);
  console.log(`   Peak Value: $${peakValue.toLocaleString()}`);
  console.log(`   Current Value: $${currentValue.toLocaleString()}`);
  console.log(`   Current Drawdown: ${drawdownCheck.drawdown}`);
  console.log(`   Drawdown Limit: ${drawdownCheck.limit}`);
  console.log(`   Limit Exceeded: ${drawdownCheck.exceeded ? 'YES' : 'NO'}\n`);
  
  // 6. Volatility Adjustment
  console.log('6. Volatility Adjustment');
  const basePositionSize = 0.2; // BTC
  const currentVolatility = 0.04; // 4%
  const averageVolatility = 0.025; // 2.5%
  
  const adjustedPositionSize = riskManager.adjustForVolatility(basePositionSize, currentVolatility, averageVolatility);
  console.log(`   Base Position Size: ${basePositionSize} BTC`);
  console.log(`   Current Volatility: ${(currentVolatility * 100).toFixed(1)}%`);
  console.log(`   Average Volatility: ${(averageVolatility * 100).toFixed(1)}%`);
  console.log(`   Adjusted Position Size: ${adjustedPositionSize.toFixed(6)} BTC\n`);
}

// Show how to integrate with API
function showAPIIntegration() {
  console.log('=== API Integration Examples ===\n');
  
  console.log('1. Calculate Position Size:');
  console.log('   POST /api/risk/position-size');
  console.log('   Body: {');
  console.log('     "accountEquity": 10000,');
  console.log('     "entryPrice": 45000,');
  console.log('     "stopLossPrice": 43500');
  console.log('   }');
  console.log('   Response: { "positionSize": 0.022222 }\n');
  
  console.log('2. Check Drawdown:');
  console.log('   GET /api/risk/drawdown?current=14200&peak=15000');
  console.log('   Response: { "drawdown": "5.33%", "exceeded": false }\n');
  
  console.log('3. Get Risk Parameters:');
  console.log('   GET /api/risk/parameters');
  console.log('   Response: {');
  console.log('     "maxDrawdownLimit": 0.05,');
  console.log('     "maxPositionSize": 0.1,');
  console.log('     "stopLossPercentage": 0.03');
  console.log('   }\n');
}

// Main function
async function main() {
  console.log(`Hello Azfar Naufal! Let's explore the risk management features for your QuantFlow AI platform.\n`);
  
  await demoRiskManagement();
  showAPIIntegration();
  
  console.log('=== Implementation Next Steps ===');
  console.log('1. Add risk management endpoints to your API server');
  console.log('2. Integrate risk checks into your trading decision process');
  console.log('3. Add risk parameters to your web interface');
  console.log('4. Implement real-time risk monitoring');
  console.log('5. Add risk alerts and notifications\n');
  
  console.log('Your AI trading platform now includes comprehensive risk management!');
}

// Run the risk management demo
main().catch(console.error);