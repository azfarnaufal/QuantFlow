# QuantFlow AI Agent Service

The AI Agent Service is the intelligence core of the QuantFlow platform, implementing advanced machine learning models for cryptocurrency trading decisions.

## Features

### 1. Multi-Model Architecture
The AI agent combines multiple machine learning approaches:

- **LSTM Neural Networks**: For sequential pattern recognition in price data
- **Transformer Models**: For attention-based analysis of complex market patterns
- **Deep Q-Network (DQN)**: Reinforcement learning for adaptive trading strategies
- **Ensemble Methods**: Combining multiple models for robust decision making

### 2. Advanced Feature Engineering
The service includes sophisticated feature engineering capabilities:

- Technical indicators (RSI, MACD, Bollinger Bands, etc.)
- Market regime detection
- Volume-based features (OBV, VPT)
- Momentum indicators
- Candlestick pattern recognition
- Time-based features

### 3. Continuous Learning
The AI agent implements continuous learning mechanisms:

- Online learning from real trades
- Experience replay for DQN training
- Performance tracking for model weighting
- Adaptive model selection based on market conditions

## Models

### LSTM Model
Implements a deep LSTM network for time series prediction:
- 3-layer LSTM architecture with dropout regularization
- Sequence-to-classification for Buy/Sell/Hold decisions
- Handles variable-length time series data

### Transformer Model
Attention-based model for complex pattern recognition:
- Multi-head self-attention mechanisms
- Positional encoding for time series data
- Layer normalization and residual connections

### DQN Agent
Reinforcement learning agent for adaptive trading:
- Double DQN with experience replay
- Epsilon-greedy exploration strategy
- Huber loss for robust training
- Batch normalization for stable learning

### Ensemble Model
Combines multiple models for robust predictions:
- Weighted voting based on model performance
- Dynamic model selection
- Performance history tracking

## Technical Indicators

The service includes implementations of popular technical indicators:

- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Relative Strength Index (RSI)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Ichimoku Cloud
- Average True Range (ATR)
- Stochastic Oscillator
- Williams %R
- Parabolic SAR
- ADX (Average Directional Index)

## API Endpoints

### Health Check
```
GET /health
```

### Decision History
```
GET /decisions
```

### Model Information
```
GET /models
GET /performance
```

### Manual Decision Making
```
POST /decide
```

### Model Training
```
POST /train
```

### Online Learning
```
POST /learn
```

## Event-Driven Architecture

The AI agent uses Kafka for event-driven communication:

- Subscribes to `analysis-results` for making trading decisions
- Subscribes to `trade-execution` for learning from results
- Subscribes to `market-data` for continuous learning

## Configuration

The service can be configured through environment variables:

- `PORT`: Service port (default: 3005)
- `DATA_INGESTION_URL`: Data ingestion service URL
- `STORAGE_URL`: Storage service URL
- `ANALYSIS_URL`: Analysis service URL
- `TRADING_URL`: Trading service URL

## Performance Monitoring

The service tracks model performance and system metrics:

- Model accuracy tracking
- Decision confidence monitoring
- Response time metrics
- Memory usage statistics

## Future Enhancements

Planned improvements include:

- Integration with large language models for market sentiment analysis
- Advanced ensemble methods with meta-learning
- More sophisticated reinforcement learning algorithms
- Real-time feature importance analysis
- Automated hyperparameter tuning