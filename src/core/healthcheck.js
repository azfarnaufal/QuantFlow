// healthcheck.js
// Simple health check script for Docker container

const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/',
  timeout: 5000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    res.on('data', (chunk) => {
      // Consume response data
    });
    res.on('end', () => {
      process.exit(0);
    });
  } else {
    res.on('data', (chunk) => {
      // Consume response data
    });
    res.on('end', () => {
      process.exit(1);
    });
  }
});

request.on('error', (err) => {
  console.log('ERROR:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('TIMEOUT');
  request.destroy();
  process.exit(1);
});

request.setTimeout(5000);
request.end();