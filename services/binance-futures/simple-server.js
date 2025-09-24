const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/api/test' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'API route is working',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Binance Futures Trading Service</h1>');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server running at http://0.0.0.0:${PORT}`);
});