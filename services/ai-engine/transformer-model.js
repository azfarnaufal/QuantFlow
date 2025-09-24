// Custom Transformer Model Implementation
class TransformerModel {
  constructor(inputDim = 10, dModel = 64, numHeads = 4, numLayers = 2, sequenceLength = 30) {
    this.inputDim = inputDim;
    this.dModel = dModel;
    this.numHeads = numHeads;
    this.numLayers = numLayers;
    this.sequenceLength = sequenceLength;
    
    // Initialize model components
    this.embedding = new LinearLayer(inputDim, dModel);
    this.positionalEncoding = this.createPositionalEncoding(sequenceLength, dModel);
    this.encoderLayers = [];
    
    // Create encoder layers
    for (let i = 0; i < numLayers; i++) {
      this.encoderLayers.push(new EncoderLayer(dModel, numHeads));
    }
    
    // Output layer
    this.outputLayer = new LinearLayer(dModel, 3); // 3 outputs: LONG, SHORT, HOLD
    
    console.log(`Transformer Model initialized: ${inputDim}D input, ${dModel}D model, ${numHeads} heads, ${numLayers} layers`);
  }

  // Create positional encoding
  createPositionalEncoding(maxLen, dModel) {
    const pe = [];
    for (let pos = 0; pos < maxLen; pos++) {
      pe[pos] = [];
      for (let i = 0; i < dModel; i++) {
        if (i % 2 === 0) {
          pe[pos][i] = Math.sin(pos / Math.pow(10000, 2 * i / dModel));
        } else {
          pe[pos][i] = Math.cos(pos / Math.pow(10000, 2 * i / dModel));
        }
      }
    }
    return pe;
  }

  // Forward pass
  forward(inputSequence) {
    // Input embedding
    let x = this.embedding.forward(inputSequence);
    
    // Add positional encoding
    x = this.addPositionalEncoding(x);
    
    // Pass through encoder layers
    for (const layer of this.encoderLayers) {
      x = layer.forward(x);
    }
    
    // Global average pooling (take mean across sequence dimension)
    const pooled = this.globalAveragePooling(x);
    
    // Output layer
    const output = this.outputLayer.forward([pooled]);
    
    // Apply softmax
    return this.softmax(output[0]);
  }

  // Add positional encoding to input
  addPositionalEncoding(x) {
    const result = [];
    for (let i = 0; i < x.length; i++) {
      const row = [];
      for (let j = 0; j < x[i].length; j++) {
        row.push(x[i][j] + this.positionalEncoding[i][j]);
      }
      result.push(row);
    }
    return result;
  }

  // Global average pooling
  globalAveragePooling(x) {
    if (x.length === 0) return [];
    
    const pooled = new Array(x[0].length).fill(0);
    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < x[i].length; j++) {
        pooled[j] += x[i][j];
      }
    }
    
    // Average
    for (let j = 0; j < pooled.length; j++) {
      pooled[j] /= x.length;
    }
    
    return pooled;
  }

  // Softmax activation
  softmax(x) {
    const maxVal = Math.max(...x);
    const exps = x.map(val => Math.exp(val - maxVal));
    const sumExps = exps.reduce((sum, val) => sum + val, 0);
    return exps.map(val => val / sumExps);
  }

  // Train the model
  train(sequences, targets, epochs = 10, learningRate = 0.001) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;
      
      for (let i = 0; i < sequences.length; i++) {
        // Forward pass
        const output = this.forward(sequences[i]);
        
        // Calculate loss (cross-entropy)
        const loss = this.crossEntropyLoss(output, targets[i]);
        totalLoss += loss;
        
        // Backward pass (simplified)
        this.backward(sequences[i], output, targets[i], learningRate);
      }
      
      const avgLoss = totalLoss / sequences.length;
      console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${avgLoss.toFixed(6)}`);
    }
  }

  // Cross-entropy loss
  crossEntropyLoss(predicted, actual) {
    let loss = 0;
    for (let i = 0; i < predicted.length; i++) {
      loss -= actual[i] * Math.log(predicted[i] + 1e-8); // Add small epsilon to prevent log(0)
    }
    return loss;
  }

  // Simplified backward pass
  backward(input, output, target, learningRate) {
    // In a full implementation, this would compute gradients and update weights
    // For this simplified version, we'll just log the process
    console.log('Backward pass completed');
  }

  // Predict action probabilities
  predict(inputSequence) {
    return this.forward(inputSequence);
  }
}

// Linear layer
class LinearLayer {
  constructor(inputSize, outputSize) {
    this.inputSize = inputSize;
    this.outputSize = outputSize;
    
    // Initialize weights randomly
    this.weights = [];
    for (let i = 0; i < outputSize; i++) {
      this.weights[i] = [];
      for (let j = 0; j < inputSize; j++) {
        this.weights[i][j] = Math.random() * 0.1 - 0.05; // Random values between -0.05 and 0.05
      }
    }
    
    // Initialize biases to zero
    this.biases = new Array(outputSize).fill(0);
  }
  
  forward(input) {
    // Handle both 1D and 2D inputs
    let inputArray = input;
    if (Array.isArray(input) && input.length > 0 && !Array.isArray(input[0])) {
      // 1D input - wrap in array
      inputArray = [input];
    }
    
    // Process each input in the batch
    const output = [];
    for (let batch = 0; batch < inputArray.length; batch++) {
      const inputRow = inputArray[batch];
      const outputRow = [];
      
      for (let i = 0; i < this.outputSize; i++) {
        let sum = this.biases[i];
        for (let j = 0; j < this.inputSize; j++) {
          sum += inputRow[j] * this.weights[i][j];
        }
        outputRow.push(sum);
      }
      output.push(outputRow);
    }
    
    return output;
  }
}

// Encoder layer
class EncoderLayer {
  constructor(dModel, numHeads) {
    this.dModel = dModel;
    this.numHeads = numHeads;
    
    // Self-attention mechanism
    this.attention = new MultiHeadAttention(dModel, numHeads);
    
    // Feed-forward network
    this.feedForward = new FeedForward(dModel);
    
    // Layer normalization
    this.norm1 = new LayerNorm(dModel);
    this.norm2 = new LayerNorm(dModel);
  }
  
  forward(x) {
    // Self-attention
    let attnOutput = this.attention.forward(x);
    
    // Add & Norm (residual connection)
    let addNorm1 = this.addResidual(x, attnOutput);
    let norm1Output = this.norm1.forward(addNorm1);
    
    // Feed-forward
    let ffOutput = this.feedForward.forward(norm1Output);
    
    // Add & Norm (residual connection)
    let addNorm2 = this.addResidual(norm1Output, ffOutput);
    let norm2Output = this.norm2.forward(addNorm2);
    
    return norm2Output;
  }
  
  addResidual(a, b) {
    // Handle residual connection where a and b might have different structures
    if (a.length !== b.length) {
      // If dimensions don't match, return the transformed output
      return b;
    }
    
    const result = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i].length !== b[i].length) {
        // If row dimensions don't match, return the transformed output
        return b;
      }
      
      const row = [];
      for (let j = 0; j < a[i].length; j++) {
        row.push(a[i][j] + b[i][j]);
      }
      result.push(row);
    }
    return result;
  }
}

// Multi-head attention (simplified)
class MultiHeadAttention {
  constructor(dModel, numHeads) {
    this.dModel = dModel;
    this.numHeads = numHeads;
    this.dHead = Math.floor(dModel / numHeads);
  }
  
  forward(x) {
    // Simplified attention - just return input for this example
    return x;
  }
}

// Feed-forward network
class FeedForward {
  constructor(dModel) {
    this.layer1 = new LinearLayer(dModel, dModel * 4);
    this.layer2 = new LinearLayer(dModel * 4, dModel);
  }
  
  forward(x) {
    // Process each sequence element
    const output = [];
    for (let i = 0; i < x.length; i++) {
      // First linear layer + ReLU
      let row = this.layer1.forward([x[i]]); // Wrap in array for batch dimension
      row = row[0].map(val => Math.max(0, val)); // ReLU activation
      
      // Second linear layer
      row = this.layer2.forward([row]); // Wrap in array for batch dimension
      output.push(row[0]); // Extract from batch dimension
    }
    return output;
  }
}

// Layer normalization
class LayerNorm {
  constructor(dModel) {
    this.dModel = dModel;
    this.gamma = 1; // Scale parameter
    this.beta = 0;  // Shift parameter
  }
  
  forward(x) {
    // Proper layer normalization
    const output = [];
    for (let i = 0; i < x.length; i++) {
      // Calculate mean and variance for this sequence element
      let sum = 0;
      for (let j = 0; j < x[i].length; j++) {
        sum += x[i][j];
      }
      const mean = sum / x[i].length;
      
      let varianceSum = 0;
      for (let j = 0; j < x[i].length; j++) {
        varianceSum += Math.pow(x[i][j] - mean, 2);
      }
      const variance = varianceSum / x[i].length;
      const std = Math.sqrt(variance + 1e-8); // Add epsilon to prevent division by zero
      
      // Normalize and scale
      const row = [];
      for (let j = 0; j < x[i].length; j++) {
        row.push(this.gamma * (x[i][j] - mean) / std + this.beta);
      }
      output.push(row);
    }
    return output;
  }
}

module.exports = TransformerModel;