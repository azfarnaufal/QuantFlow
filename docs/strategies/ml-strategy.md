# Machine Learning Strategy

The Machine Learning Strategy is a sophisticated trading strategy that uses machine learning techniques to predict price movements and generate trading signals.

## Overview

This strategy uses a simplified neural network approach to analyze historical price data and technical indicators to predict future price movements. The strategy then generates buy/sell signals based on these predictions.

## Features

- Uses technical indicators as features for the ML model
- Implements transaction cost modeling for realistic backtesting
- Configurable lookback period and prediction threshold
- Generates confidence scores for each prediction

## Configuration Options

| Option | Description | Default Value |
|--------|-------------|---------------|
| `lookbackPeriod` | Number of periods to look back for feature calculation | 20 |
| `threshold` | Prediction threshold for generating signals | 0.5 |

## How It Works

1. **Feature Preparation**: The strategy calculates various technical indicators from the lookback period:
   - Price changes
   - Moving averages (SMA5, SMA10, SMA20)
   - RSI-like momentum indicator

2. **Prediction**: A simplified neural network (represented by weighted features) generates a prediction score between 0 and 1.

3. **Signal Generation**: 
   - If prediction > threshold: BUY signal
   - If prediction < (1 - threshold): SELL signal
   - Otherwise: HOLD signal

4. **Portfolio Simulation**: The strategy simulates a portfolio with transaction costs (0.1% per trade).

## Usage

```javascript
const MLStrategy = require('./src/strategies/ml-strategy');

const strategy = new MLStrategy({
  lookbackPeriod: 20,
  threshold: 0.55
});

const result = strategy.generateSignals(priceData);
```

## API Endpoints

The ML strategy is accessible through the backtesting API:

```
GET /backtest/strategies
POST /backtest/run
```

In the POST request, specify `strategy: "ml_strategy"` to use this strategy.

## Example Response

```json
{
  "symbol": "BTCUSDT",
  "strategy": "ml_strategy",
  "signals": [
    {
      "time": 20,
      "price": 48655.23,
      "signal": "BUY",
      "confidence": 0.92
    }
  ],
  "portfolio": [
    {
      "time": 20,
      "price": 48655.23,
      "signal": "BUY",
      "cash": 0,
      "shares": 0.205,
      "transactionCost": 10.00,
      "portfolioValue": 10000.00
    }
  ]
}
```

## Performance Metrics

The strategy calculates the following performance metrics:
- Total Return
- Sharpe Ratio
- Maximum Drawdown
- Volatility
- Number of Trades
- Total Transaction Costs

## Limitations

- This is a simplified implementation for demonstration purposes
- In a production environment, you would use a trained ML model
- The "neural network" is currently just a weighted sum of features
- No real model training or validation is performed

## Future Improvements

- Integration with real ML frameworks (TensorFlow.js, ONNX.js)
- Model training and validation capabilities
- Feature selection and engineering improvements
- Ensemble methods combining multiple models
- Real-time model updating based on new data