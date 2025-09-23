# Crypto Price Tracker

A real-time cryptocurrency price tracking system with advanced features including machine learning predictions, backtesting engine, and alerting system.

## Features

1. **Real-time Price Tracking** - Tracks prices from Binance Perpetual Futures WebSocket
2. **Machine Learning Predictions** - Simple predictive models for price forecasting
3. **Backtesting Engine** - Strategy backtesting with historical data
4. **Advanced Alerting System** - Pattern-based alerts with multiple notification channels
5. **Enhanced Dashboard** - Comparison charts, volume charts, and customizable watchlists
6. **Technical Indicators** - RSI, MACD, SMA, EMA, Bollinger Bands
7. **Persistent Storage** - TimescaleDB integration for historical data

## Technology Stack

- Node.js with Express.js
- WebSocket client for Binance integration
- TimescaleDB for persistent storage
- Chart.js for data visualization
- RESTful API design

## Setup

1. Install dependencies: `npm install`
2. Configure TimescaleDB connection in environment variables
3. Run the server: `node server.js`

## API Endpoints

- `/prices` - Get latest prices for all tracked symbols
- `/price/:symbol` - Get latest price for a specific symbol
- `/predict/:symbol` - Get price predictions for a symbol
- `/backtest/:symbol` - Run backtesting for a symbol
- `/indicators/:symbol` - Get technical indicators for a symbol
- And many more...

## License

MIT