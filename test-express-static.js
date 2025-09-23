const express = require('express');
const app = express();
const port = 3003;

// Add a route before any static middleware
app.get('/api/test', (req, res) => {
  res.json({ message: 'API route working' });
});

// Add static middleware (this is what might be happening automatically)
app.use(express.static('public'));

// Add a route after static middleware
app.get('/api/test2', (req, res) => {
  res.json({ message: 'API route 2 working' });
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Try accessing:');
  console.log(`  http://localhost:${port}/api/test`);
  console.log(`  http://localhost:${port}/api/test2`);
  console.log(`  http://localhost:${port}/nonexistent`);
});