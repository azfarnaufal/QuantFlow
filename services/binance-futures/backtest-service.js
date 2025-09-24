const AIEngine = require('../ai-engine/ai-engine');
const TechnicalIndicators = require('../analysis/technical-indicators');

class BacktestService {
  constructor() {
    this.aiEngine = new AIEngine();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.aiEngine.initialize();
      this.initialized = true;
      console.log('Backtest Service initialized');
    }
  }

  // Run backtest on historical data with enhanced technical indicators
  async runBacktest(historicalData, initialCapital = 10000, config = {}) {
    await this.initialize();
    
    // Configuration
    const {
      commission = 0.001, // 0.1% commission
      slippage = 0.0005,  // 0.05% slippage
      riskPercent = 0.02, // 2% risk per trade
      enableShort = true,
      confidenceThreshold = 0.55, // Minimum confidence to take trades
      useTechnicalIndicators = true // Enable technical indicators
    } = config;
    
    // Calculate technical indicators if enabled
    let enhancedHistoricalData = historicalData;
    if (useTechnicalIndicators && historicalData.length > 20) {
      console.log('Calculating technical indicators...');
      const indicators = TechnicalIndicators.calculateAllIndicators(historicalData);
      
      enhancedHistoricalData = historicalData.map((dataPoint, index) => {
        const indicatorData = indicators[index] || {};
        return {
          ...dataPoint,
          indicators: indicatorData,
          rsi: indicatorData.rsi || dataPoint.rsi || 50,
          macd: (indicatorData.macd ? indicatorData.macd.macd : null) || dataPoint.macd || 0,
          bollingerUpper: indicatorData.bollingerBands ? indicatorData.bollingerBands.upper : null,
          bollingerMiddle: indicatorData.bollingerBands ? indicatorData.bollingerBands.middle : null,
          bollingerLower: indicatorData.bollingerBands ? indicatorData.bollingerBands.lower : null,
          sma20: indicatorData.sma20 || null,
          ema12: indicatorData.ema12 || null,
          atr: indicatorData.atr || null,
          stochastic: indicatorData.stochastic || null
        };
      });
    }
    
    // Trading state
    let capital = initialCapital;
    let position = null; // {symbol, side, entryPrice, size}
    let trades = [];
    let equityCurve = [capital];
    let peakEquity = capital;
    let maxDrawdown = 0;
    
    console.log(`Starting backtest with ${enhancedHistoricalData.length} data points`);
    
    // Process each data point
    for (let i = 0; i < enhancedHistoricalData.length; i++) {
      const dataPoint = enhancedHistoricalData[i];
      const timestamp = dataPoint.timestamp || Date.now();
      
      // Extract market data for AI engine with technical indicators
      const marketData = {
        price: dataPoint.close,
        open: dataPoint.open,
        high: dataPoint.high,
        low: dataPoint.low,
        volume: dataPoint.volume,
        changePercent: ((dataPoint.close - dataPoint.open) / dataPoint.open) * 100,
        // Technical indicators
        rsi: dataPoint.rsi || 50,
        macd: dataPoint.macd || 0,
        vwap: dataPoint.vwap || dataPoint.close,
        bidPrice: dataPoint.close,
        askPrice: dataPoint.close,
        spread: 0,
        sentiment: 0,
        // Additional indicators
        bollingerUpper: dataPoint.bollingerUpper || null,
        bollingerMiddle: dataPoint.bollingerMiddle || null,
        bollingerLower: dataPoint.bollingerLower || null,
        sma20: dataPoint.sma20 || null,
        ema12: dataPoint.ema12 || null,
        atr: dataPoint.atr || null,
        stochastic: dataPoint.stochastic || null
      };
      
      // Get AI prediction
      const prediction = await this.aiEngine.predict(marketData);
      
      // Only trade if confidence is above threshold
      if (prediction.confidence >= confidenceThreshold) {
        // Risk management with ATR-based position sizing if available
        let positionSize;
        if (dataPoint.atr && dataPoint.atr > 0) {
          // ATR-based position sizing
          const atrPercent = (dataPoint.atr / dataPoint.close) * 100;
          const riskPerTrade = capital * riskPercent;
          positionSize = riskPerTrade / (atrPercent * dataPoint.close * commission);
        } else {
          // Fixed position sizing
          const riskAmount = capital * riskPercent;
          positionSize = riskAmount / (dataPoint.close * commission);
        }
        
        // Ensure position size is reasonable
        positionSize = Math.max(0.001, Math.min(positionSize, capital / dataPoint.close));
        
        // Execute trading logic
        if (position === null) {
          // No position, consider entering
          if (prediction.action === 'LONG') {
            // Enter long position
            position = {
              side: 'LONG',
              entryPrice: dataPoint.close * (1 + slippage),
              size: positionSize,
              timestamp: timestamp
            };
            
            capital -= position.size * position.entryPrice * (1 + commission);
            
            trades.push({
              type: 'ENTRY',
              side: 'LONG',
              price: position.entryPrice,
              size: position.size,
              timestamp: timestamp,
              capitalBefore: capital + position.size * position.entryPrice * (1 + commission),
              confidence: prediction.confidence
            });
          } else if (prediction.action === 'SHORT' && enableShort) {
            // Enter short position
            position = {
              side: 'SHORT',
              entryPrice: dataPoint.close * (1 - slippage),
              size: positionSize,
              timestamp: timestamp
            };
            
            // For short positions, we don't immediately spend capital
            // But we track the potential liability
            
            trades.push({
              type: 'ENTRY',
              side: 'SHORT',
              price: position.entryPrice,
              size: position.size,
              timestamp: timestamp,
              capitalBefore: capital,
              confidence: prediction.confidence
            });
          }
        } else {
          // Have position, consider exit or reversal
          let shouldExit = false;
          
          if (position.side === 'LONG' && prediction.action !== 'LONG') {
            shouldExit = true;
          } else if (position.side === 'SHORT' && prediction.action !== 'SHORT') {
            shouldExit = true;
          }
          
          // Additional exit conditions based on technical indicators
          if (useTechnicalIndicators) {
            // RSI overbought/oversold exit
            if (position.side === 'LONG' && dataPoint.rsi && dataPoint.rsi > 70) {
              shouldExit = true;
            } else if (position.side === 'SHORT' && dataPoint.rsi && dataPoint.rsi < 30) {
              shouldExit = true;
            }
            
            // Bollinger Band exit
            if (position.side === 'LONG' && dataPoint.bollingerUpper && dataPoint.close > dataPoint.bollingerUpper) {
              shouldExit = true;
            } else if (position.side === 'SHORT' && dataPoint.bollingerLower && dataPoint.close < dataPoint.bollingerLower) {
              shouldExit = true;
            }
          }
          
          if (shouldExit) {
            // Exit position
            const exitPrice = position.side === 'LONG' ? 
              dataPoint.close * (1 - slippage) : 
              dataPoint.close * (1 + slippage);
              
            const pnl = position.side === 'LONG' ? 
              (exitPrice - position.entryPrice) * position.size :
              (position.entryPrice - exitPrice) * position.size;
              
            capital += position.size * exitPrice * (1 - commission);
            capital += pnl; // Add PnL for short positions
            
            trades.push({
              type: 'EXIT',
              side: position.side,
              price: exitPrice,
              size: position.size,
              pnl: pnl,
              timestamp: timestamp,
              capitalAfter: capital,
              confidence: prediction.confidence
            });
            
            position = null;
          }
        }
      }
      
      // Calculate current equity
      let currentEquity = capital;
      if (position !== null) {
        // Add unrealized PnL
        const currentPrice = dataPoint.close;
        const unrealizedPnl = position.side === 'LONG' ? 
          (currentPrice - position.entryPrice) * position.size :
          (position.entryPrice - currentPrice) * position.size;
        currentEquity += unrealizedPnl;
      }
      
      equityCurve.push(currentEquity);
      
      // Update peak equity and drawdown
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      
      const drawdown = (peakEquity - currentEquity) / peakEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    // Close any open position at the end
    if (position !== null) {
      const finalDataPoint = enhancedHistoricalData[enhancedHistoricalData.length - 1];
      const exitPrice = position.side === 'LONG' ? 
        finalDataPoint.close * (1 - slippage) : 
        finalDataPoint.close * (1 + slippage);
        
      const pnl = position.side === 'LONG' ? 
        (exitPrice - position.entryPrice) * position.size :
        (position.entryPrice - exitPrice) * position.size;
        
      capital += position.size * exitPrice * (1 - commission);
      capital += pnl;
      
      trades.push({
        type: 'EXIT',
        side: position.side,
        price: exitPrice,
        size: position.size,
        pnl: pnl,
        timestamp: finalDataPoint.timestamp || Date.now(),
        capitalAfter: capital
      });
      
      position = null;
    }
    
    // Calculate performance metrics
    const totalReturn = (capital - initialCapital) / initialCapital;
    const numTrades = trades.filter(t => t.type === 'EXIT').length;
    const winTrades = trades.filter(t => t.type === 'EXIT' && t.pnl > 0).length;
    const winRate = numTrades > 0 ? winTrades / numTrades : 0;
    
    // Calculate Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }
    
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdDev = returns.length > 0 ? Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    ) : 0;
    
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    
    // Calculate additional metrics
    const profitFactor = this.calculateProfitFactor(trades);
    const maxConsecutiveWins = this.calculateMaxConsecutiveWins(trades);
    const maxConsecutiveLosses = this.calculateMaxConsecutiveLosses(trades);
    
    return {
      initialCapital,
      finalCapital: capital,
      totalReturn,
      numTrades,
      winRate,
      maxDrawdown,
      sharpeRatio,
      profitFactor,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      trades,
      equityCurve,
      performanceMetrics: {
        totalReturn: (totalReturn * 100).toFixed(2) + '%',
        winRate: (winRate * 100).toFixed(2) + '%',
        maxDrawdown: (maxDrawdown * 100).toFixed(2) + '%',
        sharpeRatio: sharpeRatio.toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        maxConsecutiveWins: maxConsecutiveWins,
        maxConsecutiveLosses: maxConsecutiveLosses
      }
    };
  }
  
  // Calculate profit factor
  calculateProfitFactor(trades) {
    const winningTrades = trades.filter(t => t.type === 'EXIT' && t.pnl > 0);
    const losingTrades = trades.filter(t => t.type === 'EXIT' && t.pnl < 0);
    
    const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    
    return grossLoss > 0 ? grossProfit / grossLoss : Infinity;
  }
  
  // Calculate max consecutive wins
  calculateMaxConsecutiveWins(trades) {
    let maxWins = 0;
    let currentWins = 0;
    
    for (const trade of trades) {
      if (trade.type === 'EXIT') {
        if (trade.pnl > 0) {
          currentWins++;
          maxWins = Math.max(maxWins, currentWins);
        } else {
          currentWins = 0;
        }
      }
    }
    
    return maxWins;
  }
  
  // Calculate max consecutive losses
  calculateMaxConsecutiveLosses(trades) {
    let maxLosses = 0;
    let currentLosses = 0;
    
    for (const trade of trades) {
      if (trade.type === 'EXIT') {
        if (trade.pnl < 0) {
          currentLosses++;
          maxLosses = Math.max(maxLosses, currentLosses);
        } else {
          currentLosses = 0;
        }
      }
    }
    
    return maxLosses;
  }
  
  // Generate synthetic historical data for testing with more trends and indicators
  generateSyntheticData(symbol, numPoints = 1000) {
    const data = [];
    let price = 30000 + Math.random() * 10000; // Start around $30,000-$40,000
    
    // Create some trends to make the data more realistic
    let trend = 0; // Current trend direction
    let trendStrength = 0; // How strong the trend is
    
    // Generate base price data
    const prices = [];
    const volumes = [];
    
    for (let i = 0; i < numPoints; i++) {
      // Occasionally change trend
      if (Math.random() < 0.02) { // 2% chance to change trend
        trend = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5% per point
        trendStrength = Math.random() * 0.03; // 0% to 3% additional trend
      }
      
      // Apply trend and random walk
      const baseChange = trend + (Math.random() - 0.5) * 0.02; // ±1% random change
      const trendChange = trendStrength * (Math.random() - 0.5) * 2; // Trend component
      const totalChange = baseChange + trendChange;
      
      const newPrice = price * (1 + totalChange);
      
      // Ensure price doesn't go negative
      price = Math.max(newPrice, 1000);
      prices.push(price);
      
      // Generate volume data
      const volume = Math.random() * 100 + 50; // Minimum volume of 50
      volumes.push(volume);
      
      price = price; // Next iteration starts from current price
    }
    
    // Calculate technical indicators for the synthetic data
    for (let i = 0; i < numPoints; i++) {
      const open = prices[i];
      const change = (Math.random() - 0.5) * 0.01; // ±0.5% change for high/low
      const high = open * (1 + Math.abs(change));
      const low = open * (1 - Math.abs(change));
      const close = low + Math.random() * (high - low); // Close between high and low
      
      // Calculate some basic indicators for this point
      const rsi = i > 14 ? TechnicalIndicators.calculateRSI(prices.slice(0, i + 1), 14) : 50;
      const macdData = i > 26 ? TechnicalIndicators.calculateMACD(prices.slice(0, i + 1)) : { macd: 0, signal: 0, histogram: 0 };
      const bb = i > 20 ? TechnicalIndicators.calculateBollingerBands(prices.slice(0, i + 1)) : 
                 { upper: close * 1.02, middle: close, lower: close * 0.98 };
      
      data.push({
        timestamp: Date.now() - (numPoints - i) * 60000, // 1 minute intervals
        symbol: symbol,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volumes[i],
        rsi: rsi || 50,
        macd: macdData ? macdData.macd : 0,
        bollingerUpper: bb ? bb.upper : close * 1.02,
        bollingerMiddle: bb ? bb.middle : close,
        bollingerLower: bb ? bb.lower : close * 0.98,
        vwap: (open + high + low + close) / 4,
        sma20: i > 20 ? TechnicalIndicators.calculateSMA(prices.slice(0, i + 1), 20) : close,
        ema12: i > 12 ? TechnicalIndicators.calculateEMA(prices.slice(0, i + 1), 12) : close,
        atr: i > 14 ? TechnicalIndicators.calculateATR(
          data.slice(Math.max(0, i - 14)).map(d => d.high),
          data.slice(Math.max(0, i - 14)).map(d => d.low),
          data.slice(Math.max(0, i - 14)).map(d => d.close),
          14
        ) : (high - low) * 0.5
      });
    }
    
    return data;
  }
}

module.exports = BacktestService;