const express = require('express');
const app = express();
const port = 3004;

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test working' });
});

// Backtesting routes (copied from server.js)
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

app.listen(port, () => {
  console.log(`Minimal test server running at http://localhost:${port}`);
});