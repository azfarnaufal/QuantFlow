# QuantFlow - Advanced Quantitative Trading Platform

[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-supported-blue.svg)](https://www.docker.com/)

QuantFlow is a comprehensive quantitative trading platform that provides real-time market data ingestion, advanced technical analysis, machine learning-based strategy development, and sophisticated backtesting capabilities for cryptocurrency trading.

## Features

### Real-Time Market Data
- **Binance WebSocket Integration**: Connects to Binance Futures WebSocket API for real-time price updates
- **Multi-Symbol Tracking**: Simultaneously tracks multiple cryptocurrency pairs
- **High-Performance Ingestion**: Optimized WebSocket client with batch processing and automatic reconnection

### Data Storage & Performance
- **TimescaleDB Integration**: Persistent storage with time-series optimized database
- **Redis Caching**: In-memory caching for frequently accessed data
- **Database Connection Pooling**: Efficient database connection management
- **Rate Limiting**: API rate limiting to prevent abuse

### Technical Analysis
- **Real-Time Indicators**: Calculate technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands)
- **OHLC Data**: Time-based aggregation for charting
- **Historical Data Import**: Import historical price data for backtesting

### Machine Learning & AI
- **ML-Based Strategies**: Machine learning strategies for price prediction
- **Portfolio Strategies**: Multi-asset portfolio backtesting
- **Strategy Optimization**: Parameter optimization using historical data

### Backtesting Engine
- **Multiple Strategies**: Support for various trading strategies
- **Performance Metrics**: Comprehensive performance analysis (Sharpe ratio, max drawdown, etc.)
- **Transaction Cost Modeling**: Realistic backtesting with transaction costs

### Visualization & Monitoring
- **Data Visualization Endpoints**: OHLC data for charting
- **Swagger API Documentation**: Interactive API documentation
- **Health Checks**: Comprehensive service health monitoring
- **Prometheus & Grafana**: Monitoring and alerting

### Alerting System
- **Multi-Channel Notifications**: Telegram, Discord, and Email notifications
- **Custom Alert Conditions**: Flexible alert rule configuration
- **Pattern-Based Alerts**: Alerts based on technical indicator patterns

### Containerization & Deployment
- **Docker Support**: Containerized deployment with Docker Compose
- **Kubernetes Deployment**: Production-ready Kubernetes configurations
- **Automated Backups**: Scheduled database backups
- **Microservices Architecture**: Scalable microservices design

## Architecture

QuantFlow follows a microservices architecture with the following components:

1. **Price Ingestion Service**: Handles real-time data from Binance WebSocket
2. **Storage Service**: Manages data persistence in TimescaleDB with Redis caching
3. **Backtesting Service**: Executes trading strategy backtests and optimizations
4. **Alerting Service**: Monitors market conditions and sends notifications
5. **API Gateway**: Provides unified access to all services

## Getting Started

### Prerequisites
- Node.js >= 14.0.0
- Docker and Docker Compose (optional but recommended)
- PostgreSQL/TimescaleDB
- Redis

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/quantflow.git
cd quantflow
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the application:
```bash
npm start
```

### Docker Deployment

1. Build and start services:
```bash
docker-compose up -d
```

2. Access the application at `http://localhost:3000`

### Kubernetes Deployment

1. Apply Kubernetes configurations:
```bash
kubectl apply -f kubernetes/
```

## API Documentation

QuantFlow provides comprehensive API documentation through Swagger UI. Access it at:
```
http://localhost:3000/api-docs
```

### Key Endpoints

- `GET /prices` - Get latest prices for all tracked symbols
- `GET /price/{symbol}` - Get latest price for a specific symbol
- `GET /history/{symbol}` - Get price history for a symbol
- `GET /indicators/{symbol}` - Get technical indicators for a symbol
- `GET /chart/ohlc/{symbol}` - Get OHLC data for charting
- `GET /backtest/strategies` - Get available backtesting strategies
- `POST /backtest/run` - Run a backtest
- `POST /backtest/optimize` - Optimize strategy parameters
- `POST /data/import` - Import historical price data

## Configuration

The application can be configured through:
1. Environment variables
2. Configuration files in `src/config/`
3. Command-line arguments

Key configuration options include:
- Binance WebSocket URL
- Database connection settings
- Redis connection settings
- Symbols to track
- Rate limiting parameters

## Development

### Project Structure
```
quantflow/
├── src/
│   ├── core/          # Core components (WebSocket client, storage)
│   ├── strategies/    # Trading strategies
│   ├── backtesting/   # Backtesting engine
│   ├── storage/       # Data storage implementations
│   ├── utils/         # Utility functions
│   └── config/        # Configuration files
├── docs/              # Documentation
├── examples/          # Example implementations
├── tests/             # Unit and integration tests
└── kubernetes/        # Kubernetes deployment files
```

### Running Tests

```bash
npm test
```

### Code Quality

```bash
npm run lint
```

## Monitoring & Observability

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health information

### Metrics
- Prometheus metrics endpoint at `/metrics`
- Grafana dashboards for visualization

### Logging
- Structured logging with log levels
- Log aggregation support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Binance for providing the WebSocket API
- TimescaleDB for time-series database capabilities
- Redis for caching solutions
- The open-source community for various libraries and tools