const tf = require('@tensorflow/tfjs-node');

// Simplified DQN agent without TensorFlow.js dependency
class DQNAgent {
  constructor(stateSize, actionSize, learningRate = 0.001) {
    this.stateSize = stateSize;
    this.actionSize = actionSize;
    this.learningRate = learningRate;
    
    // Epsilon-greedy parameters
    this.epsilon = 1.0;
    this.epsilonMin = 0.01;
    this.epsilonDecay = 0.995;
    
    // Discount factor
    this.gamma = 0.95;
    
    // Experience replay
    this.memory = [];
    this.maxMemoryLength = 10000;
    
    console.log('DQN Agent initialized (simplified version)');
  }

  act(state) {
    // Epsilon-greedy action selection
    if (Math.random() <= this.epsilon) {
      return Math.floor(Math.random() * this.actionSize);
    }
    
    // Simple rule-based action selection
    // In a real implementation, this would use a neural network
    return Math.floor(Math.random() * this.actionSize);
  }

  remember(state, action, reward, nextState, done) {
    this.memory.push({ state, action, reward, nextState, done });
    
    // Limit memory size
    if (this.memory.length > this.maxMemoryLength) {
      this.memory.shift();
    }
  }

  async replay(batchSize = 32) {
    if (this.memory.length < batchSize) return;
    
    console.log(`Training DQN with ${batchSize} experiences`);
    
    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
    
    return { history: [] };
  }

  // Calculate reward based on trading performance
  calculateReward(action, currentPrice, nextPrice, transactionCost = 0.001) {
    const priceChange = (nextPrice - currentPrice) / currentPrice;
    
    let reward = 0;
    
    // Reward based on action and price movement
    if (action === 0) { // Buy
      reward = priceChange - transactionCost; // Profit minus cost
    } else if (action === 1) { // Sell
      reward = -priceChange - transactionCost; // Profit from downward movement minus cost
    } else { // Hold
      reward = Math.abs(priceChange) * 0.1; // Small reward for holding during volatile periods
    }
    
    // Clamp reward to prevent extreme values
    return Math.max(Math.min(reward, 1), -1);
  }
}

module.exports = DQNAgent;