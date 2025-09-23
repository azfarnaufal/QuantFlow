# QuantFlow - Real-time Financial Analytics Platform

A comprehensive financial market analytics platform with real-time data ingestion, machine learning predictions, backtesting engine, and automated alerting system.

## Project Evolution

Originally started as a simple crypto price tracker, QuantFlow has evolved into a sophisticated quantitative trading platform that integrates multiple technologies for comprehensive market analysis and automated trading workflows.

## Features

1. **Real-time Market Data Ingestion** - Tracks prices from Binance Perpetual Futures WebSocket with batch processing for improved performance
2. **Machine Learning Predictions** - Predictive models for price forecasting with accuracy metrics
3. **Enhanced Strategy Backtesting Engine** - Historical data backtesting with performance metrics, transaction cost modeling, and walk-forward analysis
4. **Advanced Alerting System** - Pattern-based alerts with multi-channel notifications (Telegram, Discord, Email)
5. **Enhanced Dashboard** - Comparison charts, volume analysis, and customizable watchlists
6. **Technical Indicators** - RSI, MACD, SMA, EMA, Bollinger Bands and more
7. **Persistent Storage** - TimescaleDB integration with connection pooling for historical data management
8. **Portfolio Simulation** - Virtual trading with performance tracking and transaction cost modeling

## Technology Stack

- Node.js with Express.js
- WebSocket client for real-time market data
- TimescaleDB for time-series data storage with connection pooling
- Chart.js for data visualization
- Node-RED for workflow automation and data transformation
- RESTful API architecture
- Docker containerization with Docker Compose orchestration
- Jest for unit testing

## Core Components

### Data Ingestion
- Real-time WebSocket connection to Binance Perpetual Futures
- Configurable symbol tracking
- Batch processing for improved performance
- Persistent data storage with TimescaleDB

### Analytics Engine
- Machine learning price prediction models
- Technical indicator calculations
- Custom algorithmic strategy implementation

### Enhanced Backtesting Framework
- Historical data strategy testing with multiple sophisticated strategies:
  - Simple Moving Average Crossover
  - RSI Mean Reversion
  - Momentum
  - Mean Reversion
- Performance metrics (Sharpe ratio, max drawdown, etc.)
- Portfolio simulation with transaction cost modeling
- Walk-forward analysis for strategy validation

### Alerting System
- Price threshold alerts
- Technical pattern recognition alerts
- Multi-channel notifications (Telegram, Discord, Email)
- Scheduled reporting

### Dashboard & Visualization
- Real-time price charts
- Comparison tools for multiple assets
- Volume analysis
- Heatmap market overview
- Customizable watchlists

## API Endpoints

### Market Data
- `/prices` - Get latest prices for all tracked symbols
- `/price/:symbol` - Get latest price for a specific symbol
- `/history/:symbol` - Get historical price data
- `/ohlc/:symbol` - Get OHLC data for charting

### Analytics
- `/predict/:symbol` - Get price predictions for a symbol
- `/predict/:symbol/accuracy` - Get prediction accuracy metrics
- `/indicators/:symbol` - Get technical indicators for a symbol
- `/indicators/:symbol/:indicator` - Get specific indicator values

### Backtesting
- `/backtest/strategies` - Get available backtesting strategies
- `/backtest/:symbol` - Run backtesting for a symbol

### Alerts
- `/alerts` - Get all configured alerts
- `/alerts/price` - Add price threshold alert
- `/alerts/indicator` - Add indicator-based alert

### Dashboard Features
- `/watchlists` - Manage custom watchlists
- `/market/overview` - Get market overview data
- `/volume/:symbol` - Get trading volume data
- `/compare` - Compare multiple symbols

## Project Structure

```
quantflow/
├── src/
│   ├── core/                 # Core components (WebSocket client, alert system)
│   ├── storage/              # Storage implementations (TimescaleDB, Memory)
│   ├── backtesting/          # Backtesting engine and strategies
│   ├── utils/                # Utility functions (technical indicators)
│   └── strategies/           # Trading strategies
├── tests/                   # Unit tests
│   ├── core/
│   ├── storage/
│   ├── backtesting/
│   └── utils/
├── public/                  # Static files for dashboard
├── docs/                    # Documentation
├── config.json              # Configuration file
├── server.js                # Main server entry point
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose orchestration
└── package.json             # Project dependencies and scripts
```

## Quick Start

1. Install dependencies: `npm install`
2. Configure TimescaleDB connection in environment variables
3. Run the server: `npm start`

## Docker Deployment

The project includes a comprehensive Docker Compose setup that orchestrates all services:

```bash
docker-compose up -d
```

This will start:
- QuantFlow application server on port 3000
- TimescaleDB database on port 5432
- Node-RED interface on port 1880

## Node-RED Integration

QuantFlow includes enhanced Node-RED integration for workflow automation:

- Dedicated API endpoints for Node-RED consumption
- Example flows demonstrating data processing pipelines
- Real-time data access for workflow triggers
- Technical analysis ready data formats

To use the Node-RED integration:
1. Start the Node-RED integration server: `npm run nodered`
2. Import the example flow from `quantflow-nodered-example.json`
3. Configure your workflows to consume QuantFlow data

## Testing

Run unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Performance Optimizations

1. **WebSocket Client**:
   - Batch processing of price updates
   - Connection pooling
   - Exponential backoff with jitter for reconnections
   - URL rotation for improved reliability

2. **Database**:
   - Connection pooling with TimescaleDB
   - Optimized queries with proper indexing
   - Hypertable implementation for time-series data

3. **Backtesting**:
   - Transaction cost modeling
   - Walk-forward analysis
   - Multiple sophisticated strategies

## License

MIT