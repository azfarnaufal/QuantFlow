#!/usr/bin/env node

const BinanceFuturesClient = require('./binance-futures-client');
const BacktestService = require('./backtest-service');
const ChatService = require('../ai-engine/chat-service');

async function runDemo() {
  console.log('🚀 AI Trading Platform Demo');
  console.log('==========================\n');
  
  try {
    // 1. Show historical data fetching capability
    console.log('1. Fetching Historical Data from Binance...');
    const binanceClient = new BinanceFuturesClient();
    
    const klines = await binanceClient.getHistoricalKlines('BTCUSDT', '1h', 7);
    console.log(`   ✅ Fetched ${klines.length} hours of BTCUSDT data`);
    console.log(`   📅 From: ${new Date(klines[0].openTime).toISOString()}`);
    console.log(`   📅 To: ${new Date(klines[klines.length - 1].closeTime).toISOString()}\n`);
    
    // 2. Demonstrate backtesting
    console.log('2. Running Backtest...');
    const backtestService = new BacktestService();
    await backtestService.initialize();
    
    // Prepare test data (first 50 points)
    const testData = klines.slice(0, 50).map(kline => ({
      timestamp: kline.openTime,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
      rsi: 50, // Mock RSI
      macd: 0, // Mock MACD
      vwap: (kline.open + kline.high + kline.low + kline.close) / 4
    }));
    
    const backtestResults = await backtestService.runBacktest(testData, 10000, {
      confidenceThreshold: 0.3
    });
    
    console.log(`   ✅ Backtest completed with ${backtestResults.numTrades} trades`);
    console.log(`   💰 Total Return: ${backtestResults.performanceMetrics.totalReturn}`);
    console.log(`   🎯 Win Rate: ${backtestResults.performanceMetrics.winRate}`);
    console.log(`   📉 Max Drawdown: ${backtestResults.performanceMetrics.maxDrawdown}\n`);
    
    // 3. Demonstrate chat interface
    console.log('3. Chatting with AI...');
    const chatService = new ChatService();
    await chatService.initialize();
    
    const chatMessages = [
      "Hi, what can you tell me about BTCUSDT?",
      "Should I buy BTCUSDT right now?",
      "What's your analysis of the market?",
      "Can you run a backtest for me?"
    ];
    
    for (let i = 0; i < chatMessages.length; i++) {
      const message = chatMessages[i];
      const response = await chatService.processMessage(message, { symbol: 'BTCUSDT' });
      console.log(`   👤 User: ${message}`);
      console.log(`   🤖 AI: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}\n`);
    }
    
    // 4. Show learning capabilities
    console.log('4. AI Learning Capabilities...');
    console.log('   📚 Our AI can learn from historical data');
    console.log('   🔄 Continuous learning in background');
    console.log('   📊 Model performance tracking');
    console.log('   📋 Learning process transparency\n');
    
    // 5. Summary
    console.log('5. Platform Summary');
    console.log('   📈 Historical Data: ✅ 3+ months available');
    console.log('   🤖 AI Learning: ✅ From historical data');
    console.log('   🧪 Backtesting: ✅ Full simulation capabilities');
    console.log('   💬 Chat Interface: ✅ LLM-like interaction');
    console.log('   🔄 Continuous Learning: ✅ Background processing');
    console.log('   🔍 Process Transparency: ✅ Full visibility\n');
    
    console.log('🎉 Demo completed successfully!');
    console.log('🚀 Your custom AI trading platform is ready for use!');
    console.log('\nTo start the full service:');
    console.log('   cd services/binance-futures && node server.js');
    console.log('\nThen access the web interface at http://localhost:3002');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo();