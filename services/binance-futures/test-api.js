const http = require('http');

console.log('Testing API endpoints...');

// Test /api/health endpoint
const healthReq = http.get('http://localhost:3001/api/health', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('/api/health status code:', res.statusCode);
    console.log('/api/health response:', data);
    
    // Test /api/test endpoint
    const testReq = http.get('http://localhost:3001/api/test', (res) => {
      let testData = '';
      
      res.on('data', (chunk) => {
        testData += chunk;
      });
      
      res.on('end', () => {
        console.log('/api/test status code:', res.statusCode);
        console.log('/api/test response:', testData);
      });
    }).on('error', (err) => {
      console.error('/api/test error:', err.message);
    });
  });
}).on('error', (err) => {
  console.error('/api/health error:', err.message);
});