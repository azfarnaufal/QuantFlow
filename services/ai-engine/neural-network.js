// Custom Neural Network Implementation with Enhanced Training
class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes, learningRate = 0.1) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;
    this.learningRate = learningRate;
    
    // Initialize weights with random values
    this.weightsIH = this.randomMatrix(hiddenNodes, inputNodes);
    this.weightsHO = this.randomMatrix(outputNodes, hiddenNodes);
    
    // Initialize biases
    this.biasH = new Array(hiddenNodes).fill(0);
    this.biasO = new Array(outputNodes).fill(0);
    
    // Training statistics
    this.trainingStats = {
      epochs: 0,
      totalError: 0,
      lastError: 0
    };
    
    console.log(`Neural Network initialized: ${inputNodes} -> ${hiddenNodes} -> ${outputNodes}`);
  }

  // Create random matrix with Xavier initialization
  randomMatrix(rows, cols) {
    const matrix = [];
    // Xavier initialization: random values between -sqrt(6/(input+output)) and sqrt(6/(input+output))
    const limit = Math.sqrt(6 / (rows + cols));
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() * 2 - 1) * limit;
      }
    }
    return matrix;
  }

  // Sigmoid activation function
  sigmoid(x) {
    // Clip x to prevent overflow
    const clippedX = Math.max(Math.min(x, 100), -100);
    return 1 / (1 + Math.exp(-clippedX));
  }

  // Derivative of sigmoid
  sigmoidDerivative(x) {
    return x * (1 - x);
  }

  // ReLU activation function
  relu(x) {
    return Math.max(0, x);
  }

  // Derivative of ReLU
  reluDerivative(x) {
    return x > 0 ? 1 : 0;
  }

  // Tanh activation function
  tanh(x) {
    return Math.tanh(x);
  }

  // Derivative of tanh
  tanhDerivative(x) {
    return 1 - x * x;
  }

  // Forward propagation with configurable activation
  predict(inputArray, hiddenActivation = 'sigmoid', outputActivation = 'sigmoid') {
    // Convert array to matrix
    let inputs = this.arrayToMatrix(inputArray);
    
    // Calculate hidden layer
    let hidden = this.matrixMultiply(this.weightsIH, inputs);
    hidden = this.addBias(hidden, this.biasH);
    
    // Apply hidden activation
    switch (hiddenActivation) {
      case 'relu':
        hidden = this.applyActivation(hidden, this.relu);
        break;
      case 'tanh':
        hidden = this.applyActivation(hidden, this.tanh);
        break;
      case 'sigmoid':
      default:
        hidden = this.applyActivation(hidden, this.sigmoid);
        break;
    }
    
    // Calculate output layer
    let outputs = this.matrixMultiply(this.weightsHO, hidden);
    outputs = this.addBias(outputs, this.biasO);
    
    // Apply output activation
    switch (outputActivation) {
      case 'relu':
        outputs = this.applyActivation(outputs, this.relu);
        break;
      case 'tanh':
        outputs = this.applyActivation(outputs, this.tanh);
        break;
      case 'sigmoid':
      default:
        outputs = this.applyActivation(outputs, this.sigmoid);
        break;
    }
    
    // Convert output matrix to array
    return this.matrixToArray(outputs);
  }

  // Enhanced train method with batch training
  train(inputArray, targetArray, epochs = 1) {
    let totalError = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Forward propagation
      let inputs = this.arrayToMatrix(inputArray);
      
      // Hidden layer
      let hidden = this.matrixMultiply(this.weightsIH, inputs);
      hidden = this.addBias(hidden, this.biasH);
      hidden = this.applyActivation(hidden, this.sigmoid);
      
      // Output layer
      let outputs = this.matrixMultiply(this.weightsHO, hidden);
      outputs = this.addBias(outputs, this.biasO);
      outputs = this.applyActivation(outputs, this.sigmoid);
      
      // Convert target array to matrix
      let targets = this.arrayToMatrix(targetArray);
      
      // Calculate output errors
      let outputErrors = this.subtractMatrix(targets, outputs);
      
      // Calculate MSE for this training instance
      let mse = 0;
      for (let i = 0; i < outputErrors.length; i++) {
        for (let j = 0; j < outputErrors[i].length; j++) {
          mse += outputErrors[i][j] * outputErrors[i][j];
        }
      }
      mse /= (outputErrors.length * outputErrors[0].length);
      totalError += mse;
      
      // Calculate output gradients
      let outputGradients = this.applyActivation(outputs, this.sigmoidDerivative);
      outputGradients = this.elementMultiply(outputGradients, outputErrors);
      outputGradients = this.scalarMultiply(outputGradients, this.learningRate);
      
      // Calculate hidden->output deltas
      let hiddenT = this.transposeMatrix(hidden);
      let weightsHODeltas = this.matrixMultiply(outputGradients, hiddenT);
      
      // Adjust weights and biases
      this.weightsHO = this.addMatrix(this.weightsHO, weightsHODeltas);
      this.biasO = this.addBiasVector(this.biasO, this.matrixToArray(outputGradients));
      
      // Calculate hidden layer errors
      let weightsHOT = this.transposeMatrix(this.weightsHO);
      let hiddenErrors = this.matrixMultiply(weightsHOT, outputErrors);
      
      // Calculate hidden gradients
      let hiddenGradients = this.applyActivation(hidden, this.sigmoidDerivative);
      hiddenGradients = this.elementMultiply(hiddenGradients, hiddenErrors);
      hiddenGradients = this.scalarMultiply(hiddenGradients, this.learningRate);
      
      // Calculate input->hidden deltas
      let inputsT = this.transposeMatrix(inputs);
      let weightsIHDeltas = this.matrixMultiply(hiddenGradients, inputsT);
      
      // Adjust weights and biases
      this.weightsIH = this.addMatrix(this.weightsIH, weightsIHDeltas);
      this.biasH = this.addBiasVector(this.biasH, this.matrixToArray(hiddenGradients));
    }
    
    // Update training statistics
    this.trainingStats.epochs += epochs;
    this.trainingStats.totalError += totalError;
    this.trainingStats.lastError = totalError / epochs;
    
    return this.trainingStats.lastError;
  }

  // Batch training method
  trainBatch(trainingData, epochs = 1, batchSize = 32) {
    let totalError = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle training data
      const shuffledData = [...trainingData].sort(() => Math.random() - 0.5);
      
      // Process in batches
      for (let i = 0; i < shuffledData.length; i += batchSize) {
        const batch = shuffledData.slice(i, i + batchSize);
        let batchError = 0;
        
        // Accumulate gradients for batch
        let weightsIHGradient = this.zerosMatrix(this.weightsIH.length, this.weightsIH[0].length);
        let weightsHOGradient = this.zerosMatrix(this.weightsHO.length, this.weightsHO[0].length);
        let biasHGradient = new Array(this.biasH.length).fill(0);
        let biasOGradient = new Array(this.biasO.length).fill(0);
        
        for (const dataPoint of batch) {
          const { input, target } = dataPoint;
          
          // Forward propagation
          let inputs = this.arrayToMatrix(input);
          
          // Hidden layer
          let hidden = this.matrixMultiply(this.weightsIH, inputs);
          hidden = this.addBias(hidden, this.biasH);
          hidden = this.applyActivation(hidden, this.sigmoid);
          
          // Output layer
          let outputs = this.matrixMultiply(this.weightsHO, hidden);
          outputs = this.addBias(outputs, this.biasO);
          outputs = this.applyActivation(outputs, this.sigmoid);
          
          // Convert target array to matrix
          let targets = this.arrayToMatrix(target);
          
          // Calculate output errors
          let outputErrors = this.subtractMatrix(targets, outputs);
          
          // Calculate MSE for this training instance
          let mse = 0;
          for (let r = 0; r < outputErrors.length; r++) {
            for (let c = 0; c < outputErrors[r].length; c++) {
              mse += outputErrors[r][c] * outputErrors[r][c];
            }
          }
          mse /= (outputErrors.length * outputErrors[0].length);
          batchError += mse;
          
          // Calculate output gradients
          let outputGradients = this.applyActivation(outputs, this.sigmoidDerivative);
          outputGradients = this.elementMultiply(outputGradients, outputErrors);
          outputGradients = this.scalarMultiply(outputGradients, this.learningRate / batch.length);
          
          // Calculate hidden->output deltas
          let hiddenT = this.transposeMatrix(hidden);
          let weightsHODeltas = this.matrixMultiply(outputGradients, hiddenT);
          
          // Accumulate gradients
          weightsHOGradient = this.addMatrix(weightsHOGradient, weightsHODeltas);
          const outputBiasDelta = this.matrixToArray(outputGradients);
          for (let j = 0; j < biasOGradient.length; j++) {
            biasOGradient[j] += outputBiasDelta[j];
          }
          
          // Calculate hidden layer errors
          let weightsHOT = this.transposeMatrix(this.weightsHO);
          let hiddenErrors = this.matrixMultiply(weightsHOT, outputErrors);
          
          // Calculate hidden gradients
          let hiddenGradients = this.applyActivation(hidden, this.sigmoidDerivative);
          hiddenGradients = this.elementMultiply(hiddenGradients, hiddenErrors);
          hiddenGradients = this.scalarMultiply(hiddenGradients, this.learningRate / batch.length);
          
          // Calculate input->hidden deltas
          let inputsT = this.transposeMatrix(inputs);
          let weightsIHDeltas = this.matrixMultiply(hiddenGradients, inputsT);
          
          // Accumulate gradients
          weightsIHGradient = this.addMatrix(weightsIHGradient, weightsIHDeltas);
          const hiddenBiasDelta = this.matrixToArray(hiddenGradients);
          for (let j = 0; j < biasHGradient.length; j++) {
            biasHGradient[j] += hiddenBiasDelta[j];
          }
        }
        
        // Apply accumulated gradients
        this.weightsHO = this.addMatrix(this.weightsHO, weightsHOGradient);
        this.weightsIH = this.addMatrix(this.weightsIH, weightsIHGradient);
        
        for (let j = 0; j < this.biasO.length; j++) {
          this.biasO[j] += biasOGradient[j];
        }
        for (let j = 0; j < this.biasH.length; j++) {
          this.biasH[j] += biasHGradient[j];
        }
        
        totalError += batchError / batch.length;
      }
    }
    
    // Update training statistics
    this.trainingStats.epochs += epochs;
    this.trainingStats.totalError += totalError;
    this.trainingStats.lastError = totalError / epochs;
    
    return this.trainingStats.lastError;
  }

  // Cross-validation method
  crossValidate(trainingData, k = 5) {
    // Shuffle data
    const shuffledData = [...trainingData].sort(() => Math.random() - 0.5);
    
    const foldSize = Math.floor(shuffledData.length / k);
    let foldErrors = [];
    
    for (let i = 0; i < k; i++) {
      // Split data into training and validation sets
      const validationStart = i * foldSize;
      const validationEnd = (i + 1) * foldSize;
      
      const validationSet = shuffledData.slice(validationStart, validationEnd);
      const trainingSet = [
        ...shuffledData.slice(0, validationStart),
        ...shuffledData.slice(validationEnd)
      ];
      
      // Save current weights
      const originalWeightsIH = this.cloneMatrix(this.weightsIH);
      const originalWeightsHO = this.cloneMatrix(this.weightsHO);
      const originalBiasH = [...this.biasH];
      const originalBiasO = [...this.biasO];
      
      // Train on training set
      this.trainBatch(trainingSet, 10, 32);
      
      // Validate on validation set
      let validationError = 0;
      for (const dataPoint of validationSet) {
        const prediction = this.predict(dataPoint.input);
        const target = dataPoint.target;
        
        // Calculate MSE
        let mse = 0;
        for (let j = 0; j < prediction.length; j++) {
          mse += Math.pow(prediction[j] - target[j], 2);
        }
        mse /= prediction.length;
        validationError += mse;
      }
      
      foldErrors.push(validationError / validationSet.length);
      
      // Restore original weights
      this.weightsIH = originalWeightsIH;
      this.weightsHO = originalWeightsHO;
      this.biasH = originalBiasH;
      this.biasO = originalBiasO;
    }
    
    const avgError = foldErrors.reduce((sum, error) => sum + error, 0) / foldErrors.length;
    const stdDev = Math.sqrt(
      foldErrors.reduce((sum, error) => sum + Math.pow(error - avgError, 2), 0) / foldErrors.length
    );
    
    return {
      averageError: avgError,
      standardDeviation: stdDev,
      foldErrors: foldErrors
    };
  }

  // Matrix operations
  arrayToMatrix(array) {
    return array.map(val => [val]);
  }

  matrixToArray(matrix) {
    return matrix.map(row => row[0]);
  }

  matrixMultiply(a, b) {
    // Check dimensions
    if (a[0].length !== b.length) {
      throw new Error(`Matrix dimensions incompatible for multiplication: ${a.length}x${a[0].length} * ${b.length}x${b[0].length}`);
    }
    
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  addMatrix(a, b) {
    // Check dimensions
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error(`Matrix dimensions incompatible for addition: ${a.length}x${a[0].length} + ${b.length}x${b[0].length}`);
    }
    
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < a[0].length; j++) {
        result[i][j] = a[i][j] + b[i][j];
      }
    }
    return result;
  }

  subtractMatrix(a, b) {
    // Check dimensions
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error(`Matrix dimensions incompatible for subtraction: ${a.length}x${a[0].length} - ${b.length}x${b[0].length}`);
    }
    
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < a[0].length; j++) {
        result[i][j] = a[i][j] - b[i][j];
      }
    }
    return result;
  }

  addBias(matrix, bias) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
      result[i] = [];
      for (let j = 0; j < matrix[0].length; j++) {
        result[i][j] = matrix[i][j] + bias[i];
      }
    }
    return result;
  }

  addBiasVector(biasVector, deltaVector) {
    const result = [];
    for (let i = 0; i < biasVector.length; i++) {
      result[i] = biasVector[i] + deltaVector[i];
    }
    return result;
  }

  applyActivation(matrix, activationFunc) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
      result[i] = [];
      for (let j = 0; j < matrix[0].length; j++) {
        result[i][j] = activationFunc(matrix[i][j]);
      }
    }
    return result;
  }

  elementMultiply(a, b) {
    // Check dimensions
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error(`Matrix dimensions incompatible for element-wise multiplication: ${a.length}x${a[0].length} .* ${b.length}x${b[0].length}`);
    }
    
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < a[0].length; j++) {
        result[i][j] = a[i][j] * b[i][j];
      }
    }
    return result;
  }

  scalarMultiply(matrix, scalar) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
      result[i] = [];
      for (let j = 0; j < matrix[0].length; j++) {
        result[i][j] = matrix[i][j] * scalar;
      }
    }
    return result;
  }

  transposeMatrix(matrix) {
    const result = [];
    for (let i = 0; i < matrix[0].length; i++) {
      result[i] = [];
      for (let j = 0; j < matrix.length; j++) {
        result[i][j] = matrix[j][i];
      }
    }
    return result;
  }

  // Helper methods
  zerosMatrix(rows, cols) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = 0;
      }
    }
    return matrix;
  }

  cloneMatrix(matrix) {
    return matrix.map(row => [...row]);
  }

  // Get training statistics
  getTrainingStats() {
    return { ...this.trainingStats };
  }

  // Reset training statistics
  resetTrainingStats() {
    this.trainingStats = {
      epochs: 0,
      totalError: 0,
      lastError: 0
    };
  }

  // Save network weights
  save(filename) {
    const data = {
      inputNodes: this.inputNodes,
      hiddenNodes: this.hiddenNodes,
      outputNodes: this.outputNodes,
      weightsIH: this.weightsIH,
      weightsHO: this.weightsHO,
      biasH: this.biasH,
      biasO: this.biasO,
      trainingStats: this.trainingStats
    };
    
    // In a real implementation, this would save to a file
    console.log(`Network saved to ${filename}`);
    return data;
  }

  // Load network weights
  load(data) {
    this.inputNodes = data.inputNodes;
    this.hiddenNodes = data.hiddenNodes;
    this.outputNodes = data.outputNodes;
    this.weightsIH = data.weightsIH;
    this.weightsHO = data.weightsHO;
    this.biasH = data.biasH;
    this.biasO = data.biasO;
    this.trainingStats = data.trainingStats || {
      epochs: 0,
      totalError: 0,
      lastError: 0
    };
    
    console.log('Network loaded from data');
  }
}

module.exports = NeuralNetwork;