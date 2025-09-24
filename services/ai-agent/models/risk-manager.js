// Advanced Risk Management System
class RiskManager {
  constructor() {
    // Risk parameters
    this.maxPositionSize = 0.1; // 10% of portfolio
    this.maxDrawdown = 0.2; // 20% maximum drawdown
    this.stopLossPercent = 0.05; // 5% stop loss
    this.takeProfitPercent = 0.1; // 10% take profit
    this.volatilityThreshold = 0.03; // 3% volatility threshold
    this.correlationThreshold = 0.8; // 80% correlation threshold
    
    // Portfolio tracking
    this.portfolioValue = 10000; // Initial portfolio value
    this.positions = new Map(); // Symbol -> position details
    this.tradeHistory = []; // Trade history
    this.drawdownHistory = []; // Drawdown history
    
    console.log('Risk Manager initialized');
  }

  // Calculate position size based on risk
  calculatePositionSize(symbol, price, volatility, accountRisk = 0.02) {
    // Base position size
    let positionSize = (this.portfolioValue * accountRisk) / (price * this.stopLossPercent);
    
    // Adjust for volatility
    if (volatility > this.volatilityThreshold) {
      positionSize *= (this.volatilityThreshold / volatility); // Reduce position size for high volatility
    }
    
    // Ensure position size doesn't exceed maximum
    const maxPositionValue = this.portfolioValue * this.maxPositionSize;
    const maxShares = maxPositionValue / price;
    positionSize = Math.min(positionSize, maxShares);
    
    return positionSize;
  }

  // Check if trade is within risk limits
  canTakePosition(symbol, action, price, quantity) {
    // Check maximum position size
    const positionValue = price * quantity;
    const maxPositionValue = this.portfolioValue * this.maxPositionSize;
    
    if (positionValue > maxPositionValue) {
      return {
        allowed: false,
        reason: `Position size (${positionValue.toFixed(2)}) exceeds maximum allowed (${maxPositionValue.toFixed(2)})`
      };
    }
    
    // Check portfolio drawdown
    const currentDrawdown = this.calculateCurrentDrawdown();
    if (currentDrawdown > this.maxDrawdown) {
      return {
        allowed: false,
        reason: `Current drawdown (${(currentDrawdown * 100).toFixed(2)}%) exceeds maximum allowed (${this.maxDrawdown * 100}%)`
      };
    }
    
    // Check correlation with existing positions
    const correlationRisk = this.checkCorrelationRisk(symbol);
    if (correlationRisk > this.correlationThreshold) {
      return {
        allowed: false,
        reason: `Correlation risk (${(correlationRisk * 100).toFixed(2)}%) exceeds threshold (${this.correlationThreshold * 100}%)`
      };
    }
    
    return { allowed: true, reason: 'Trade within risk limits' };
  }

  // Calculate current drawdown
  calculateCurrentDrawdown() {
    if (this.tradeHistory.length === 0) return 0;
    
    const peak = Math.max(...this.tradeHistory.map(t => t.portfolioValue));
    const current = this.portfolioValue;
    
    return (peak - current) / peak;
  }

  // Check correlation risk with existing positions
  checkCorrelationRisk(symbol) {
    // Simplified correlation check - in a real system this would use historical data
    if (this.positions.size === 0) return 0;
    
    // For similar assets (e.g., BTC/ETH), assume high correlation
    const similarAssets = ['BTC', 'ETH', 'LTC', 'BCH']; // Simplified
    const symbolBase = symbol.substring(0, 3);
    
    let correlatedPositions = 0;
    for (const [posSymbol] of this.positions) {
      const posBase = posSymbol.substring(0, 3);
      if (similarAssets.includes(symbolBase) && similarAssets.includes(posBase)) {
        correlatedPositions++;
      }
    }
    
    return correlatedPositions / this.positions.size;
  }

  // Update position
  updatePosition(symbol, action, price, quantity, timestamp) {
    const positionValue = price * quantity;
    
    if (action === 'BUY') {
      // Add to existing position or create new one
      if (this.positions.has(symbol)) {
        const existing = this.positions.get(symbol);
        const totalQuantity = existing.quantity + quantity;
        const avgPrice = (existing.quantity * existing.avgPrice + quantity * price) / totalQuantity;
        
        this.positions.set(symbol, {
          quantity: totalQuantity,
          avgPrice,
          currentValue: totalQuantity * price,
          stopLoss: avgPrice * (1 - this.stopLossPercent),
          takeProfit: avgPrice * (1 + this.takeProfitPercent)
        });
      } else {
        this.positions.set(symbol, {
          quantity,
          avgPrice: price,
          currentValue: positionValue,
          stopLoss: price * (1 - this.stopLossPercent),
          takeProfit: price * (1 + this.takeProfitPercent)
        });
      }
    } else if (action === 'SELL') {
      // Reduce or close position
      if (this.positions.has(symbol)) {
        const existing = this.positions.get(symbol);
        const newQuantity = existing.quantity - quantity;
        
        if (newQuantity <= 0) {
          // Close position
          this.positions.delete(symbol);
        } else {
          // Reduce position
          this.positions.set(symbol, {
            ...existing,
            quantity: newQuantity,
            currentValue: newQuantity * price
          });
        }
      }
    }
    
    // Update portfolio value
    this.updatePortfolioValue();
  }

  // Update portfolio value based on current positions
  updatePortfolioValue() {
    let totalValue = this.portfolioValue;
    
    // Add unrealized P&L from positions
    for (const [symbol, position] of this.positions) {
      // In a real system, we would get current price from market data
      // For now, we'll assume price hasn't changed
      const unrealizedPnL = (position.avgPrice - position.avgPrice) * position.quantity;
      totalValue += unrealizedPnL;
    }
    
    this.portfolioValue = totalValue;
  }

  // Check for stop loss or take profit triggers
  checkTriggers(currentPrices) {
    const triggers = [];
    
    for (const [symbol, position] of this.positions) {
      const currentPrice = currentPrices[symbol] || position.avgPrice;
      
      if (currentPrice <= position.stopLoss) {
        triggers.push({
          symbol,
          action: 'SELL',
          reason: 'Stop Loss',
          price: currentPrice,
          expectedPnL: (currentPrice - position.avgPrice) * position.quantity
        });
      } else if (currentPrice >= position.takeProfit) {
        triggers.push({
          symbol,
          action: 'SELL',
          reason: 'Take Profit',
          price: currentPrice,
          expectedPnL: (currentPrice - position.avgPrice) * position.quantity
        });
      }
    }
    
    return triggers;
  }

  // Record trade
  recordTrade(trade) {
    this.tradeHistory.push({
      ...trade,
      portfolioValue: this.portfolioValue,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 trades
    if (this.tradeHistory.length > 1000) {
      this.tradeHistory.shift();
    }
  }

  // Get risk metrics
  getRiskMetrics() {
    return {
      portfolioValue: this.portfolioValue,
      positions: this.positions.size,
      currentDrawdown: this.calculateCurrentDrawdown(),
      maxPositionSize: this.maxPositionSize,
      stopLossPercent: this.stopLossPercent,
      takeProfitPercent: this.takeProfitPercent
    };
  }

  // Adjust risk parameters based on market conditions
  adjustRiskParameters(marketVolatility, marketTrend) {
    // Increase stop loss and decrease position size during high volatility
    if (marketVolatility > this.volatilityThreshold) {
      this.stopLossPercent = Math.min(0.1, this.stopLossPercent * 1.5);
      this.maxPositionSize = Math.max(0.05, this.maxPositionSize * 0.8);
    } else {
      // Reset to defaults during normal volatility
      this.stopLossPercent = 0.05;
      this.maxPositionSize = 0.1;
    }
    
    // Adjust take profit based on trend
    if (marketTrend > 0.02) {
      // Strong uptrend - increase take profit
      this.takeProfitPercent = 0.15;
    } else if (marketTrend < -0.02) {
      // Strong downtrend - decrease take profit
      this.takeProfitPercent = 0.08;
    } else {
      // Sideways market - use default
      this.takeProfitPercent = 0.1;
    }
  }
}

module.exports = RiskManager;