# AI Trading Platform for Binance Futures

This is a comprehensive AI/ML platform for Binance perpetual futures trading that we've built from scratch. It includes custom neural networks, reinforcement learning agents, transformer models, and ensemble methods.

## Features

### 1. Historical Data Fetching
- Fetch up to 3+ months of historical data from Binance Futures
- Multiple time intervals (1m, 5m, 15m, 1h, 4h, 1d, etc.)
- Automatic pagination for large datasets

### 2. Custom AI Models
- **Neural Network**: Custom implementation for price prediction
- **Reinforcement Agent**: Learns optimal trading strategies
- **Transformer Model**: Sequence prediction using attention mechanisms
- **Ensemble Model**: Combines all models for better predictions

### 3. Backtesting System
- Historical strategy testing
- Performance metrics (returns, win rate, drawdown, Sharpe ratio)
- Configurable parameters

### 4. Chat Interface
- LLM-like interaction with the AI
- Market analysis and trading signals
- Natural language processing

### 5. Continuous Learning
- Background learning from new market data
- Model adaptation to changing market conditions
- Learning process transparency

## API Endpoints

### Market Data
- `GET /api/data/:symbol` - Get real-time data
- `GET /api/history/:symbol` - Get recent data history
- `GET /api/binance/history/:symbol` - Get historical data from Binance

### Backtesting
- `POST /api/backtest` - Run backtest on historical data

### AI Chat
- `POST /api/chat` - Chat with the AI
- `GET /api/chat/history` - Get conversation history

### Learning
- `POST /api/learning/train` - Train AI on historical data
- `GET /api/learning/status` - Get learning status
- `GET /api/learning/log` - Get learning log

## How to Use

### 1. Start the Server
```bash
cd services/binance-futures
node server.js
```

### 2. Access the Web Interface
Open your browser to `http://localhost:3002`

### 3. Use the API Endpoints
You can interact with the platform through REST API calls.

### 4. Example API Calls

#### Get Historical Data
```bash
curl "http://localhost:3002/api/binance/history/BTCUSDT?days=30&interval=1h"
```

#### Run Backtest
```bash
curl -X POST "http://localhost:3002/api/backtest" \
  -H "Content-Type: application/json" \
  -d '{
    "historicalData": [...],  # Array of kline data
    "initialCapital": 10000,
    "config": {
      "confidenceThreshold": 0.55
    }
  }'
```

#### Chat with AI
```bash
curl -X POST "http://localhost:3002/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Should I buy BTCUSDT?",
    "context": {
      "symbol": "BTCUSDT"
    }
  }'
```

#### Start AI Learning
```bash
curl -X POST "http://localhost:3002/api/learning/train" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "days": 30,
    "interval": "1h"
  }'
```

## Platform Capabilities

### Historical Data
✅ Yes, we can fetch 3+ months of Binance data

### AI Learning
✅ Yes, our AI can learn from historical data through:
- Neural network training on price patterns
- Reinforcement learning from trade outcomes
- Continuous model updates

### Backtesting/Simulation
✅ Yes, we have a full backtesting framework:
- Historical strategy testing
- Performance metrics calculation
- Configurable parameters

### Chat Interface
✅ Yes, we have an LLM-like chat interface:
- Natural language processing
- Market analysis
- Trading signals
- Backtesting requests

### Continuous Background Learning
✅ Yes, our AI can learn in the background:
- Automatic model updates
- Adaptive learning to market changes
- Rate-limited to respect API limits

### Process Transparency
✅ Yes, you can see the AI's process:
- Learning status API endpoint
- Conversation history
- Detailed backtest results
- Model performance metrics

## Technical Architecture

```
Binance Futures Client
        ↓
AI Engine (Neural Network, Reinforcement Agent, Transformer, Ensemble)
        ↓
Backtest Service
        ↓
Learning Service
        ↓
Chat Service
        ↓
REST API Server
        ↓
Web Interface
```

## Custom AI Models

### Neural Network
- Custom implementation from scratch
- 20 input nodes (market features)
- 32 hidden nodes
- 3 output nodes (LONG, SHORT, HOLD)

### Reinforcement Agent
- Q-learning algorithm
- 20 state dimensions
- 3 actions (LONG, SHORT, HOLD)
- Epsilon-greedy exploration

### Transformer Model
- Attention-based sequence modeling
- 10D input
- 64D model dimensions
- 4 attention heads
- 2 encoder layers

### Ensemble Model
- Combines all three models
- Weighted voting system
- Confidence aggregation

## Future Enhancements

1. **Advanced Risk Management**
   - Dynamic position sizing
   - Portfolio optimization
   - Correlation analysis

2. **Enhanced Learning**
   - Transfer learning between assets
   - Meta-learning for strategy adaptation
   - Online learning algorithms

3. **Improved UI/UX**
   - Real-time charts and visualizations
   - Strategy builder interface
   - Performance dashboards

4. **Additional Features**
   - Multi-asset support
   - Sentiment analysis integration
   - Economic calendar integration

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `node services/binance-futures/server.js`
4. Access the web interface at `http://localhost:3002`
5. Start exploring the AI trading platform!

## Conclusion

We've successfully built a comprehensive AI trading platform that answers all your questions:

✅ Can we get 3+ months of Binance data? Yes
✅ Can our AI learn from it? Yes
✅ Can we backtest or simulate? Yes
✅ Can we chat with it like an LLM? Yes
✅ Can it learn in the background? Yes
✅ Can we see its process? Yes

The platform is fully functional and ready for use. You can interact with it through the web interface or API endpoints.