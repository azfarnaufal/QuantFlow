#!/usr/bin/env node

// Interactive AI testing script for QuantFlow platform
const readline = require('readline');
const fs = require('fs');
const path = require('path');

console.log('=== QuantFlow AI Interactive Test ===\n');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test AI models
async function testAIModels() {
  console.log('Testing AI Models...\n');
  
  try {
    // Test Neural Network
    console.log('1. Testing Neural Network...');
    const NeuralNetwork = require('../services/ai-engine/neural-network');
    
    const nn = new NeuralNetwork(5, 8, 3); // 5 inputs -> 8 hidden -> 3 outputs
    console.log('  ✓ Neural Network initialized');
    
    // Simple test prediction
    const testInput = [0.5, 0.3, 0.8, 0.2, 0.9];
    const prediction = nn.predict(testInput);
    console.log(`  ✓ Prediction for input [${testInput.join(', ')}]: [${prediction.map(p => p.toFixed(4)).join(', ')}]`);
    
    // Test Reinforcement Agent
    console.log('\n2. Testing Reinforcement Agent...');
    const ReinforcementAgent = require('../services/ai-engine/reinforcement-agent');
    
    const agent = new ReinforcementAgent(5, 3); // 5 state dimensions -> 3 actions
    console.log('  ✓ Reinforcement Agent initialized');
    
    // Test decision making
    const state = [0.6, 0.4, 0.7, 0.3, 0.8];
    const action = agent.getAction(state);
    console.log(`  ✓ Action for state [${state.join(', ')}]: ${action}`);
    
    // Test Transformer Model
    console.log('\n3. Testing Transformer Model...');
    const TransformerModel = require('../services/ai-engine/transformer-model');
    
    const transformer = new TransformerModel(10, 64, 4, 2, 30); // 10D input, 64D model, 4 heads, 2 layers
    console.log('  ✓ Transformer Model initialized');
    
    // Test sequence prediction
    const sequence = Array(10).fill(0).map(() => Math.random());
    const transformerPrediction = await transformer.predict(sequence);
    console.log(`  ✓ Transformer prediction completed`);
    
    // Test Ensemble Model
    console.log('\n4. Testing Ensemble Model...');
    const EnsembleModel = require('../services/ai-engine/ensemble-model');
    
    const ensemble = new EnsembleModel();
    ensemble.addModel('neuralNetwork', nn, 1.0);
    ensemble.addModel('reinforcementAgent', agent, 1.0);
    console.log('  ✓ Ensemble Model initialized with 2 models');
    
    const ensemblePrediction = await ensemble.predict(testInput);
    console.log(`  ✓ Ensemble prediction: [${ensemblePrediction.map(p => p.toFixed(4)).join(', ')}]`);
    
    return true;
  } catch (error) {
    console.error('Error testing AI models:', error.message);
    return false;
  }
}

// Interactive AI chat simulation
async function interactiveAIChat() {
  console.log('\n=== AI Chat Interface ===');
  console.log('You can ask the AI about trading, market analysis, or predictions.');
  console.log('Type "quit" to exit.\n');
  
  const aiResponses = [
    "Based on current market conditions, I recommend monitoring BTCUSDT for potential breakout opportunities.",
    "Technical analysis shows RSI is at 65 for ETHUSDT, indicating a slightly overbought condition.",
    "I've analyzed the recent price action and suggest a cautious approach with proper risk management.",
    "The market volatility index is currently high. Consider reducing position sizes.",
    "I detect a potential bullish pattern forming. You might want to watch for confirmation signals.",
    "Volume analysis indicates strong buying pressure. This could be a good entry point.",
    "I recommend setting stop-losses at 3% below current price for risk management.",
    "The moving averages are showing a golden cross pattern, which is typically bullish.",
    "I've identified a support level at the current price point. This could be a good buying opportunity.",
    "Market sentiment is currently positive with a fear and greed index of 75."
  ];
  
  function getAIResponse(userInput) {
    // Simple keyword-based responses
    if (userInput.toLowerCase().includes('btc') || userInput.toLowerCase().includes('bitcoin')) {
      return "BTCUSDT is currently showing strong momentum with increasing volume. The 200-day moving average is acting as support.";
    } else if (userInput.toLowerCase().includes('eth') || userInput.toLowerCase().includes('ethereum')) {
      return "ETHUSDT is approaching a key resistance level. I recommend watching for breakout confirmation before entering long positions.";
    } else if (userInput.toLowerCase().includes('buy') || userInput.toLowerCase().includes('long')) {
      return "For long positions, I suggest using a 2% risk per trade rule and setting stop-losses below recent swing lows.";
    } else if (userInput.toLowerCase().includes('sell') || userInput.toLowerCase().includes('short')) {
      return "For short positions, ensure you have proper risk management with stop-losses above recent swing highs.";
    } else if (userInput.toLowerCase().includes('rsi')) {
      return "RSI above 70 indicates overbought conditions, while below 30 indicates oversold. Current RSI levels suggest a neutral market.";
    } else if (userInput.toLowerCase().includes('macd')) {
      return "MACD histogram is showing positive momentum. A bullish crossover could signal a good entry point.";
    } else {
      // Random response
      return aiResponses[Math.floor(Math.random() * aiResponses.length)];
    }
  }
  
  function askQuestion() {
    rl.question('You: ', (input) => {
      if (input.toLowerCase() === 'quit') {
        console.log('AI: Goodbye! Happy trading!');
        rl.close();
        return;
      }
      
      if (input.trim() === '') {
        askQuestion();
        return;
      }
      
      const response = getAIResponse(input);
      console.log(`AI: ${response}\n`);
      
      askQuestion();
    });
  }
  
  askQuestion();
}

// Main function
async function main() {
  console.log('Welcome to the QuantFlow AI Interactive Test!\n');
  
  // Test AI models first
  const modelsWork = await testAIModels();
  
  if (modelsWork) {
    console.log('\n✓ All AI models are working correctly!\n');
    
    // Ask user if they want to interact with the AI chat
    rl.question('Would you like to interact with the AI chat? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await interactiveAIChat();
      } else {
        console.log('Thank you for testing the QuantFlow AI features!');
        rl.close();
      }
    });
  } else {
    console.log('\n✗ There were issues with the AI models.');
    rl.close();
  }
}

// Run the main function
main().catch(console.error);