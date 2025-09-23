# Strategy Development Guide

This guide explains how to create custom trading strategies for the QuantFlow platform.

## Strategy Structure

All strategies in QuantFlow follow a consistent structure. Each strategy is implemented as a JavaScript class with specific methods.

### Basic Strategy Template

```javascript
class CustomStrategy {
  constructor(options = {}) {
    this.name = 'customStrategy';
    this.description = 'Custom Trading Strategy';
    this.options = {
      // Default options
      ...options
    };
  }

  /**
   * Generate trading signals based on price data
   * @param {Array} prices - Array of price data
   * @returns {Object} Strategy results including signals and portfolio data
   */
  generateSignals(prices) {
    const signals = [];
    const portfolio = [];
    
    // Implementation goes here
    
    return { signals, portfolio };
  }
}

module.exports = CustomStrategy;
```

## Required Methods

### `constructor(options)`
Initialize the strategy with optional configuration parameters.

### `generateSignals(prices)`
Generate trading signals based on historical price data. This method should return an object with:
- `signals`: Array of signal objects
- `portfolio`: Array of portfolio state objects

## Signal Format

Each signal object should have the following structure:

```javascript
{
  time: number,        // Index or timestamp
  price: number,       // Price at this time
  signal: string,      // 'BUY', 'SELL', or 'HOLD'
  // Additional strategy-specific fields
}
```

## Portfolio Format

Each portfolio object should have the following structure:

```javascript
{
  time: number,           // Index or timestamp
  price: number,          // Price at this time
  signal: string,         // 'BUY', 'SELL', or 'HOLD'
  cash: number,           // Cash balance
  shares: number,         // Number of shares held
  transactionCost: number, // Transaction costs for this trade
  portfolioValue: number   // Total portfolio value (cash + shares * price)
}
```

## Example: Simple Moving Average Crossover Strategy

```javascript
class SMACrossoverStrategy {
  constructor(options = {}) {
    this.name = 'smaCrossover';
    this.description = 'Simple Moving Average Crossover Strategy';
    this.options = {
      shortPeriod: options.shortPeriod || 10,
      longPeriod: options.longPeriod || 20,
      ...options
    };
  }

  generateSignals(prices) {
    const signals = [];
    const portfolio = [];
    
    const startPeriod = Math.max(this.options.shortPeriod, this.options.longPeriod);
    
    if (prices.length <= startPeriod) {
      return { signals: [], portfolio: [] };
    }

    // Generate signals
    for (let i = startPeriod; i < prices.length; i++) {
      // Calculate SMAs
      const shortSMA = prices.slice(i - this.options.shortPeriod, i)
        .reduce((sum, price) => sum + price, 0) / this.options.shortPeriod;
      const longSMA = prices.slice(i - this.options.longPeriod, i)
        .reduce((sum, price) => sum + price, 0) / this.options.longPeriod;

      // Generate signal
      let signal = 'HOLD';
      if (shortSMA > longSMA) {
        signal = 'BUY';
      } else if (shortSMA < longSMA) {
        signal = 'SELL';
      }

      signals.push({
        time: i,
        price: prices[i],
        signal: signal,
        shortSMA: shortSMA,
        longSMA: longSMA
      });
    }

    // Simulate portfolio (simplified)
    // ... portfolio simulation code ...
    
    return { signals, portfolio };
  }
}

module.exports = SMACrossoverStrategy;
```

## Integration with Backtesting Engine

To integrate your strategy with the backtesting engine:

1. Create your strategy class in `src/strategies/`
2. Import and register it in `src/backtesting/backtesting-engine.js`:

```javascript
// Import your strategy
const CustomStrategy = require('../strategies/custom-strategy');

// Register the strategy
engine.registerStrategy('customStrategy', BacktestingEngine.customStrategy);

// Add a static method to the BacktestingEngine class
BacktestingEngine.customStrategy = (prices, options = {}) => {
  const strategy = new CustomStrategy(options);
  return strategy.generateSignals(prices);
};
```

## Testing Your Strategy

Create a test file in the `tests/` directory:

```javascript
// test-custom-strategy.js
const CustomStrategy = require('../src/strategies/custom-strategy');

// Generate sample data or load real data
const testData = [/* price data */];

// Create strategy instance
const strategy = new CustomStrategy({
  // Custom options
});

// Generate signals
const result = strategy.generateSignals(testData);

// Analyze results
console.log('Signals generated:', result.signals.length);
console.log('Portfolio entries:', result.portfolio.length);
```

Run your test:
```bash
node tests/test-custom-strategy.js
```

## Best Practices

1. **Handle edge cases**: Ensure your strategy works with insufficient data
2. **Include transaction costs**: Model realistic trading costs
3. **Validate inputs**: Check that required parameters are provided
4. **Document options**: Clearly document all configurable options
5. **Test thoroughly**: Create comprehensive tests for your strategy
6. **Optimize performance**: Avoid unnecessary calculations in loops
7. **Follow naming conventions**: Use camelCase for methods and variables

## Performance Considerations

- Minimize memory allocations in tight loops
- Cache expensive calculations when possible
- Use efficient data structures for large datasets
- Consider using WebAssembly for compute-intensive operations