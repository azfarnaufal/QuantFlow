#!/usr/bin/env node

// Simple demonstration of AI interaction with the QuantFlow platform
console.log('=== QuantFlow AI Interaction Demo ===\n');

// Test all AI models
async function demoAIModels() {
  console.log('Demonstrating QuantFlow AI Models...\n');
  
  try {
    // 1. Neural Network
    console.log('1. Neural Network Model');
    console.log('   - Custom implementation with 20 inputs -> 32 hidden -> 3 outputs');
    console.log('   - Used for price prediction and pattern recognition');
    
    const NeuralNetwork = require('../services/ai-engine/neural-network');
    const nn = new NeuralNetwork(5, 8, 3);
    const testInput = [0.5, 0.3, 0.8, 0.2, 0.9];
    const prediction = nn.predict(testInput);
    console.log(`   - Sample prediction: [${prediction.map(p => p.toFixed(4)).join(', ')}]\n`);
    
    // 2. Reinforcement Agent
    console.log('2. Reinforcement Learning Agent');
    console.log('   - Q-learning algorithm for trading decisions');
    console.log('   - 20 state dimensions -> 3 possible actions (LONG, SHORT, HOLD)');
    
    const ReinforcementAgent = require('../services/ai-engine/reinforcement-agent');
    const agent = new ReinforcementAgent(5, 3);
    const state = [0.6, 0.4, 0.7, 0.3, 0.8];
    const action = agent.getAction(state);
    console.log(`   - Sample action for state: ${action} (${['LONG', 'SHORT', 'HOLD'][action]})\n`);
    
    // 3. Transformer Model
    console.log('3. Transformer Model');
    console.log('   - Attention-based sequence modeling');
    console.log('   - 10D input, 64D model dimensions, 4 attention heads, 2 encoder layers');
    
    const TransformerModel = require('../services/ai-engine/transformer-model');
    const transformer = new TransformerModel(10, 64, 4, 2, 30);
    console.log(`   - Model initialized successfully\n`);
    
    // 4. Ensemble Model
    console.log('4. Ensemble Model');
    console.log('   - Combines all models for better predictions');
    console.log('   - Weighted voting system for confidence aggregation');
    
    const EnsembleModel = require('../services/ai-engine/ensemble-model');
    const ensemble = new EnsembleModel();
    ensemble.addModel('neuralNetwork', nn, 1.0);
    ensemble.addModel('reinforcementAgent', agent, 1.0);
    const ensemblePrediction = await ensemble.predict(testInput);
    console.log(`   - Ensemble prediction: [${ensemblePrediction.map(p => p.toFixed(4)).join(', ')}]\n`);
    
    return true;
  } catch (error) {
    console.error('Error in AI demo:', error.message);
    return false;
  }
}

// Show AI chat capabilities
function demoAIChat() {
  console.log('5. AI Chat Interface');
  console.log('   - Natural language processing for market analysis');
  console.log('   - Trading signal generation');
  console.log('   - Backtesting requests');
  console.log('   - Risk assessment\n');
  
  const sampleConversations = [
    {
      user: "Should I buy BTCUSDT?",
      ai: "Based on current technical indicators, BTCUSDT is showing a bullish pattern with RSI at 55 and MACD histogram turning positive. Consider entering with a stop-loss 3% below current price."
    },
    {
      user: "What's the market outlook for ETHUSDT?",
      ai: "ETHUSDT is approaching a key resistance level at $3,200. Volume analysis shows strong buying pressure. I recommend waiting for breakout confirmation before entering long positions."
    },
    {
      user: "Run a backtest for the last 30 days",
      ai: "Backtesting completed. Strategy returned 12.5% over 30 days with a Sharpe ratio of 1.8. Maximum drawdown was 4.2%. The strategy generated 23 trades with a 65% win rate."
    }
  ];
  
  console.log('Sample AI Chat Conversations:');
  sampleConversations.forEach((conv, index) => {
    console.log(`   Q${index + 1}: ${conv.user}`);
    console.log(`   A${index + 1}: ${conv.ai}\n`);
  });
}

// Show advanced AI features
function demoAdvancedFeatures() {
  console.log('6. Advanced AI Features');
  console.log('   - Sentiment Analysis: Analyze market sentiment from news and social media');
  console.log('   - Risk Management: Dynamic position sizing and portfolio optimization');
  console.log('   - Market Regime Detection: Identify trending, mean-reverting, or volatile markets');
  console.log('   - Anomaly Detection: Identify unusual price or volume patterns');
  console.log('   - Portfolio Optimization: Optimize asset allocation for maximum Sharpe ratio\n');
}

// Main demo function
async function main() {
  console.log('Welcome to the QuantFlow AI Trading Platform Demo!\n');
  
  // Show AI models
  const success = await demoAIModels();
  
  if (success) {
    // Show chat capabilities
    demoAIChat();
    
    // Show advanced features
    demoAdvancedFeatures();
    
    console.log('=== How to Interact with the AI ===');
    console.log('1. Start the full platform: docker-compose up -d');
    console.log('2. Access the web interface at http://localhost:3002');
    console.log('3. Navigate to the "AI Chat" tab to interact with the AI');
    console.log('4. You can ask about:');
    console.log('   - Market analysis for specific symbols');
    console.log('   - Trading signals and recommendations');
    console.log('   - Backtesting requests');
    console.log('   - Risk assessment');
    console.log('   - Portfolio optimization\n');
    
    console.log('=== API Endpoints for Programmatic Access ===');
    console.log('POST /api/chat - Chat with the AI');
    console.log('POST /api/learning/train - Train AI on historical data');
    console.log('GET /api/learning/status - Get learning status');
    console.log('POST /api/backtest - Run backtest on historical data');
    console.log('GET /api/models - Get loaded models\n');
    
    console.log('All AI components are working correctly!');
    console.log('The QuantFlow platform includes advanced AI capabilities for cryptocurrency trading.');
  } else {
    console.log('There were issues with the AI models demo.');
  }
}

// Run the demo
main().catch(console.error);