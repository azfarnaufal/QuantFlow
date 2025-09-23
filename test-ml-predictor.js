// Test script for machine learning predictor
const SimpleMLPredictor = require('./simple-ml-predictor');

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

// Test all prediction methods
function testPredictions() {
  console.log('Testing Machine Learning Predictions...\n');
  
  const prices = generateSampleData();
  console.log(`Generated ${prices.length} sample prices`);
  console.log(`Price range: $${prices[0].toFixed(2)} to $${prices[prices.length-1].toFixed(2)}\n`);
  
  const predictor = new SimpleMLPredictor();
  
  // Test linear regression
  const lrModel = predictor.trainLinearRegression(prices);
  console.log('Linear Regression Model:');
  console.log(`  Slope: ${lrModel.slope.toFixed(6)}`);
  console.log(`  Intercept: ${lrModel.intercept.toFixed(2)}`);
  console.log(`  R-squared: ${lrModel.rSquared.toFixed(4)}\n`);
  
  // Test linear regression prediction
  const lrPredictions = predictor.predictLinearRegression(lrModel, 5, prices.length - 1);
  console.log('Linear Regression Predictions (next 5 steps):');
  lrPredictions.forEach((pred, i) => {
    console.log(`  Step ${i + 1}: $${pred.toFixed(2)}`);
  });
  console.log();
  
  // Test SMA prediction
  const smaPrediction = predictor.predictSMA(prices, 10);
  console.log(`Simple Moving Average Prediction: $${smaPrediction.toFixed(2)}\n`);
  
  // Test exponential smoothing prediction
  const esPrediction = predictor.predictExponentialSmoothing(prices, 0.3);
  console.log(`Exponential Smoothing Prediction: $${esPrediction.toFixed(2)}\n`);
  
  // Test ensemble prediction
  const ensemble = predictor.ensemblePredict(prices);
  console.log('Ensemble Prediction:');
  console.log(`  Linear Regression: $${ensemble.linearRegression}`);
  console.log(`  Simple Moving Average: $${ensemble.simpleMovingAverage}`);
  console.log(`  Exponential Smoothing: $${ensemble.exponentialSmoothing}`);
  console.log(`  Ensemble: $${ensemble.ensemble}\n`);
  
  // Test accuracy metrics
  // Use last 20 prices as "actual" and predict them
  const actualPrices = prices.slice(-20);
  const trainPrices = prices.slice(0, -20);
  
  const trainModel = predictor.trainLinearRegression(trainPrices);
  const predictedPrices = [];
  
  for (let i = 0; i < actualPrices.length; i++) {
    const timeIndex = trainPrices.length + i;
    const predictedPrice = trainModel.slope * timeIndex + trainModel.intercept;
    predictedPrices.push(predictedPrice);
  }
  
  const accuracy = predictor.calculateAccuracyMetrics(actualPrices, predictedPrices);
  console.log('Prediction Accuracy Metrics:');
  console.log(`  MAE: ${accuracy.mae}`);
  console.log(`  MSE: ${accuracy.mse}`);
  console.log(`  RMSE: ${accuracy.rmse}`);
  console.log(`  MAPE: ${accuracy.mape}%\n`);
  
  console.log('All tests completed.');
}

// Run the tests
testPredictions();