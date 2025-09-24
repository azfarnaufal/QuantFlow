const AIEngine = require('../ai-engine/ai-engine');

async function testAIEngine() {
  console.log('Testing AI Engine...');
  
  // Create AI engine instance
  const aiEngine = new AIEngine();
  
  try {
    // Initialize the AI engine
    await aiEngine.initialize();
    console.log('AI Engine initialized successfully');
    
    // Create sample market data
    const sampleMarketData = {
      price: 35000,
      changePercent: 2.5,
      volume: 1000,
      fundingRate: 0.0001,
      openInterest: 50000,
      rsi: 65,
      macd: 0.5,
      bollingerUpper: 36000,
      bollingerLower: 34000,
      vwap: 34900,
      bidPrice: 34999,
      askPrice: 35001,
      bidVolume: 50,
      askVolume: 45,
      spread: 2,
      sentiment: 0.7
    };
    
    // Make a prediction
    console.log('Making prediction with sample data...');
    const prediction = await aiEngine.predict(sampleMarketData);
    
    console.log('Prediction result:');
    console.log('- Action:', prediction.action);
    console.log('- Confidence:', prediction.confidence.toFixed(4));
    console.log('- Probabilities:');
    console.log('  - LONG:', prediction.probabilities.LONG.toFixed(4));
    console.log('  - SHORT:', prediction.probabilities.SHORT.toFixed(4));
    console.log('  - HOLD:', prediction.probabilities.HOLD.toFixed(4));
    
    // Get model performance
    const performance = aiEngine.getModelPerformance();
    console.log('Model Performance:', JSON.stringify(performance, null, 2));
    
    console.log('AI Engine test completed successfully!');
  } catch (error) {
    console.error('Error testing AI Engine:', error);
  }
}

// Run the test
testAIEngine();