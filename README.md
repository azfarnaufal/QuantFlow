# QuantFlow - Real-time Financial Analytics Platform

A comprehensive financial market analytics platform with real-time data ingestion, machine learning predictions, backtesting engine, and automated alerting system.

## Project Evolution

Originally started as a simple crypto price tracker, QuantFlow has evolved into a sophisticated quantitative trading platform that integrates multiple technologies for comprehensive market analysis and automated trading workflows.

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
- Node-RED for workflow automation and data transformation
- RESTful API architecture
- Docker containerization with Docker Compose orchestration

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
1. Start the Node-RED integration server: `node nodered-integration.js`
2. Import the example flow from `quantflow-nodered-example.json`
3. Configure your workflows to consume QuantFlow data

## License

MIT