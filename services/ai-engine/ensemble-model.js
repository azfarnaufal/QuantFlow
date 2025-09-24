// Custom Ensemble Model for Combining Multiple AI Approaches
class EnsembleModel {
  constructor() {
    this.models = new Map();
    this.weights = new Map();
    this.performanceHistory = new Map();
    this.votingStrategy = 'weighted'; // 'weighted', 'majority', 'stacking'
    
    console.log('Ensemble Model initialized');
  }

  // Add a model to the ensemble
  addModel(name, model, weight = 1.0) {
    this.models.set(name, model);
    this.weights.set(name, weight);
    this.performanceHistory.set(name, []);
    
    console.log(`Model ${name} added to ensemble with weight ${weight}`);
  }

  // Remove a model from the ensemble
  removeModel(name) {
    this.models.delete(name);
    this.weights.delete(name);
    this.performanceHistory.delete(name);
    
    console.log(`Model ${name} removed from ensemble`);
  }

  // Predict using ensemble
  async predict(input) {
    if (this.models.size === 0) {
      throw new Error('No models in ensemble');
    }

    // Get predictions from all models
    const predictions = new Map();
    
    for (const [name, model] of this.models) {
      try {
        let prediction;
        
        // Handle different model types
        if (typeof model.predict === 'function') {
          prediction = await model.predict(input);
        } else if (typeof model.forward === 'function') {
          prediction = await model.forward(input);
        } else {
          // Default to random prediction
          prediction = [0.33, 0.33, 0.34]; // LONG, SHORT, HOLD
        }
        
        // Validate prediction
        if (!Array.isArray(prediction) || prediction.length !== 3) {
          console.warn(`Invalid prediction from model ${name}, using neutral prediction`);
          prediction = [0.33, 0.33, 0.34];
        }
        
        // Check for NaN values
        const hasNaN = prediction.some(val => isNaN(val) || !isFinite(val));
        if (hasNaN) {
          console.warn(`NaN values in prediction from model ${name}, using neutral prediction`);
          prediction = [0.33, 0.33, 0.34];
        }
        
        predictions.set(name, prediction);
      } catch (error) {
        console.error(`Error in model ${name}:`, error);
        // Use neutral prediction if model fails
        predictions.set(name, [0.33, 0.33, 0.34]);
      }
    }

    // Combine predictions based on voting strategy
    let ensemblePrediction;
    
    switch (this.votingStrategy) {
      case 'weighted':
        ensemblePrediction = this.weightedVoting(predictions);
        break;
      case 'majority':
        ensemblePrediction = this.majorityVoting(predictions);
        break;
      case 'stacking':
        ensemblePrediction = this.stacking(predictions);
        break;
      default:
        ensemblePrediction = this.weightedVoting(predictions);
    }

    return ensemblePrediction;
  }

  // Weighted voting
  weightedVoting(predictions) {
    const ensemblePrediction = [0, 0, 0]; // LONG, SHORT, HOLD
    let totalWeight = 0;
    
    for (const [name, prediction] of predictions) {
      const weight = this.weights.get(name) || 1.0;
      
      // Validate prediction array
      if (!Array.isArray(prediction) || prediction.length !== 3) {
        console.warn(`Invalid prediction format from model ${name}`);
        continue;
      }
      
      // Check for NaN values
      const hasNaN = prediction.some(val => isNaN(val) || !isFinite(val));
      if (hasNaN) {
        console.warn(`NaN values in prediction from model ${name}`);
        continue;
      }
      
      for (let i = 0; i < prediction.length; i++) {
        ensemblePrediction[i] += prediction[i] * weight;
      }
      totalWeight += weight;
    }
    
    // Normalize by total weight
    if (totalWeight > 0) {
      for (let i = 0; i < ensemblePrediction.length; i++) {
        ensemblePrediction[i] /= totalWeight;
      }
    } else {
      // If no valid predictions, return neutral
      return [0.33, 0.33, 0.34];
    }
    
    // Ensure probabilities sum to 1 (handle floating point errors)
    const sum = ensemblePrediction.reduce((a, b) => a + b, 0);
    if (sum > 0 && Math.abs(sum - 1) > 0.001) {
      for (let i = 0; i < ensemblePrediction.length; i++) {
        ensemblePrediction[i] /= sum;
      }
    }
    
    return ensemblePrediction;
  }

  // Majority voting
  majorityVoting(predictions) {
    const votes = [0, 0, 0]; // LONG, SHORT, HOLD
    
    for (const [name, prediction] of predictions) {
      const bestAction = this.argmax(prediction);
      votes[bestAction]++;
    }
    
    // Convert votes to probabilities
    const totalVotes = votes.reduce((a, b) => a + b, 0);
    if (totalVotes > 0) {
      return votes.map(vote => vote / totalVotes);
    }
    
    return [0.33, 0.33, 0.34];
  }

  // Stacking (simplified)
  stacking(predictions) {
    // In a real implementation, this would use a meta-learner
    // For now, we'll use weighted voting as a simplified stacking approach
    return this.weightedVoting(predictions);
  }

  // Train ensemble models
  async train(data, labels, epochs = 10) {
    const trainingHistories = [];
    
    for (const [name, model] of this.models) {
      try {
        console.log(`Training model ${name}...`);
        
        // Handle different training methods
        if (typeof model.train === 'function') {
          const history = await model.train(data, labels, epochs);
          trainingHistories.push({ name, history });
        } else {
          console.log(`Model ${name} does not support training`);
        }
      } catch (error) {
        console.error(`Error training model ${name}:`, error);
      }
    }
    
    return trainingHistories;
  }

  // Update model weights based on performance
  updateWeights(modelPerformance) {
    // Update weights based on recent performance
    for (const [name, performance] of Object.entries(modelPerformance)) {
      if (this.weights.has(name)) {
        // Simple performance-based weighting
        // Higher performance = higher weight
        const currentWeight = this.weights.get(name);
        const newWeight = currentWeight * (1 + performance * 0.1); // Adjust by 10% of performance
        this.weights.set(name, newWeight);
        
        // Store performance history
        const history = this.performanceHistory.get(name) || [];
        history.push(performance);
        
        // Keep only last 100 performance records
        if (history.length > 100) {
          this.performanceHistory.set(name, history.slice(-100));
        } else {
          this.performanceHistory.set(name, history);
        }
      }
    }
    
    // Normalize weights
    this.normalizeWeights();
  }

  // Normalize weights to sum to 1
  normalizeWeights() {
    const totalWeight = Array.from(this.weights.values()).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight > 0) {
      for (const [name, weight] of this.weights) {
        this.weights.set(name, weight / totalWeight);
      }
    }
  }

  // Get model weights
  getModelWeights() {
    const weights = {};
    for (const [name, weight] of this.weights) {
      weights[name] = weight;
    }
    return weights;
  }

  // Get model performance history
  getPerformanceHistory() {
    const history = {};
    for (const [name, perfHistory] of this.performanceHistory) {
      history[name] = [...perfHistory];
    }
    return history;
  }

  // Get model count
  getModelCount() {
    return this.models.size;
  }

  // Set voting strategy
  setVotingStrategy(strategy) {
    if (['weighted', 'majority', 'stacking'].includes(strategy)) {
      this.votingStrategy = strategy;
      console.log(`Voting strategy set to ${strategy}`);
    } else {
      console.error(`Invalid voting strategy: ${strategy}`);
    }
  }

  // Get best model based on recent performance
  getBestModel() {
    let bestModel = null;
    let bestPerformance = -Infinity;
    
    for (const [name, history] of this.performanceHistory) {
      if (history.length > 0) {
        const recentPerformance = history[history.length - 1];
        if (recentPerformance > bestPerformance) {
          bestPerformance = recentPerformance;
          bestModel = name;
        }
      }
    }
    
    return bestModel;
  }

  // Save ensemble
  save(filename) {
    const data = {
      weights: Object.fromEntries(this.weights),
      performanceHistory: Object.fromEntries(this.performanceHistory),
      votingStrategy: this.votingStrategy
    };
    
    // In a real implementation, this would save to a file
    console.log(`Ensemble saved to ${filename}`);
    return data;
  }

  // Load ensemble
  load(data) {
    this.weights = new Map(Object.entries(data.weights));
    this.performanceHistory = new Map(Object.entries(data.performanceHistory));
    this.votingStrategy = data.votingStrategy;
    
    console.log('Ensemble loaded from data');
  }

  // Helper function to get argmax
  argmax(array) {
    let maxIndex = 0;
    for (let i = 1; i < array.length; i++) {
      if (array[i] > array[maxIndex]) {
        maxIndex = i;
      }
    }
    return maxIndex;
  }
}

module.exports = EnsembleModel;