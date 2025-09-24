// Ensemble Trading Strategy
// This strategy combines multiple strategies for better performance

const math = require('mathjs');

class EnsembleStrategy {
  /**
   * Ensemble Strategy Constructor
   * @param {Object} options - Strategy options
   */
  constructor(options = {}) {
    this.name = 'ensembleStrategy';
    this.description = 'Ensemble Trading Strategy';
    this.options = {
      strategies: options.strategies || [], // Array of strategy instances
      votingMethod: options.votingMethod || 'majority', // 'majority', 'weighted', 'confidence'
      weights: options.weights || [], // Weights for weighted voting
      confidenceThreshold: options.confidenceThreshold || 0.6,
      initialBalance: options.initialBalance || 10000,
      ...options
    };
    
    // Initialize portfolio tracking
    this.balance = this.options.initialBalance;
    this.shares = 0;
    this.currentPosition = 0; // 0: No position, 1: Long position
  }

  /**
   * Calculate weighted average of signals
   * @param {Array} signals - Array of signals from different strategies
   * @returns {Object} Combined signal
   */
  combineSignals(signals) {
    if (signals.length === 0) {
      return { signal: 'HOLD', confidence: 0 };
    }

    switch (this.options.votingMethod) {
      case 'majority':
        return this.majorityVoting(signals);
        
      case 'weighted':
        return this.weightedVoting(signals);
        
      case 'confidence':
        return this.confidenceVoting(signals);
        
      default:
        return this.majorityVoting(signals);
    }
  }

  /**
   * Majority voting method
   * @param {Array} signals - Array of signals
   * @returns {Object} Combined signal
   */
  majorityVoting(signals) {
    const signalCount = { BUY: 0, SELL: 0, HOLD: 0 };
    let totalConfidence = 0;
    
    signals.forEach(signalObj => {
      const signal = signalObj.signal || signalObj.action;
      const confidence = signalObj.confidence || 0;
      
      if (signal === 'BUY') signalCount.BUY++;
      else if (signal === 'SELL') signalCount.SELL++;
      else signalCount.HOLD++;
      
      totalConfidence += Math.abs(confidence);
    });
    
    // Determine majority signal
    let majoritySignal = 'HOLD';
    if (signalCount.BUY > signalCount.SELL && signalCount.BUY > signalCount.HOLD) {
      majoritySignal = 'BUY';
    } else if (signalCount.SELL > signalCount.BUY && signalCount.SELL > signalCount.HOLD) {
      majoritySignal = 'SELL';
    }
    
    // Calculate average confidence
    const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;
    
    return {
      signal: majoritySignal,
      confidence: avgConfidence,
      signalCount: signalCount
    };
  }

  /**
   * Weighted voting method
   * @param {Array} signals - Array of signals
   * @returns {Object} Combined signal
   */
  weightedVoting(signals) {
    if (this.options.weights.length !== signals.length) {
      // If weights not provided, use equal weights
      this.options.weights = Array(signals.length).fill(1 / signals.length);
    }
    
    let weightedBuy = 0;
    let weightedSell = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    
    signals.forEach((signalObj, index) => {
      const signal = signalObj.signal || signalObj.action;
      const confidence = Math.abs(signalObj.confidence || 0);
      const weight = this.options.weights[index];
      
      if (signal === 'BUY') {
        weightedBuy += weight * confidence;
      } else if (signal === 'SELL') {
        weightedSell += weight * confidence;
      }
      
      totalWeight += weight;
      totalConfidence += confidence;
    });
    
    // Determine signal based on weighted scores
    let combinedSignal = 'HOLD';
    if (weightedBuy > weightedSell && weightedBuy > this.options.confidenceThreshold * totalWeight) {
      combinedSignal = 'BUY';
    } else if (weightedSell > weightedBuy && weightedSell > this.options.confidenceThreshold * totalWeight) {
      combinedSignal = 'SELL';
    }
    
    // Calculate weighted average confidence
    const avgConfidence = totalWeight > 0 ? 
      (weightedBuy + weightedSell) / totalWeight : 0;
    
    return {
      signal: combinedSignal,
      confidence: avgConfidence,
      weightedBuy: weightedBuy,
      weightedSell: weightedSell
    };
  }

  /**
   * Confidence-based voting method
   * @param {Array} signals - Array of signals
   * @returns {Object} Combined signal
   */
  confidenceVoting(signals) {
    let totalBuyConfidence = 0;
    let totalSellConfidence = 0;
    let buyCount = 0;
    let sellCount = 0;
    
    signals.forEach(signalObj => {
      const signal = signalObj.signal || signalObj.action;
      const confidence = Math.abs(signalObj.confidence || 0);
      
      if (signal === 'BUY') {
        totalBuyConfidence += confidence;
        buyCount++;
      } else if (signal === 'SELL') {
        totalSellConfidence += confidence;
        sellCount++;
      }
    });
    
    // Calculate average confidence for each signal type
    const avgBuyConfidence = buyCount > 0 ? totalBuyConfidence / buyCount : 0;
    const avgSellConfidence = sellCount > 0 ? totalSellConfidence / sellCount : 0;
    
    // Determine signal based on highest average confidence
    let combinedSignal = 'HOLD';
    if (avgBuyConfidence > avgSellConfidence && avgBuyConfidence > this.options.confidenceThreshold) {
      combinedSignal = 'BUY';
    } else if (avgSellConfidence > avgBuyConfidence && avgSellConfidence > this.options.confidenceThreshold) {
      combinedSignal = 'SELL';
    }
    
    // Overall confidence is the maximum of buy/sell confidence
    const overallConfidence = Math.max(avgBuyConfidence, avgSellConfidence);
    
    return {
      signal: combinedSignal,
      confidence: overallConfidence,
      avgBuyConfidence: avgBuyConfidence,
      avgSellConfidence: avgSellConfidence
    };
  }

  /**
   * Execute trading action
   * @param {string} signal - Trading signal
   * @param {number} price - Current price
   */
  executeAction(signal, price) {
    const previousPosition = this.currentPosition;
    const previousBalance = this.balance;
    const previousShares = this.shares;
    
    switch (signal) {
      case 'BUY':
        if (this.currentPosition === 0 && this.balance > 0) {
          // Buy with all available balance
          this.shares = this.balance / price;
          this.balance = 0;
          this.currentPosition = 1;
        }
        break;
        
      case 'SELL':
        if (this.currentPosition === 1 && this.shares > 0) {
          // Sell all shares
          this.balance = this.shares * price;
          this.shares = 0;
          this.currentPosition = 0;
        }
        break;
        
      default: // HOLD
        // Do nothing
        break;
    }
    
    return {
      position: this.currentPosition,
      balance: this.balance,
      shares: this.shares,
      portfolioValue: this.balance + (this.shares * price)
    };
  }

  /**
   * Generate trading signals using ensemble of strategies
   * @param {Array} prices - Array of price data
   * @returns {Object} Strategy results with signals and portfolio
   */
  async generateSignals(prices) {
    const signals = [];
    const portfolio = [];
    
    if (prices.length === 0 || this.options.strategies.length === 0) {
      return { signals, portfolio };
    }
    
    // Reset portfolio for new backtest
    this.balance = this.options.initialBalance;
    this.shares = 0;
    this.currentPosition = 0;
    
    // Generate signals from each strategy
    const strategySignals = await Promise.all(
      this.options.strategies.map(async (strategy, index) => {
        try {
          // Check if strategy has generateSignals method
          if (typeof strategy.generateSignals === 'function') {
            const result = await strategy.generateSignals(prices);
            return result.signals || [];
          } else if (typeof strategy === 'function') {
            // If strategy is a function, call it directly
            const result = await strategy(prices);
            return result.signals || [];
          }
          return [];
        } catch (error) {
          console.error(`Error generating signals from strategy ${index}:`, error);
          return [];
        }
      })
    );
    
    // Process signals for each time point
    const minLength = Math.min(...strategySignals.map(s => s.length));
    
    for (let i = 0; i < minLength; i++) {
      const currentPrice = prices[i + this.options.lookbackPeriod || 0];
      
      // Collect signals from all strategies for this time point
      const currentSignals = [];
      strategySignals.forEach((strategySignalArray, strategyIndex) => {
        if (i < strategySignalArray.length) {
          currentSignals.push(strategySignalArray[i]);
        }
      });
      
      // Combine signals
      const combinedSignal = this.combineSignals(currentSignals);
      
      // Execute trading action
      const portfolioState = this.executeAction(combinedSignal.signal, currentPrice);
      
      signals.push({
        time: i,
        price: currentPrice,
        signal: combinedSignal.signal,
        confidence: combinedSignal.confidence,
        strategySignals: currentSignals,
        combinedDetails: combinedSignal
      });
      
      portfolio.push({
        time: i,
        price: currentPrice,
        signal: combinedSignal.signal,
        balance: portfolioState.balance,
        shares: portfolioState.shares,
        portfolioValue: portfolioState.portfolioValue
      });
    }
    
    return { signals, portfolio };
  }

  /**
   * Add a new strategy to the ensemble
   * @param {Object} strategy - Strategy instance to add
   * @param {number} weight - Weight for the strategy (optional)
   */
  addStrategy(strategy, weight = null) {
    this.options.strategies.push(strategy);
    if (weight !== null) {
      this.options.weights.push(weight);
    }
  }

  /**
   * Remove a strategy from the ensemble
   * @param {number} index - Index of strategy to remove
   */
  removeStrategy(index) {
    if (index >= 0 && index < this.options.strategies.length) {
      this.options.strategies.splice(index, 1);
      if (index < this.options.weights.length) {
        this.options.weights.splice(index, 1);
      }
    }
  }

  /**
   * Update strategy weights
   * @param {Array} weights - New weights array
   */
  updateWeights(weights) {
    if (weights.length === this.options.strategies.length) {
      this.options.weights = weights;
    } else {
      console.warn('Weight array length does not match strategy count');
    }
  }
}

module.exports = EnsembleStrategy;