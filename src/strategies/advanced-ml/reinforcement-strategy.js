// Reinforcement Learning Trading Strategy
// This strategy uses Q-Learning for trading decisions

const math = require('mathjs');

class ReinforcementStrategy {
  /**
   * Reinforcement Learning Strategy Constructor
   * @param {Object} options - Strategy options
   */
  constructor(options = {}) {
    this.name = 'reinforcementStrategy';
    this.description = 'Reinforcement Learning Trading Strategy';
    this.options = {
      lookbackPeriod: options.lookbackPeriod || 30,
      learningRate: options.learningRate || 0.1,
      discountFactor: options.discountFactor || 0.95, // Gamma
      epsilon: options.epsilon || 0.1, // Exploration rate
      epsilonDecay: options.epsilonDecay || 0.995,
      epsilonMin: options.epsilonMin || 0.01,
      initialBalance: options.initialBalance || 10000,
      ...options
    };
    
    // State space: [position, rsi, macd_signal, price_change]
    this.stateSize = 4;
    // Action space: [Hold, Buy, Sell]
    this.actionSize = 3;
    
    // Initialize Q-table
    this.qTable = new Map();
    
    // Initialize state
    this.currentState = null;
    this.currentAction = 0; // 0: Hold, 1: Buy, 2: Sell
    this.currentPosition = 0; // 0: No position, 1: Long position
    this.balance = this.options.initialBalance;
    this.shares = 0;
    
    // Technical indicators helper
    this.indicatorHistory = [];
  }

  /**
   * Discretize continuous state values into bins
   * @param {Array} state - Continuous state values
   * @returns {Array} Discretized state
   */
  discretizeState(state) {
    const [position, rsi, macdSignal, priceChange] = state;
    
    // Discretize RSI (0-100) into 10 bins
    const rsiBin = Math.min(9, Math.floor(rsi / 10));
    
    // Discretize MACD signal into 3 bins (-1, 0, 1)
    let macdBin = 1; // Neutral
    if (macdSignal > 0.1) macdBin = 2; // Positive
    else if (macdSignal < -0.1) macdBin = 0; // Negative
    
    // Discretize price change into 3 bins
    let priceChangeBin = 1; // Neutral
    if (priceChange > 0.01) priceChangeBin = 2; // Positive (>1%)
    else if (priceChange < -0.01) priceChangeBin = 0; // Negative (<-1%)
    
    return [position, rsiBin, macdBin, priceChangeBin];
  }

  /**
   * Create state key for Q-table
   * @param {Array} state - Discretized state
   * @returns {string} State key
   */
  createStateKey(state) {
    return state.join('-');
  }

  /**
   * Get Q-value for state-action pair
   * @param {Array} state - Discretized state
   * @param {number} action - Action index
   * @returns {number} Q-value
   */
  getQValue(state, action) {
    const stateKey = this.createStateKey(state);
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, Array(this.actionSize).fill(0));
    }
    return this.qTable.get(stateKey)[action];
  }

  /**
   * Update Q-value for state-action pair
   * @param {Array} state - Discretized state
   * @param {number} action - Action index
   * @param {number} value - New Q-value
   */
  setQValue(state, action, value) {
    const stateKey = this.createStateKey(state);
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, Array(this.actionSize).fill(0));
    }
    this.qTable.get(stateKey)[action] = value;
  }

  /**
   * Choose action using epsilon-greedy policy
   * @param {Array} state - Discretized state
   * @returns {number} Action index
   */
  chooseAction(state) {
    // Exploration: random action
    if (Math.random() < this.options.epsilon) {
      return Math.floor(Math.random() * this.actionSize);
    }
    
    // Exploitation: best action
    let bestAction = 0;
    let bestValue = this.getQValue(state, 0);
    
    for (let action = 1; action < this.actionSize; action++) {
      const value = this.getQValue(state, action);
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }
    
    return bestAction;
  }

  /**
   * Calculate technical indicators
   * @param {Array} prices - Price history
   * @returns {Object} Technical indicators
   */
  calculateIndicators(prices) {
    if (prices.length < 14) {
      return { rsi: 50, macd: 0, macdSignal: 0 };
    }

    // Calculate RSI
    let gains = 0;
    let losses = 0;
    
    for (let i = Math.max(0, prices.length - 14); i < prices.length - 1; i++) {
      const change = prices[i + 1] - prices[i];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss !== 0 ? avgGain / avgLoss : 0;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    
    // Calculate simple MACD (12, 26, 9)
    if (prices.length < 26) {
      return { rsi, macd: 0, macdSignal: 0 };
    }
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Calculate MACD signal line (9-period EMA of MACD)
    const macdHistory = [];
    for (let i = 26; i <= prices.length; i++) {
      const shortEMA = this.calculateEMA(prices.slice(0, i), 12);
      const longEMA = this.calculateEMA(prices.slice(0, i), 26);
      macdHistory.push(shortEMA - longEMA);
    }
    
    const macdSignal = macdHistory.length >= 9 ? this.calculateEMA(macdHistory, 9) : 0;
    
    return { rsi, macd, macdSignal };
  }

  /**
   * Calculate Exponential Moving Average
   * @param {Array} prices - Price data
   * @param {number} period - EMA period
   * @returns {number} EMA value
   */
  calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const k = 2 / (period + 1);
    let ema = prices[prices.length - period];
    
    for (let i = prices.length - period + 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  /**
   * Calculate reward based on portfolio performance
   * @param {number} currentPrice - Current price
   * @param {number} previousPrice - Previous price
   * @param {number} action - Action taken
   * @param {number} previousAction - Previous action
   * @returns {number} Reward value
   */
  calculateReward(currentPrice, previousPrice, action, previousAction) {
    const priceChange = (currentPrice - previousPrice) / previousPrice;
    let reward = 0;
    
    // Reward based on price movement and action
    if (this.currentPosition === 1) { // Long position
      reward = priceChange; // Profit from price increase
    } else { // No position
      reward = 0; // No profit or loss
    }
    
    // Penalty for excessive trading
    if (action !== previousAction && action !== 0) {
      reward -= 0.001; // Transaction cost penalty
    }
    
    // Scale reward
    return reward * 100;
  }

  /**
   * Update Q-learning model
   * @param {Array} state - Current state
   * @param {number} action - Action taken
   * @param {number} reward - Reward received
   * @param {Array} nextState - Next state
   */
  updateQValue(state, action, reward, nextState) {
    const currentStateKey = this.createStateKey(state);
    const nextMaxQ = Math.max(
      this.getQValue(nextState, 0),
      this.getQValue(nextState, 1),
      this.getQValue(nextState, 2)
    );
    
    const currentQ = this.getQValue(state, action);
    const newQ = currentQ + this.options.learningRate * (
      reward + this.options.discountFactor * nextMaxQ - currentQ
    );
    
    this.setQValue(state, action, newQ);
  }

  /**
   * Execute trading action
   * @param {number} action - Action to execute
   * @param {number} price - Current price
   */
  executeAction(action, price) {
    const previousPosition = this.currentPosition;
    const previousBalance = this.balance;
    const previousShares = this.shares;
    
    switch (action) {
      case 1: // Buy
        if (this.currentPosition === 0 && this.balance > 0) {
          // Buy with all available balance
          this.shares = this.balance / price;
          this.balance = 0;
          this.currentPosition = 1;
        }
        break;
        
      case 2: // Sell
        if (this.currentPosition === 1 && this.shares > 0) {
          // Sell all shares
          this.balance = this.shares * price;
          this.shares = 0;
          this.currentPosition = 0;
        }
        break;
        
      default: // Hold
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
   * Generate trading signals using reinforcement learning
   * @param {Array} prices - Array of price data
   * @returns {Object} Strategy results with signals and portfolio
   */
  async generateSignals(prices) {
    const signals = [];
    const portfolio = [];
    
    if (prices.length <= this.options.lookbackPeriod) {
      return { signals, portfolio };
    }
    
    // Reset for new backtest
    this.balance = this.options.initialBalance;
    this.shares = 0;
    this.currentPosition = 0;
    this.options.epsilon = 0.1; // Reset exploration rate
    
    let previousPrice = prices[this.options.lookbackPeriod];
    let previousAction = 0;
    
    // Generate signals for each time point
    for (let i = this.options.lookbackPeriod; i < prices.length; i++) {
      const currentPrice = prices[i];
      
      // Get historical prices for indicator calculation
      const historicalPrices = prices.slice(Math.max(0, i - 100), i + 1);
      
      // Calculate technical indicators
      const indicators = this.calculateIndicators(historicalPrices);
      const priceChange = i > 0 ? (currentPrice - prices[i - 1]) / prices[i - 1] : 0;
      
      // Create state
      const state = [
        this.currentPosition,
        indicators.rsi / 100, // Normalize RSI to [0, 1]
        Math.tanh(indicators.macdSignal), // Normalize MACD signal
        Math.max(-1, Math.min(1, priceChange * 100)) // Normalize price change to [-1, 1]
      ];
      
      // Discretize state
      const discreteState = this.discretizeState(state);
      
      // Choose action
      const action = this.chooseAction(discreteState);
      
      // Execute action
      const portfolioState = this.executeAction(action, currentPrice);
      
      // Calculate reward
      const reward = this.calculateReward(currentPrice, previousPrice, action, previousAction);
      
      // For next iteration
      if (i < prices.length - 1) {
        // Get next state
        const nextHistoricalPrices = prices.slice(Math.max(0, i + 1 - 100), i + 2);
        const nextIndicators = this.calculateIndicators(nextHistoricalPrices);
        const nextPriceChange = (prices[i + 1] - currentPrice) / currentPrice;
        
        const nextState = [
          this.currentPosition,
          nextIndicators.rsi / 100,
          Math.tanh(nextIndicators.macdSignal),
          Math.max(-1, Math.min(1, nextPriceChange * 100))
        ];
        
        const discreteNextState = this.discretizeState(nextState);
        
        // Update Q-value
        this.updateQValue(discreteState, action, reward, discreteNextState);
        
        // Decay exploration rate
        if (this.options.epsilon > this.options.epsilonMin) {
          this.options.epsilon *= this.options.epsilonDecay;
        }
      }
      
      signals.push({
        time: i,
        price: currentPrice,
        position: this.currentPosition,
        action: ['HOLD', 'BUY', 'SELL'][action],
        rsi: indicators.rsi,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        reward: reward,
        epsilon: this.options.epsilon
      });
      
      portfolio.push({
        time: i,
        price: currentPrice,
        action: ['HOLD', 'BUY', 'SELL'][action],
        balance: portfolioState.balance,
        shares: portfolioState.shares,
        portfolioValue: portfolioState.portfolioValue
      });
      
      previousPrice = currentPrice;
      previousAction = action;
    }
    
    return { signals, portfolio };
  }
}

module.exports = ReinforcementStrategy;