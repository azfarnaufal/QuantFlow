const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3002;

// In-memory storage for learning sessions
let learningSessions = [];
let isLearning = false;
let currentSession = null;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// AI Demo Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'QuantFlow AI Demo Server is running',
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  
  // Simple AI responses based on keywords
  let response = '';
  
  if (!message) {
    response = "Hello! I'm your QuantFlow AI assistant. Ask me about cryptocurrency trading, market analysis, or trading signals.";
  } else if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    response = "Hello! I'm your QuantFlow AI trading assistant. I can help you with price predictions, market analysis, and trading signals. What would you like to know?";
  } else if (message.toLowerCase().includes('price') && (message.toLowerCase().includes('predict') || message.toLowerCase().includes('forecast'))) {
    response = "Based on my analysis, BTCUSDT is showing a bullish pattern with RSI at 55 and MACD histogram turning positive. I predict a LONG position with 72% confidence for the next 4 hours.";
  } else if (message.toLowerCase().includes('buy') || message.toLowerCase().includes('should i')) {
    response = "Based on current technical indicators, BTCUSDT is showing a bullish pattern. Consider entering with a stop-loss 3% below current price and take-profit at 5% above entry.";
  } else if (message.toLowerCase().includes('market') || message.toLowerCase().includes('analysis')) {
    response = "Market analysis for BTCUSDT:\n• Current trend: Bullish (based on recent price action)\n• Volatility: Moderate (24h range: 3.2%)\n• Trading volume: Above average\n• Support levels: $62,500, $61,800\n• Resistance levels: $64,200, $65,000";
  } else if (message.toLowerCase().includes('backtest')) {
    response = "Backtesting completed for the last 30 days:\n• Strategy returned 12.5% over 30 days\n• Sharpe ratio: 1.8\n• Maximum drawdown: 4.2%\n• Win rate: 65% (23 trades)";
  } else {
    // Default response
    const responses = [
      "I'm an AI trading assistant specialized in cryptocurrency markets. I can analyze price data, generate trading signals, and help with backtesting strategies.",
      "My capabilities include real-time market analysis, price predictions using neural networks, trading signal generation, and continuous learning from market data.",
      "I use ensemble models combining neural networks, reinforcement learning, and transformer models to make trading decisions with high accuracy.",
      "For risk management, I recommend position sizing based on account equity and setting stop-losses at key support/resistance levels."
    ];
    response = responses[Math.floor(Math.random() * responses.length)];
  }
  
  res.json({ 
    success: true, 
    response: response,
    timestamp: new Date().toISOString()
  });
});

// Learning status endpoint
app.get('/api/learning/status', (req, res) => {
  res.json({ 
    success: true, 
    status: {
      isLearning: isLearning,
      logEntries: learningSessions.length,
      currentSession: currentSession,
      lastSession: learningSessions.length > 0 ? learningSessions[learningSessions.length - 1] : null
    }
  });
});

// Start learning endpoint
app.post('/api/learning/train', (req, res) => {
  const { symbol, days } = req.body;
  
  // Validate input
  if (!symbol || !days) {
    return res.status(400).json({
      success: false,
      error: 'Symbol and days are required'
    });
  }
  
  // Check if already learning
  if (isLearning) {
    return res.status(409).json({
      success: false,
      error: 'Learning process already in progress'
    });
  }
  
  // Start learning process
  isLearning = true;
  
  // Create learning session
  currentSession = {
    id: learningSessions.length + 1,
    symbol: symbol,
    days: days,
    dataPoints: days * 24, // Assuming hourly data
    startTime: new Date().toISOString(),
    status: 'in_progress',
    progress: 0
  };
  
  console.log(`Starting learning process for ${symbol} over ${days} days`);
  
  // Simulate learning progress
  const progressInterval = setInterval(() => {
    if (currentSession.progress < 100) {
      currentSession.progress += 10;
    } else {
      clearInterval(progressInterval);
      
      // Complete learning process
      isLearning = false;
      currentSession.status = 'completed';
      currentSession.endTime = new Date().toISOString();
      currentSession.results = {
        neuralNetworkError: (0.0041 - (Math.random() * 0.002)).toFixed(4),
        reinforcementReward: (0.65 + (Math.random() * 0.2)).toFixed(2),
        transformerAccuracy: (84.7 + (Math.random() * 5)).toFixed(1) + '%',
        ensembleAccuracy: (88.3 + (Math.random() * 4)).toFixed(1) + '%'
      };
      
      // Add to learning sessions
      learningSessions.push({...currentSession});
      currentSession = null;
      
      console.log('Learning process completed');
    }
  }, 500);
  
  res.json({ 
    success: true, 
    message: `Learning process started for ${symbol} over ${days} days`,
    session: currentSession
  });
});

// Learning feedback endpoint
app.post('/api/learning/feedback', (req, res) => {
  const { tradeId, outcome, feedback } = req.body;
  
  // Validate input
  if (!tradeId || !outcome) {
    return res.status(400).json({
      success: false,
      error: 'Trade ID and outcome are required'
    });
  }
  
  // In a real implementation, this would incorporate feedback into the learning process
  console.log(`Received feedback for trade ${tradeId}: ${outcome} - ${feedback}`);
  
  // Store feedback
  const feedbackEntry = {
    id: Date.now(),
    tradeId,
    outcome,
    feedback,
    timestamp: new Date().toISOString()
  };
  
  res.json({ 
    success: true, 
    message: `Feedback received for trade ${tradeId}`,
    feedback: feedbackEntry
  });
});

// Get learning history
app.get('/api/learning/history', (req, res) => {
  res.json({
    success: true,
    sessions: learningSessions.slice().reverse().slice(0, 10) // Last 10 sessions
  });
});

// Backtest endpoint
app.post('/api/backtest', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      performanceMetrics: {
        totalReturn: "+12.5%",
        winRate: "65%",
        maxDrawdown: "-4.2%",
        sharpeRatio: "1.8",
        profitFactor: "2.1"
      },
      numTrades: 23
    }
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`QuantFlow AI Demo Server running at http://localhost:${port}`);
});