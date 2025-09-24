const http = require('http');

console.log('Verifying API endpoints...\n');

// Function to make HTTP request and handle response
function makeRequest(path, description, callback) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`${description}:`);
      console.log(`  Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        try {
          const jsonData = JSON.parse(data);
          console.log(`  Success: ${jsonData.success}`);
          if (jsonData.data) {
            if (Array.isArray(jsonData.data)) {
              console.log(`  Data items: ${jsonData.data.length}`);
            } else if (typeof jsonData.data === 'object') {
              console.log(`  Data keys: ${Object.keys(jsonData.data).length}`);
            }
          }
        } catch (parseError) {
          console.log(`  Response: ${data.substring(0, 100)}...`);
        }
      } else {
        console.log(`  Error: ${data.substring(0, 100)}...`);
      }
      console.log('');
      
      if (callback) callback();
    });
  });

  req.on('error', (error) => {
    console.log(`${description}:`);
    console.log(`  Error: ${error.message}`);
    console.log('');
    
    if (callback) callback();
  });

  req.end();
}

// Test all API endpoints
function testAPIEndpoints() {
  console.log('Testing API endpoints...\n');
  
  // Test market data endpoint
  makeRequest('/api/market-data', 'Market Data Endpoint', () => {
    // Test positions endpoint
    makeRequest('/api/positions', 'Positions Endpoint', () => {
      // Test trading history endpoint
      makeRequest('/api/trading-history', 'Trading History Endpoint', () => {
        // Test AI decisions endpoint
        makeRequest('/api/ai-decisions', 'AI Decisions Endpoint', () => {
          console.log('API verification completed.');
        });
      });
    });
  });
}

// Run the tests
testAPIEndpoints();