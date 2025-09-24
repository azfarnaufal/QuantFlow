const express = require('express');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Simple API route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API route is working'
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});