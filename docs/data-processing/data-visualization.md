# Data Visualization Endpoints

This document describes the data visualization endpoints available in QuantFlow for creating charts and dashboards.

## Overview

QuantFlow provides RESTful API endpoints that return data formatted for visualization libraries like Chart.js, D3.js, and Plotly.

## Chart Data Endpoints

### OHLC Data for Candlestick Charts

```javascript
// GET /api/chart/ohlc/{symbol}
app.get('/api/chart/ohlc/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const interval = req.query.interval || '1h'; // 1h, 4h, 1d, etc.
    const limit = parseInt(req.query.limit) || 100;
    
    const ohlcData = await priceTracker.getOHLCData(symbol, interval, limit);
    
    res.json(ohlcData.map(d => ({
      time: d.bucket,
      open: parseFloat(d.open),
      high: parseFloat(d.high),
      low: parseFloat(d.low),
      close: parseFloat(d.close),
      volume: parseFloat(d.volume)
    })));
  } catch (error) {
    console.error('Error getting OHLC data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Time Series Data for Line Charts

```javascript
// GET /api/chart/timeseries/{symbol}
app.get('/api/chart/timeseries/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 100;
    
    const history = await priceTracker.getPriceHistory(symbol, limit);
    
    res.json(history.map(d => ({
      x: d.time,
      y: parseFloat(d.price)
    })));
  } catch (error) {
    console.error('Error getting time series data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Multiple Symbols Comparison

```javascript
// GET /api/chart/comparison
app.get('/api/chart/comparison', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : config.symbolsToTrack;
    const limit = parseInt(req.query.limit) || 50;
    
    const comparisonData = {};
    
    for (const symbol of symbols) {
      const history = await priceTracker.getPriceHistory(symbol.toUpperCase(), limit);
      comparisonData[symbol] = history.map(d => ({
        time: d.time,
        price: parseFloat(d.price)
      }));
    }
    
    res.json(comparisonData);
  } catch (error) {
    console.error('Error getting comparison data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Technical Indicators Visualization

### Indicator Overlays

```javascript
// GET /api/chart/indicators/{symbol}
app.get('/api/chart/indicators/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 100;
    
    const history = await priceTracker.getPriceHistory(symbol, limit);
    const prices = history.map(d => parseFloat(d.price));
    
    const indicators = {
      price: history.map(d => ({ time: d.time, value: parseFloat(d.price) })),
      sma20: calculateSMASeries(prices, 20, history),
      sma50: calculateSMASeries(prices, 50, history),
      ema12: calculateEMASeries(prices, 12, history),
      ema26: calculateEMASeries(prices, 26, history),
      rsi: calculateRSISeries(prices, 14, history),
      macd: calculateMACDSeries(prices, history),
      bollinger: calculateBollingerSeries(prices, 20, history)
    };
    
    res.json(indicators);
  } catch (error) {
    console.error('Error getting indicator data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Heatmap Data

```javascript
// GET /api/chart/heatmap
app.get('/api/chart/heatmap', async (req, res) => {
  try {
    const symbols = config.symbolsToTrack;
    const period = req.query.period || '24h'; // 1h, 24h, 7d, etc.
    
    const heatmapData = [];
    
    for (const symbol of symbols) {
      const change = await priceTracker.getPercentageChange(symbol, period);
      heatmapData.push({
        symbol: symbol,
        change: change
      });
    }
    
    res.json(heatmapData);
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Dashboard Endpoints

### Portfolio Dashboard

```javascript
// GET /api/dashboard/portfolio
app.get('/api/dashboard/portfolio', async (req, res) => {
  try {
    // This would integrate with a portfolio management system
    const portfolioData = {
      totalValue: 12500.50,
      dailyChange: 2.5,
      assets: [
        { symbol: 'BTCUSDT', value: 5000, change: 1.2 },
        { symbol: 'ETHUSDT', value: 3000, change: -0.8 },
        { symbol: 'BNBUSDT', value: 2000, change: 3.1 },
        { symbol: 'SOLUSDT', value: 1500, change: 5.2 },
        { symbol: 'XRPUSDT', value: 1000, change: -1.5 }
      ],
      performance: await getPortfolioPerformanceData()
    };
    
    res.json(portfolioData);
  } catch (error) {
    console.error('Error getting portfolio data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Market Overview Dashboard

```javascript
// GET /api/dashboard/market
app.get('/api/dashboard/market', async (req, res) => {
  try {
    const marketData = {
      totalMarketCap: 2.1e12,
      btcDominance: 42.5,
      activeCryptocurrencies: 12500,
      marketVolume: 75e9,
      topGainers: await getTopGainers(5),
      topLosers: await getTopLosers(5),
      trending: await getTrendingAssets(10)
    };
    
    res.json(marketData);
  } catch (error) {
    console.error('Error getting market data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Real-time Data Streams

### WebSocket for Live Charts

```javascript
// WebSocket endpoint for real-time price updates
app.ws('/ws/prices', (ws, req) => {
  const clients = new Set();
  
  ws.on('connection', (client) => {
    clients.add(client);
    
    client.on('close', () => {
      clients.delete(client);
    });
  });
  
  // Broadcast price updates to all connected clients
  priceTracker.on('priceUpdate', (data) => {
    const message = JSON.stringify({
      type: 'priceUpdate',
      data: data
    });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});
```

### Server-Sent Events (SSE) for Charts

```javascript
// GET /api/stream/prices
app.get('/api/stream/prices', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  const sendPriceUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  priceTracker.on('priceUpdate', sendPriceUpdate);
  
  req.on('close', () => {
    priceTracker.removeListener('priceUpdate', sendPriceUpdate);
  });
});
```

## Backtesting Visualization

### Strategy Performance Charts

```javascript
// GET /api/backtest/chart/{backtestId}
app.get('/api/backtest/chart/:backtestId', async (req, res) => {
  try {
    const backtestId = req.params.backtestId;
    const backtestResult = await getBacktestResult(backtestId);
    
    if (!backtestResult) {
      return res.status(404).json({ error: 'Backtest not found' });
    }
    
    const chartData = {
      equityCurve: backtestResult.portfolio.map(p => ({
        time: p.time,
        value: p.portfolioValue
      })),
      drawdown: calculateDrawdownSeries(backtestResult.portfolio),
      trades: backtestResult.trades.map(t => ({
        time: t.time,
        price: t.price,
        type: t.signal,
        amount: t.amount
      })),
      metrics: backtestResult.metrics
    };
    
    res.json(chartData);
  } catch (error) {
    console.error('Error getting backtest chart data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Strategy Comparison Charts

```javascript
// GET /api/backtest/comparison
app.get('/api/backtest/comparison', async (req, res) => {
  try {
    const strategyIds = req.query.strategies ? req.query.strategies.split(',') : [];
    const symbol = req.query.symbol || 'BTCUSDT';
    const period = req.query.period || '30d';
    
    const comparisonData = {};
    
    for (const strategyId of strategyIds) {
      const backtestResult = await runBacktest(strategyId, symbol, period);
      comparisonData[strategyId] = {
        equityCurve: backtestResult.portfolio.map(p => p.portfolioValue),
        metrics: backtestResult.metrics
      };
    }
    
    res.json(comparisonData);
  } catch (error) {
    console.error('Error getting backtest comparison data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Data Aggregation for Performance

### Pre-aggregated Data

```javascript
class ChartDataAggregator {
  constructor() {
    this.aggregatedData = new Map();
  }
  
  async getAggregatedData(symbol, interval, limit) {
    const key = `${symbol}-${interval}-${limit}`;
    
    // Check cache first
    if (this.aggregatedData.has(key)) {
      const cached = this.aggregatedData.get(key);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.data;
      }
    }
    
    // Generate aggregated data
    const rawData = await priceTracker.getPriceHistory(symbol, limit * 10); // Get more data for aggregation
    const aggregated = this.aggregateData(rawData, interval);
    
    // Cache the result
    this.aggregatedData.set(key, {
      data: aggregated,
      timestamp: Date.now()
    });
    
    return aggregated;
  }
  
  aggregateData(data, interval) {
    // Implementation for aggregating data based on interval
    // This could group by minute, hour, day, etc.
    // ... aggregation logic ...
  }
}
```

## API Response Formats

### Standard Chart Data Format

```javascript
{
  "series": [
    {
      "name": "Price",
      "data": [
        { "x": "2023-01-01T00:00:00Z", "y": 45000.00 },
        { "x": "2023-01-01T01:00:00Z", "y": 45100.50 },
        // ... more data points
      ]
    }
  ],
  "metadata": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "count": 100
  }
}
```

### Multi-series Chart Format

```javascript
{
  "series": [
    {
      "name": "Price",
      "type": "line",
      "data": [/* price data */]
    },
    {
      "name": "SMA20",
      "type": "line",
      "data": [/* sma data */]
    },
    {
      "name": "Volume",
      "type": "bar",
      "data": [/* volume data */]
    }
  ],
  "metadata": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

## Client-side Integration Examples

### Chart.js Integration

```javascript
// Fetch and display price chart
async function displayPriceChart(symbol) {
  const response = await fetch(`/api/chart/timeseries/${symbol}?limit=100`);
  const data = await response.json();
  
  const ctx = document.getElementById('priceChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: `${symbol} Price`,
        data: data,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour'
          }
        },
        y: {
          beginAtZero: false
        }
      }
    }
  });
}
```

### D3.js Integration

```javascript
// Create a real-time price chart with D3.js
function createRealTimeChart(symbol) {
  const margin = {top: 20, right: 30, bottom: 30, left: 40};
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Create scales
  const xScale = d3.scaleTime().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);
  
  // Create line generator
  const line = d3.line()
    .x(d => xScale(new Date(d.x)))
    .y(d => yScale(d.y));
  
  // Fetch initial data
  fetch(`/api/chart/timeseries/${symbol}?limit=50`)
    .then(response => response.json())
    .then(data => {
      // Set domains
      xScale.domain(d3.extent(data, d => new Date(d.x)));
      yScale.domain(d3.extent(data, d => d.y));
      
      // Add the line
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
    });
}
```

## Performance Optimization

### Data Sampling

```javascript
function sampleData(data, maxPoints) {
  if (data.length <= maxPoints) return data;
  
  const sampled = [];
  const step = Math.ceil(data.length / maxPoints);
  
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  
  return sampled;
}
```

### Compression

```javascript
// Compress data for faster transmission
function compressChartData(data) {
  // Remove unnecessary precision
  return data.map(point => ({
    x: point.x,
    y: Math.round(point.y * 100) / 100 // Round to 2 decimal places
  }));
}
```

## Error Handling

### Graceful Degradation

```javascript
app.get('/api/chart/:symbol', async (req, res) => {
  try {
    const data = await getChartData(req.params.symbol);
    res.json(data);
  } catch (error) {
    console.error('Chart data error:', error);
    
    // Return minimal data instead of error
    res.json({
      series: [],
      error: 'Data temporarily unavailable'
    });
  }
});
```

## Rate Limiting for Visualization Endpoints

```javascript
const chartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 chart requests per windowMs
  message: {
    error: 'Too many chart requests from this IP, please try again later.'
  }
});

app.use('/api/chart/', chartLimiter);
```

## Testing

### Visualization Data Tests

```javascript
describe('Visualization Endpoints', () => {
  describe('OHLC Data', () => {
    it('should return properly formatted OHLC data', async () => {
      const response = await request(app).get('/api/chart/ohlc/BTCUSDT');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('time');
      expect(response.body[0]).toHaveProperty('open');
      expect(response.body[0]).toHaveProperty('high');
      expect(response.body[0]).toHaveProperty('low');
      expect(response.body[0]).toHaveProperty('close');
    });
  });
  
  describe('Time Series Data', () => {
    it('should return time series data in correct format', async () => {
      const response = await request(app).get('/api/chart/timeseries/BTCUSDT');
      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty('x');
      expect(response.body[0]).toHaveProperty('y');
    });
  });
});
```