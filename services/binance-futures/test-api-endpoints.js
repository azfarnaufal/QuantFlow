const http = require('http');

console.log('Testing API endpoints...');

// Function to make HTTP request
function makeRequest(path, callback) {
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
      try {
        const jsonData = JSON.parse(data);
        callback(null, {
          statusCode: res.statusCode,
          data: jsonData
        });
      } catch (error) {
        callback(error, {
          statusCode: res.statusCode,
          data: data
        });
      }
    });
  });

  req.on('error', (error) => {
    callback(error, null);
  });

  req.end();
}

// Test API endpoints
async function testEndpoints() {
  console.log('Starting API endpoint tests...\n');

  // Test 1: Health check
  console.log('Test 1: Health check');
  makeRequest('/', (error, response) => {
    if (error) {
      console.log('  Error:', error.message);
    } else {
      console.log('  Status:', response.statusCode);
      console.log('  Response type:', typeof response.data);
    }
  });

  // Test 2: Market data endpoint
  console.log('\nTest 2: Market data endpoint');
  makeRequest('/api/market-data', (error, response) => {
    if (error) {
      console.log('  Error:', error.message);
    } else {
      console.log('  Status:', response.statusCode);
      if (response.data && response.data.success) {
        console.log('  Success: true');
        console.log('  Data keys:', Object.keys(response.data.data || {}));
      } else {
        console.log('  Success: false');
        console.log('  Error:', response.data?.error);
      }
    }
  });

  // Test 3: Positions endpoint
  console.log('\nTest 3: Positions endpoint');
  makeRequest('/api/positions', (error, response) => {
    if (error) {
      console.log('  Error:', error.message);
    } else {
      console.log('  Status:', response.statusCode);
      if (response.data && response.data.success) {
        console.log('  Success: true');
        console.log('  Data keys:', Object.keys(response.data.data || {}));
      } else {
        console.log('  Success: false');
        console.log('  Error:', response.data?.error);
      }
    }
  });

  // Test 4: Trading history endpoint
  console.log('\nTest 4: Trading history endpoint');
  makeRequest('/api/trading-history', (error, response) => {
    if (error) {
      console.log('  Error:', error.message);
    } else {
      console.log('  Status:', response.statusCode);
      if (response.data && response.data.success) {
        console.log('  Success: true');
        console.log('  Data length:', Array.isArray(response.data.data) ? response.data.data.length : 'N/A');
      } else {
        console.log('  Success: false');
        console.log('  Error:', response.data?.error);
      }
    }
  });

  // Test 5: AI decisions endpoint
  console.log('\nTest 5: AI decisions endpoint');
  makeRequest('/api/ai-decisions', (error, response) => {
    if (error) {
      console.log('  Error:', error.message);
    } else {
      console.log('  Status:', response.statusCode);
      if (response.data && response.data.success) {
        console.log('  Success: true');
        console.log('  Data length:', Array.isArray(response.data.data) ? response.data.data.length : 'N/A');
      } else {
        console.log('  Success: false');
        console.log('  Error:', response.data?.error);
      }
    }
  });

  // Wait a bit for all requests to complete
  setTimeout(() => {
    console.log('\nAPI endpoint tests completed.');
  }, 2000);
}

// Run the tests
testEndpoints();