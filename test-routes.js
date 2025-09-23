const express = require('express');
const app = express();
const port = 3001;

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Test server running' });
});

// Backtesting Engine
const backtestingEngine = require('./backtesting-engine');

console.log('Registering backtest routes...');

// Get available backtesting strategies
app.get('/backtest/strategies', (req, res) => {
  console.log('Backtest strategies route called');
  try {
    const strategies = backtestingEngine.getStrategies();
    res.json({ strategies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});