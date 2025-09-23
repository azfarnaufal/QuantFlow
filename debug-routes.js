const express = require('express');
const app = express();

// Add a simple middleware to log all requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Add a test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Add backtesting routes
const backtestingEngine = require('./backtesting-engine');

app.get('/backtest/strategies', (req, res) => {
  try {
    const strategies = backtestingEngine.getStrategies();
    res.json({ strategies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/backtest/:symbol', (req, res) => {
  res.json({ message: 'Backtest route working', symbol: req.params.symbol });
});

// Start server
const port = 3001;
app.listen(port, () => {
  console.log(`Debug server running at http://localhost:${port}`);
});