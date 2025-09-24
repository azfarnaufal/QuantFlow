# Project Structure

```
crypto-price-tracker/
├── README.md                        # Main project documentation
├── package.json                     # Node.js project configuration and dependencies
├── package-lock.json                # Locked dependency versions
├── config.json                      # Configuration file for symbols, ports, intervals, etc.
├── docker-compose.yml               # Main Docker Compose configuration
├── docker-compose.staging.yml       # Staging environment Docker Compose configuration
├── docker-compose.microservices.yml # Microservices Docker Compose configuration
├── .gitignore                       # Files and directories to ignore in version control
├── .dockerignore                    # Files and directories to ignore in Docker builds
├── server.js                        # Main REST API server
├── src/                             # Core source code
│   ├── core/                        # Core components (WebSocket client, storage)
│   ├── strategies/                  # Trading strategies
│   │   └── advanced-ml/             # Advanced ML strategies (LSTM, Transformer, etc.)
│   ├── backtesting/                 # Backtesting engine
│   ├── storage/                     # Data storage implementations
│   ├── utils/                       # Utility functions
│   └── config/                      # Configuration files
├── services/                        # Microservices
│   ├── ai-agent/                    # AI agent service
│   ├── ai-engine/                   # AI engine with neural networks and ML models
│   ├── analysis/                    # Technical analysis service
│   ├── api-gateway/                 # API gateway
│   ├── binance-futures/             # Binance futures service
│   ├── data-ingestion/              # Data ingestion service
│   ├── event-bus/                   # Event bus (Kafka client)
│   ├── llm/                         # LLM service
│   ├── storage/                     # Storage service
│   ├── trading/                     # Trading service
│   └── orchestrator/                # Service orchestrator
├── public/                          # Web dashboard files
├── docs/                            # Documentation
├── examples/                        # Example implementations
├── scripts/                         # Utility scripts
├── tests/                           # Unit and integration tests
├── tools/                           # Development tools
└── kubernetes/                      # Kubernetes deployment files
```

## Key Components

### Core Functionality
- **server.js**: Main REST API server that exposes price data and coordinates services
- **src/core/**: Core components including WebSocket client and storage implementations
- **src/strategies/**: Trading strategies including advanced ML strategies
- **src/backtesting/**: Backtesting engine for strategy evaluation

### Microservices
- **services/binance-futures/**: Binance futures service with AI capabilities
- **services/ai-engine/**: AI engine with custom neural networks, reinforcement learning, and ensemble models
- **services/analysis/**: Technical analysis service with comprehensive indicators
- **services/data-ingestion/**: Data ingestion service for real-time market data
- **services/storage/**: Storage service for persistent data management
- **services/trading/**: Trading service for order execution
- **services/ai-agent/**: AI agent service for intelligent trading decisions
- **services/llm/**: LLM service for natural language processing
- **services/event-bus/**: Event bus for service communication
- **services/api-gateway/**: API gateway for unified service access

### Configuration
- **config.json**: Centralized configuration for easy customization
- **src/config/**: Additional configuration files
- **docker-compose.yml**: Docker Compose configuration for containerized deployment

### Web Interface
- **public/**: Web dashboard files with real-time charts and interactive features

### Documentation
- **docs/**: Comprehensive documentation including architecture, guides, and reports
- **README.md**: Main project documentation

### Testing
- **tests/**: Unit and integration tests for all components

### Deployment
- **docker-compose.yml**: Docker Compose configuration for easy deployment
- **kubernetes/**: Kubernetes deployment files for production environments
- **scripts/**: Utility scripts for deployment and management

This structure supports a scalable microservices architecture with clean separation of concerns, making it easy to extend and maintain the platform.