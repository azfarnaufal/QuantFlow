# Portfolio Strategy

The Portfolio Strategy is an advanced backtesting strategy that supports multi-asset portfolio optimization and rebalancing.

## Overview

This strategy allows backtesting with multiple assets simultaneously, implementing various portfolio allocation methods and rebalancing techniques.

## Features

- Multi-asset backtesting support
- Multiple allocation methods (equal weight, momentum, volatility)
- Configurable rebalancing frequency
- Portfolio performance tracking
- Transaction cost modeling

## Configuration Options

| Option | Description | Default Value |
|--------|-------------|---------------|
| `rebalanceFrequency` | How often to rebalance the portfolio (in periods) | 20 |
| `allocationMethod` | Method for asset allocation (equal, momentum, volatility) | "equal" |

## Allocation Methods

### Equal Weight
Allocates equal weight to all assets in the portfolio.

### Momentum
Allocates weights based on recent price momentum - assets with higher momentum receive higher weights.

### Volatility (Inverse Volatility)
Allocates weights inversely proportional to volatility - assets with lower volatility receive higher weights.

## How It Works

1. **Data Alignment**: Aligns price data for all assets to the same time periods.

2. **Initial Allocation**: Calculates initial weights based on the selected allocation method and allocates capital accordingly.

3. **Portfolio Tracking**: Tracks portfolio value over time as asset prices change.

4. **Rebalancing**: Periodically rebalances the portfolio according to the specified frequency and allocation method.

5. **Performance Calculation**: Calculates portfolio performance metrics including total return and risk metrics.

## Usage

```javascript
const PortfolioStrategy = require('./src/strategies/portfolio-strategy');

const strategy = new PortfolioStrategy({
  rebalanceFrequency: 20,
  allocationMethod: 'momentum'
});

const multiAssetData = {
  'BTCUSDT': [45000, 46000, 47000, ...],
  'ETHUSDT': [3000, 3100, 3200, ...],
  'SOLUSDT': [100, 105, 110, ...]
};

const result = strategy.generateBacktest(multiAssetData);
```

## API Endpoints

The Portfolio strategy is accessible through the backtesting API:

```
GET /backtest/strategies
POST /backtest/run
```

In the POST request, specify `strategy: "portfolio_strategy"` to use this strategy.

## Example Response

```json
{
  "symbol": "MULTI_ASSET",
  "strategy": "portfolio_strategy",
  "portfolioHistory": [
    {
      "time": 0,
      "value": 10000.00,
      "cash": 0,
      "priceData": {
        "BTCUSDT": 45000,
        "ETHUSDT": 3000,
        "SOLUSDT": 100
      }
    }
  ],
  "metrics": {
    "initialValue": 10000.00,
    "finalValue": 12500.00,
    "totalReturn": 25.00,
    "periods": 200
  }
}
```

## Performance Metrics

The strategy calculates the following performance metrics:
- Total Portfolio Return
- Initial and Final Portfolio Values
- Number of Rebalancing Periods

## Limitations

- Simplified transaction cost model
- No margin or leverage support
- Limited allocation methods
- No short selling support

## Future Improvements

- Additional allocation methods (risk parity, minimum variance)
- Margin and leverage support
- Short selling capabilities
- More sophisticated transaction cost modeling
- Tax optimization
- Advanced risk management features
- Integration with real market data feeds