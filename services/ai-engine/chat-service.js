const AIEngine = require('./ai-engine');
const LearningService = require('./learning-service');

class ChatService {
  constructor() {
    this.aiEngine = new AIEngine();
    this.learningService = new LearningService();
    this.conversationHistory = [];
  }

  async initialize() {
    await this.aiEngine.initialize();
    await this.learningService.initialize();
    console.log('Chat Service initialized');
  }

  // Process user message and generate AI response
  async processMessage(message, context = {}) {
    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    try {
      // Parse user intent
      const intent = this.parseIntent(message);
      
      let response = '';
      
      switch (intent.type) {
        case 'price_prediction':
          response = await this.handlePricePrediction(context.symbol || 'BTCUSDT');
          break;
          
        case 'market_analysis':
          response = await this.handleMarketAnalysis(context.symbol || 'BTCUSDT');
          break;
          
        case 'trading_signal':
          response = await this.handleTradingSignal(context.symbol || 'BTCUSDT');
          break;
          
        case 'learning_status':
          response = this.handleLearningStatus();
          break;
          
        case 'backtest_request':
          response = this.handleBacktestRequest(context.symbol || 'BTCUSDT');
          break;
          
        case 'general_inquiry':
        default:
          response = await this.handleGeneralInquiry(message);
          break;
      }
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
      
      this.conversationHistory.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      return errorMessage;
    }
  }

  // Parse user intent from message
  parseIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') && (lowerMessage.includes('predict') || lowerMessage.includes('forecast'))) {
      return { type: 'price_prediction' };
    }
    
    if (lowerMessage.includes('analysis') || lowerMessage.includes('market') || lowerMessage.includes('condition')) {
      return { type: 'market_analysis' };
    }
    
    if (lowerMessage.includes('buy') || lowerMessage.includes('sell') || lowerMessage.includes('signal') || lowerMessage.includes('trade')) {
      return { type: 'trading_signal' };
    }
    
    if (lowerMessage.includes('learn') || lowerMessage.includes('training') || lowerMessage.includes('status')) {
      return { type: 'learning_status' };
    }
    
    if (lowerMessage.includes('backtest') || lowerMessage.includes('simulation') || lowerMessage.includes('test')) {
      return { type: 'backtest_request' };
    }
    
    return { type: 'general_inquiry' };
  }

  // Handle price prediction requests
  async handlePricePrediction(symbol) {
    try {
      // Get prediction from AI engine
      const prediction = await this.aiEngine.predict({
        symbol: symbol,
        // In a real implementation, we would pass actual market data
        price: 0, // Placeholder
        volume: 0, // Placeholder
      });
      
      return `Based on my analysis of ${symbol}, I predict a ${prediction.action} position with ${Math.round(prediction.confidence * 100)}% confidence. This prediction is based on pattern recognition and technical indicators from my neural network and transformer models.`;
    } catch (error) {
      return "I'm currently unable to generate a price prediction. Please try again later.";
    }
  }

  // Handle market analysis requests
  async handleMarketAnalysis(symbol) {
    try {
      // In a real implementation, we would perform detailed market analysis
      return `Here's my analysis of the ${symbol} market:\n\n` +
             `• Current trend: Bullish (based on recent price action)\n` +
             `• Volatility: Moderate (24h range: 3.2%)\n` +
             `• Trading volume: Above average\n` +
             `• Support levels: $62,500, $61,800\n` +
             `• Resistance levels: $64,200, $65,000\n\n` +
             `My ensemble model suggests watching for breakout opportunities in the next 2-4 hours.`;
    } catch (error) {
      return "I'm currently unable to perform market analysis. Please try again later.";
    }
  }

  // Handle trading signal requests
  async handleTradingSignal(symbol) {
    try {
      // Get signal from AI engine
      const prediction = await this.aiEngine.predict({
        symbol: symbol,
        // In a real implementation, we would pass actual market data
        price: 0, // Placeholder
        volume: 0, // Placeholder
      });
      
      const action = prediction.action;
      const confidence = Math.round(prediction.confidence * 100);
      
      let signal = `TRADING SIGNAL for ${symbol}:\n`;
      signal += `Action: ${action}\n`;
      signal += `Confidence: ${confidence}%\n`;
      signal += `Strategy: `;
      
      if (action === 'LONG') {
        signal += `Consider entering a long position with a stop-loss at $61,500 and take-profit at $65,000.`;
      } else if (action === 'SHORT') {
        signal += `Consider entering a short position with a stop-loss at $64,500 and take-profit at $61,000.`;
      } else {
        signal += `Hold current positions. Market conditions are uncertain.`;
      }
      
      return signal;
    } catch (error) {
      return "I'm currently unable to generate a trading signal. Please try again later.";
    }
  }

  // Handle learning status requests
  handleLearningStatus() {
    const status = this.learningService.getLearningStatus();
    
    if (status.isLearning) {
      return "I'm currently learning from new market data. This process updates my models to adapt to changing market conditions.";
    } else {
      const logEntries = status.logEntries;
      const lastSession = status.lastSession;
      
      let response = `I'm not currently learning, but I have ${logEntries} previous learning sessions in my history.\n\n`;
      
      if (lastSession) {
        response += `My last learning session was for ${lastSession.symbol} and completed at ${lastSession.endTime || 'recently'}.`;
      }
      
      response += `\n\nYou can ask me about my learning process or request new training sessions.`;
      
      return response;
    }
  }

  // Handle backtest requests
  handleBacktestRequest(symbol) {
    return `I can run backtests on historical data for ${symbol}.\n\n` +
           `To perform a backtest, I would:\n` +
           `1. Fetch historical price data (up to 3+ months)\n` +
           `2. Apply trading strategies using my AI models\n` +
           `3. Calculate performance metrics (returns, drawdown, Sharpe ratio)\n` +
           `4. Provide detailed results and analysis\n\n` +
           `Would you like me to run a backtest? If so, please specify the symbol and any specific parameters.`;
  }

  // Handle general inquiries
  async handleGeneralInquiry(message) {
    // Simple rule-based responses for common questions
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! I'm your AI trading assistant. I can help you with price predictions, market analysis, trading signals, and backtesting. What would you like to know?";
    }
    
    if (lowerMessage.includes('help')) {
      return "I can help you with several things:\n\n" +
             "• Price predictions for cryptocurrencies\n" +
             "• Market analysis and trend identification\n" +
             "• Trading signals and recommendations\n" +
             "• Backtesting trading strategies\n" +
             "• Monitoring my learning process\n\n" +
             "Just ask me what you'd like to know!";
    }
    
    if (lowerMessage.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    // Default response with AI capabilities
    return "I'm an AI trading assistant specialized in cryptocurrency markets. I can analyze price data, generate trading signals, and help with backtesting strategies. " +
           "My capabilities include:\n\n" +
           "• Real-time market analysis\n" +
           "• Price predictions using neural networks and transformers\n" +
           "• Trading signal generation\n" +
           "• Historical backtesting\n" +
           "• Continuous learning from market data\n\n" +
           "Feel free to ask me about any of these capabilities!";
  }

  // Get conversation history
  getConversationHistory() {
    return this.conversationHistory;
  }

  // Clear conversation history
  clearConversationHistory() {
    this.conversationHistory = [];
  }
}

module.exports = ChatService;