# QuantFlow - Real-time Financial Analytics Platform

A comprehensive financial market analytics platform with real-time data ingestion, machine learning predictions, backtesting engine, and automated alerting system.

## Features

1. **Real-time Market Data Ingestion** - Tracks prices from Binance Perpetual Futures WebSocket
2. **Machine Learning Predictions** - Predictive models for price forecasting with accuracy metrics
3. **Strategy Backtesting Engine** - Historical data backtesting with performance metrics
4. **Advanced Alerting System** - Pattern-based alerts with multi-channel notifications (Telegram, Discord, Email)
5. **Enhanced Dashboard** - Comparison charts, volume analysis, and customizable watchlists
6. **Technical Indicators** - RSI, MACD, SMA, EMA, Bollinger Bands and more
7. **Persistent Storage** - TimescaleDB integration for historical data management
8. **Portfolio Simulation** - Virtual trading with performance tracking

## Technology Stack

- Node.js with Express.js
- WebSocket client for real-time market data
- TimescaleDB for time-series data storage
- Chart.js for data visualization
- RESTful API architecture
- Docker containerization ready

## Core Components

### Data Ingestion
- Real-time WebSocket connection to Binance Perpetual Futures
- Configurable symbol tracking
- Persistent data storage with TimescaleDB

### Analytics Engine
- Machine learning price prediction models
- Technical indicator calculations
- Custom algorithmic strategy implementation

### Backtesting Framework
- Historical data strategy testing
- Performance metrics (Sharpe ratio, max drawdown, etc.)
- Portfolio simulation capabilities

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

## Quick Start

1. Install dependencies: `npm install`
2. Configure TimescaleDB connection in environment variables
3. Run the server: `node server.js`

## Docker Deployment

```bash
docker-compose up -d
```

## License

MIT