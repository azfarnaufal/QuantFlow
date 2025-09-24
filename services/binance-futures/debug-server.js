const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 3001;

console.log(`${new Date().toISOString()} - Starting server on port ${PORT}`);

// Function to get all network interfaces
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name in interfaces) {
    const interface = interfaces[name];
    for (const iface of interface) {
      if (!iface.internal && iface.family === 'IPv4') {
        addresses.push(iface.address);
      }
    }
  }
  
  return addresses;
}

console.log(`${new Date().toISOString()} - Available network interfaces:`, getNetworkInterfaces());

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.connection.remoteAddress}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/test' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'API route is working',
      timestamp: new Date().toISOString(),
      server: 'Binance Futures Trading Service'
    }));
  } else if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'Binance Futures Trading Service'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Binance Futures Trading Service</h1>
      <p>Server is running successfully!</p>
      <p>Available endpoints:</p>
      <ul>
        <li><a href="/api/test">/api/test</a> - Test API endpoint</li>
        <li><a href="/api/health">/api/health</a> - Health check endpoint</li>
      </ul>
    `);
  }
});

// Error handling for the server
server.on('error', (err) => {
  console.error(`${new Date().toISOString()} - Server error:`, err);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`${new Date().toISOString()} - Server is listening on:`);
  console.log(`  Local: http://localhost:${address.port}`);
  console.log(`  Network interfaces:`, getNetworkInterfaces().join(', '));
  console.log(`  Bind address: ${address.address}:${address.port}`);
  
  // Test if we can connect to ourselves
  setTimeout(() => {
    console.log(`${new Date().toISOString()} - Testing self-connection...`);
    const http = require('http');
    const req = http.get(`http://localhost:${address.port}/api/health`, (res) => {
      console.log(`${new Date().toISOString()} - Self-connection test response status:`, res.statusCode);
    }).on('error', (err) => {
      console.error(`${new Date().toISOString()} - Self-connection test error:`, err.message);
    });
    
    req.setTimeout(5000, () => {
      console.error(`${new Date().toISOString()} - Self-connection test timeout`);
      req.destroy();
    });
  }, 1000);
});

// Listen on all interfaces
console.log(`${new Date().toISOString()} - Attempting to bind to 0.0.0.0:${PORT}`);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`${new Date().toISOString()} - Server listening callback executed`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log(`${new Date().toISOString()} - SIGTERM received, shutting down server`);
  server.close(() => {
    console.log(`${new Date().toISOString()} - Server closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`${new Date().toISOString()} - SIGINT received, shutting down server`);
  server.close(() => {
    console.log(`${new Date().toISOString()} - Server closed`);
    process.exit(0);
  });
});