// Custom Reinforcement Learning Agent for Futures Trading
class ReinforcementAgent {
  constructor(stateSize, actionSize, learningRate = 0.001) {
    this.stateSize = stateSize;
    this.actionSize = actionSize;
    this.learningRate = learningRate;
    
    // Q-learning parameters
    this.epsilon = 1.0; // Exploration rate
    this.epsilonMin = 0.01;
    this.epsilonDecay = 0.995;
    this.gamma = 0.95; // Discount factor
    
    // Experience replay
    this.memory = [];
    this.maxMemoryLength = 10000;
    
    // Q-table (simplified for demonstration)
    this.qTable = new Map();
    
    console.log(`Reinforcement Agent initialized: ${stateSize} states, ${actionSize} actions`);
  }

  // Get action using epsilon-greedy policy
  getAction(state) {
    // Epsilon-greedy exploration
    if (Math.random() <= this.epsilon) {
      // Random action (exploration)
      return Math.floor(Math.random() * this.actionSize);
    }
    
    // Best action based on Q-values (exploitation)
    const stateKey = this.getStateKey(state);
    if (this.qTable.has(stateKey)) {
      const qValues = this.qTable.get(stateKey);
      return this.argmax(qValues);
    }
    
    // Default to random if state not seen
    return Math.floor(Math.random() * this.actionSize);
  }

  // Update Q-values based on experience
  updateQValue(state, action, reward, nextState, done) {
    const stateKey = this.getStateKey(state);
    const nextStateKey = this.getStateKey(nextState);
    
    // Initialize Q-values if not present
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Array(this.actionSize).fill(0));
    }
    
    if (!this.qTable.has(nextStateKey)) {
      this.qTable.set(nextStateKey, new Array(this.actionSize).fill(0));
    }
    
    // Q-learning update formula
    const currentQ = this.qTable.get(stateKey)[action];
    const nextMaxQ = Math.max(...this.qTable.get(nextStateKey));
    
    const newQ = done ? reward : reward + this.gamma * nextMaxQ;
    const updatedQ = currentQ + this.learningRate * (newQ - currentQ);
    
    this.qTable.get(stateKey)[action] = updatedQ;
    
    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
  }

  // Add experience to memory
  remember(state, action, reward, nextState, done) {
    this.memory.push({ state, action, reward, nextState, done });
    
    // Limit memory size
    if (this.memory.length > this.maxMemoryLength) {
      this.memory.shift();
    }
  }

  // Replay experiences for training
  replay(batchSize = 32) {
    if (this.memory.length < batchSize) return;
    
    // Sample random batch
    const batchIndices = [];
    for (let i = 0; i < batchSize; i++) {
      batchIndices.push(Math.floor(Math.random() * this.memory.length));
    }
    
    // Update Q-values for batch
    for (const index of batchIndices) {
      const experience = this.memory[index];
      this.updateQValue(
        experience.state,
        experience.action,
        experience.reward,
        experience.nextState,
        experience.done
      );
    }
  }

  // Convert state array to string key
  getStateKey(state) {
    return state.map(val => val.toFixed(4)).join(',');
  }

  // Get argmax of array
  argmax(array) {
    let maxIndex = 0;
    for (let i = 1; i < array.length; i++) {
      if (array[i] > array[maxIndex]) {
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  // Calculate reward for trading action
  calculateReward(action, currentPrice, nextPrice, position = null) {
    let reward = 0;
    
    // Price change
    const priceChange = (nextPrice - currentPrice) / currentPrice;
    
    // Reward based on action and price movement
    switch (action) {
      case 0: // LONG
        reward = priceChange;
        break;
      case 1: // SHORT
        reward = -priceChange;
        break;
      case 2: // HOLD
        reward = Math.abs(priceChange) * 0.1; // Small reward for holding during volatile periods
        break;
    }
    
    // Position-based rewards
    if (position) {
      // Add PnL from existing position
      const pnl = this.calculatePositionPnL(position, currentPrice);
      reward += pnl * 0.1; // Weight position PnL
      
      // Risk penalty for large positions
      if (Math.abs(position.size) > 0.5) {
        reward -= 0.1; // Penalty for high exposure
      }
    }
    
    // Normalize reward
    return Math.max(Math.min(reward, 1), -1);
  }

  // Calculate position PnL
  calculatePositionPnL(position, currentPrice) {
    if (!position || position.size === 0) return 0;
    
    const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
    
    if (position.side === 'LONG') {
      return priceChange * position.size;
    } else if (position.side === 'SHORT') {
      return -priceChange * position.size;
    }
    
    return 0;
  }

  // Get current Q-values for state
  getQValues(state) {
    const stateKey = this.getStateKey(state);
    if (this.qTable.has(stateKey)) {
      return [...this.qTable.get(stateKey)]; // Return copy
    }
    return new Array(this.actionSize).fill(0);
  }

  // Get exploration rate
  getEpsilon() {
    return this.epsilon;
  }

  // Get memory size
  getMemorySize() {
    return this.memory.length;
  }

  // Save agent state
  save(filename) {
    const data = {
      qTable: Array.from(this.qTable.entries()),
      epsilon: this.epsilon,
      memory: this.memory
    };
    
    // In a real implementation, this would save to a file
    console.log(`Agent saved to ${filename}`);
    return data;
  }

  // Load agent state
  load(data) {
    this.qTable = new Map(data.qTable);
    this.epsilon = data.epsilon;
    this.memory = data.memory;
    
    console.log('Agent loaded from data');
  }
}

module.exports = ReinforcementAgent;