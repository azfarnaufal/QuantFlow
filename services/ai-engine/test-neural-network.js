const NeuralNetwork = require('./neural-network');

function testNeuralNetwork() {
  console.log('Testing Neural Network...');
  
  try {
    // Create a simple neural network: 3 inputs -> 4 hidden -> 1 output
    const nn = new NeuralNetwork(3, 4, 1);
    
    // Test data: [input1, input2, input3] -> [output]
    const trainingData = [
      { input: [0, 0, 1], output: [0] },
      { input: [0, 1, 1], output: [1] },
      { input: [1, 0, 1], output: [1] },
      { input: [1, 1, 1], output: [0] }
    ];
    
    console.log('Training neural network...');
    
    // Train the network
    for (let epoch = 0; epoch < 1000; epoch++) {
      for (const data of trainingData) {
        nn.train(data.input, data.output);
      }
    }
    
    console.log('Training completed.');
    
    // Test predictions
    console.log('\nTesting predictions:');
    for (const data of trainingData) {
      const prediction = nn.predict(data.input);
      console.log(`Input: [${data.input.join(', ')}] -> Expected: [${data.output.join(', ')}], Got: [${prediction.map(p => p.toFixed(4)).join(', ')}]`);
    }
    
    console.log('\nNeural network test completed successfully!');
  } catch (error) {
    console.error('Error testing neural network:', error);
  }
}

testNeuralNetwork();