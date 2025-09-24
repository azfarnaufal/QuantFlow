const http = require('http');

console.log('Testing Backtest API endpoints...\n');

// Function to make HTTP request and handle response
function makeRequest(options, postData, callback) {
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        try {
          const jsonData = JSON.parse(data);
          console.log(`Success: ${jsonData.success}`);
          if (jsonData.data) {
            if (Array.isArray(jsonData.data)) {
              console.log(`Data items: ${jsonData.data.length}`);
            } else if (typeof jsonData.data === 'object') {
              console.log(`Data keys: ${Object.keys(jsonData.data).length}`);
            }
          }
        } catch (parseError) {
          console.log(`Response: ${data.substring(0, 100)}...`);
        }
      } else {
        console.log(`Error: ${data.substring(0, 100)}...`);
      }
      console.log('');
      
      if (callback) callback();
    });
  });

  req.on('error', (error) => {
    console.log(`Error: ${error.message}`);
    console.log('');
    
    if (callback) callback();
  });

  if (postData) {
    req.write(JSON.stringify(postData));
  }
  
  req.end();
}

// Test synthetic data endpoint
console.log('Testing /api/synthetic-data endpoint:');
makeRequest({
  hostname: 'localhost',
  port: 3001,
  path: '/api/synthetic-data?symbol=BTCUSDT&points=100',
  method: 'GET'
}, null, () => {
  console.log('Testing /api/backtest endpoint with synthetic data:');
  
  // First get synthetic data
  const getDataOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/synthetic-data?symbol=BTCUSDT&points=50',
    method: 'GET'
  };
  
  const getDataReq = http.request(getDataOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.success && jsonData.data) {
          // Now run backtest with this data
          console.log('Running backtest with synthetic data...');
          
          const backtestOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/backtest',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          };
          
          const backtestData = {
            historicalData: jsonData.data,
            initialCapital: 10000,
            config: {
              confidenceThreshold: 0.3
            }
          };
          
          makeRequest(backtestOptions, backtestData);
        }
      } catch (error) {
        console.log('Error processing synthetic data:', error.message);
      }
    });
  });
  
  getDataReq.on('error', (error) => {
    console.log('Error getting synthetic data:', error.message);
  });
  
  getDataReq.end();
});