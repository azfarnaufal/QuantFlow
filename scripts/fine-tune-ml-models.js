// Script to fine-tune ML models with more historical data

const axios = require('axios');
const fs = require('fs');

// Configuration
const CONFIG = {
  apiUrl: 'http://localhost:3001', // Staging environment
  symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  strategies: [
    'lstm_strategy',
    'transformer_strategy',
    'reinforcement_strategy'
  ],
  // Parameter ranges for optimization
  parameterRanges: {
    lstm_strategy: {
      lookbackPeriod: [30, 60, 90],
      hiddenUnits: [32, 64, 128],
      learningRate: [0.001, 0.01, 0.1]
    },
    transformer_strategy: {
      lookbackPeriod: [30, 60, 90],
      dModel: [32, 64, 128],
      numLayers: [1, 2, 3]
    },
    reinforcement_strategy: {
      learningRate: [0.01, 0.1, 0.2],
      discountFactor: [0.9, 0.95, 0.99],
      epsilon: [0.05, 0.1, 0.2]
    }
  }
};

/**
 * Optimize strategy parameters
 * @param {string} symbol - Trading symbol
 * @param {string} strategy - Strategy name
 * @returns {Promise<Object>} Optimization results
 */
async function optimizeStrategy(symbol, strategy) {
  try {
    const response = await axios.post(`${CONFIG.apiUrl}/backtest/optimize`, {
      symbol: symbol,
      strategy: strategy,
      parameterRanges: CONFIG.parameterRanges[strategy],
      objective: 'sharpe', // Optimize for Sharpe ratio
      maxIterations: 50
    });
    return response.data;
  } catch (error) {
    console.error(`Error optimizing ${strategy} for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fine-tune ML models by optimizing parameters
 */
async function fineTuneModels() {
  console.log('Starting ML model fine-tuning...\n');

  const optimizationResults = [];

  for (const symbol of CONFIG.symbols) {
    console.log(`Fine-tuning models for ${symbol}...`);

    for (const strategy of CONFIG.strategies) {
      console.log(`  Optimizing ${strategy}...`);

      try {
        const results = await optimizeStrategy(symbol, strategy);
        
        if (results) {
          optimizationResults.push({
            symbol,
            strategy,
            bestParameters: results.bestParameters,
            bestMetrics: results.bestMetrics,
            allResults: results.allResults
          });

          console.log(`    Best Sharpe Ratio: ${results.bestMetrics?.sharpeRatio || 'N/A'}`);
          console.log(`    Best Parameters:`, results.bestParameters);
        }
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
    }
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `ml-fine-tuning-${timestamp}.json`;
  
  fs.writeFileSync(
    resultsFile, 
    JSON.stringify(optimizationResults, null, 2)
  );
  
  console.log(`\nFine-tuning results saved to ${resultsFile}`);

  // Print summary
  console.log('\n=== FINE-TUNING SUMMARY ===');
  optimizationResults.forEach(result => {
    console.log(`${result.symbol} - ${result.strategy}:`);
    console.log(`  Best Sharpe Ratio: ${result.bestMetrics?.sharpeRatio || 'N/A'}`);
    console.log(`  Best Return: ${result.bestMetrics?.totalReturn || 'N/A'}%`);
    console.log('');
  });

  return optimizationResults;
}

/**
 * Update strategy files with optimized parameters
 * @param {Array} optimizationResults - Results from optimization
 */
async function updateStrategyFiles(optimizationResults) {
  console.log('Updating strategy files with optimized parameters...\n');

  // This would be implemented to modify the actual strategy files
  // For now, we'll just log what would be updated
  optimizationResults.forEach(result => {
    console.log(`Would update ${result.strategy} for ${result.symbol} with:`, result.bestParameters);
  });

  console.log('\nIn a full implementation, this would modify the strategy files directly.');
}

// Run fine-tuning if script is executed directly
if (require.main === module) {
  fineTuneModels()
    .then(results => {
      console.log('ML model fine-tuning completed.');
      
      // Update strategy files with optimized parameters
      return updateStrategyFiles(results);
    })
    .then(() => {
      console.log('Strategy files update completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fine-tuning failed:', error);
      process.exit(1);
    });
}

module.exports = { fineTuneModels, updateStrategyFiles };