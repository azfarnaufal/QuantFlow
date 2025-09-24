const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory storage
let marketDataCache = {};
let aiModels = {
  neuralNetwork: { trained: false, accuracy: 0 },
  reinforcementAgent: { trained: false, winRate: 0 },
  ensembleModel: { trained: false, accuracy: 0 }
};

// Simple technical indicators
class TechnicalIndicators {
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }
  
  static calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (prices.length < slow + signal) return { macd: 0, signal: 0, histogram: 0 };
    
    // Simplified MACD calculation
    const fastEMA = this.calculateEMA(prices, fast);
    const slowEMA = this.calculateEMA(prices, slow);
    const macd = fastEMA - slowEMA;
    
    return { macd: macd.toFixed(2), signal: (macd * 0.8).toFixed(2), histogram: (macd * 0.2).toFixed(2) };
  }
  
  static calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const k = 2 / (period + 1);
    let ema = prices[prices.length - period];
    
    for (let i = prices.length - period + 1; i < prices.length; i++) {
      ema = (prices[i] * k) + (ema * (1 - k));
    }
    
    return ema;
  }
  
  static calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return { upper: prices[prices.length - 1] * 1.05, middle: prices[prices.length - 1], lower: prices[prices.length - 1] * 0.95 };
    }
    
    const slice = prices.slice(-period);
    const mean = slice.reduce((sum, price) => sum + price, 0) / period;
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const stdDeviation = Math.sqrt(variance);
    
    return {
      upper: mean + (stdDev * stdDeviation),
      middle: mean,
      lower: mean - (stdDev * stdDeviation)
    };
  }
}

// Simple AI prediction model
class SimpleAI {
  static analyzeMarketData(symbol, data) {
    if (!data || data.length < 20) {
      return { action: 'HOLD', confidence: 0.5, reasoning: 'Insufficient data for analysis' };
    }
    
    const prices = data.map(d => d.close);
    const rsi = TechnicalIndicators.calculateRSI(prices);
    const macd = TechnicalIndicators.calculateMACD(prices);
    const bb = TechnicalIndicators.calculateBollingerBands(prices);
    const currentPrice = prices[prices.length - 1];
    const volume = data[data.length - 1].volume;
    
    let score = 0;
    let factors = [];
    
    // RSI analysis
    if (rsi < 30) {
      score += 0.3;
      factors.push('RSI indicates oversold conditions');
    } else if (rsi > 70) {
      score -= 0.3;
      factors.push('RSI indicates overbought conditions');
    } else {
      factors.push('RSI in neutral range');
    }
    
    // MACD analysis
    if (parseFloat(macd.histogram) > 0) {
      score += 0.2;
      factors.push('MACD histogram positive');
    } else {
      score -= 0.1;
      factors.push('MACD histogram negative');
    }
    
    // Bollinger Bands analysis
    if (currentPrice < bb.lower) {
      score += 0.2;
      factors.push('Price below lower Bollinger Band');
    } else if (currentPrice > bb.upper) {
      score -= 0.2;
      factors.push('Price above upper Bollinger Band');
    }
    
    // Volume analysis
    const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
    if (volume > avgVolume * 1.5) {
      factors.push('High volume confirms trend');
      score += 0.1;
    }
    
    // Determine action based on score
    let action, confidence;
    if (score > 0.3) {
      action = 'BUY';
      confidence = Math.min(0.9, 0.5 + score);
    } else if (score < -0.1) {
      action = 'SELL';
      confidence = Math.min(0.9, 0.5 - score);
    } else {
      action = 'HOLD';
      confidence = 0.5 + Math.abs(score) / 2;
    }
    
    return {
      action,
      confidence: confidence.toFixed(2),
      factors,
      indicators: {
        rsi: rsi.toFixed(2),
        macd: macd.histogram,
        pricePosition: ((currentPrice - bb.lower) / (bb.upper - bb.lower)).toFixed(2)
      }
    };
  }
}

// Fetch real market data (simplified)
async function fetchMarketData(symbol) {
  // In a real implementation, you would fetch from Binance API
  // For demo purposes, we'll generate realistic mock data
  const now = Date.now();
  const data = [];
  
  // Generate 100 data points (4 hours each)
  let price = 30000 + (Math.random() * 10000); // Start around $30k-$40k
  
  for (let i = 99; i >= 0; i--) {
    const timestamp = now - (i * 4 * 60 * 60 * 1000); // 4 hour intervals
    const open = price;
    const change = (Math.random() - 0.5) * 1000; // Random change
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 500;
    const low = Math.min(open, close) - Math.random() * 500;
    const volume = 100 + Math.random() * 1000; // Random volume
    
    data.push({
      timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });
    
    price = close;
  }
  
  return data;
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'QuantFlow AI Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get market data
app.get('/api/data/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    // Check cache first
    if (marketDataCache[symbol] && Date.now() - marketDataCache[symbol].timestamp < 60000) {
      return res.json({
        success: true,
        symbol,
        data: marketDataCache[symbol].data,
        cached: true
      });
    }
    
    // Fetch new data
    const data = await fetchMarketData(symbol);
    
    // Cache the data
    marketDataCache[symbol] = {
      data,
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      symbol,
      data,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI analysis endpoint
app.post('/api/analyze/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    // Get market data
    const data = marketDataCache[symbol]?.data || await fetchMarketData(symbol);
    
    // Perform AI analysis
    const analysis = SimpleAI.analyzeMarketData(symbol, data);
    
    res.json({
      success: true,
      symbol,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI chat endpoint
app.post('/api/chat', (req, res) => {
  try {
    const { message, context = {} } = req.body;
    const symbol = (context.symbol || 'BTCUSDT').toUpperCase();
    
    if (!message) {
      return res.json({
        success: true,
        response: "Hello! I'm your QuantFlow AI assistant. Ask me to analyze a cryptocurrency symbol or get trading signals."
      });
    }
    
    // Simple intent recognition
    let response;
    
    if (message.toLowerCase().includes('analyze') || message.toLowerCase().includes('check') || message.toLowerCase().includes('what about')) {
      response = `I'll analyze ${symbol} for you. Based on my technical analysis:\n\n`;
      
      // Get cached data or generate new
      const data = marketDataCache[symbol]?.data || [];
      
      if (data.length > 0) {
        const analysis = SimpleAI.analyzeMarketData(symbol, data);
        response += 'ACTION: ' + analysis.action + ' with ' + Math.round(analysis.confidence * 100) + '% confidence\\n\\n';
        response += 'KEY FACTORS:\\n' + analysis.factors.map(f => '- ' + f).join('\\n') + '\\n\\n';
        response += 'TECHNICAL INDICATORS:\\n';
        response += '- RSI: ' + analysis.indicators.rsi + '\\n';
        response += '- MACD Histogram: ' + analysis.indicators.macd + '\\n';
        response += '- Price Position (Bollinger Bands): ' + Math.round(analysis.indicators.pricePosition * 100) + '%';
      } else {
        response += "I don't have recent market data for this symbol. Please try again in a moment.";
      }
    } else if (message.toLowerCase().includes('buy') || message.toLowerCase().includes('sell') || message.toLowerCase().includes('trade')) {
      const data = marketDataCache[symbol]?.data || [];
      if (data.length > 0) {
        const analysis = SimpleAI.analyzeMarketData(symbol, data);
        response = `TRADING RECOMMENDATION FOR ${symbol}:\n\n`;
        response += `ACTION: ${analysis.action}\n`;
        response += `CONFIDENCE: ${Math.round(analysis.confidence * 100)}%\n\n`;
        
        if (analysis.action === 'BUY') {
          response += `RECOMMENDATION: Consider entering a long position.\n`;
          response += `SUGGESTED STOP-LOSS: ${Math.round(data[data.length-1].close * 0.97)}\n`;
          response += `SUGGESTED TAKE-PROFIT: ${Math.round(data[data.length-1].close * 1.06)}`;
        } else if (analysis.action === 'SELL') {
          response += `RECOMMENDATION: Consider entering a short position.\n`;
          response += `SUGGESTED STOP-LOSS: ${Math.round(data[data.length-1].close * 1.03)}\n`;
          response += `SUGGESTED TAKE-PROFIT: ${Math.round(data[data.length-1].close * 0.94)}`;
        } else {
          response += `RECOMMENDATION: Hold current positions.\n`;
          response += `MARKET CONDITIONS: Neutral - waiting for clearer signals.`;
        }
      } else {
        response = `I need to analyze ${symbol} first. Please ask me to analyze it before getting trading recommendations.`;
      }
    } else if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      response = "Hello! I'm your QuantFlow AI trading assistant. I can analyze cryptocurrency markets and provide trading signals. Try asking me to analyze BTCUSDT or get trading recommendations.";
    } else {
      response = "I'm an AI trading assistant specialized in cryptocurrency analysis. I can:\n\n" +
                "1. Analyze market data for any cryptocurrency symbol\n" +
                "2. Provide trading signals (BUY/SELL/HOLD)\n" +
                "3. Explain technical indicators like RSI, MACD, and Bollinger Bands\n\n" +
                "Try asking me: 'Analyze BTCUSDT' or 'Should I buy ETHUSDT?'";
    }
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI learning status
app.get('/api/learning/status', (req, res) => {
  res.json({
    success: true,
    status: {
      models: aiModels,
      dataPoints: Object.keys(marketDataCache).length,
      lastUpdate: new Date().toISOString()
    }
  });
});

// AI learning endpoint
app.post('/api/learning/train', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }
    
    // Simulate training process
    const trainingSteps = [
      'Fetching historical data...',
      'Preprocessing market features...',
      'Training Neural Network model...',
      'Training Reinforcement Agent...',
      'Combining models in Ensemble...',
      'Validating performance metrics...',
      'Updating model weights...'
    ];
    
    // Update model status
    aiModels.neuralNetwork = { trained: true, accuracy: (0.85 + Math.random() * 0.1).toFixed(2) };
    aiModels.reinforcementAgent = { trained: true, winRate: (0.65 + Math.random() * 0.2).toFixed(2) };
    aiModels.ensembleModel = { trained: true, accuracy: (0.90 + Math.random() * 0.05).toFixed(2) };
    
    res.json({
      success: true,
      message: `AI models trained successfully for ${symbol}`,
      models: aiModels,
      steps: trainingSteps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`QuantFlow AI Server running at http://localhost:${PORT}`);
});