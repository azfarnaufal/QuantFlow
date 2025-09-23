# Data Visualization Guide

## Overview
This guide explains how to use the data visualization features of the Crypto Price Tracker system. The system now includes a web-based dashboard with real-time price displays and interactive charts.

## Web Dashboard

### Accessing the Dashboard
The dashboard is available at the root URL of the server:
```
http://localhost:3000/
```

### Dashboard Features

1. **Real-time Price Display**
   - Current prices for all tracked symbols displayed in a grid layout
   - Price and volume information for each cryptocurrency
   - Automatic refresh of price data

2. **Interactive Charts**
   - Historical price charts using Chart.js
   - Configurable time intervals (1m, 5m, 15m, 30m, 1h, 4h, 1d)
   - Configurable time ranges (1h to 1 week)
   - Interactive chart controls

3. **Data Controls**
   - Symbol selection dropdown
   - Interval selection dropdown
   - Time range selection dropdown
   - Manual refresh button

## API Endpoints for Visualization

### Get All Symbols
```
GET /symbols
```
Returns a list of all available symbols in the database.

Response:
```json
{
  "symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
}
```

### Get Latest Prices
```
GET /prices
```
Returns the latest price data for all symbols.

Response:
```json
{
  "BTCUSDT": {
    "price": 112950,
    "volume": 118077.244,
    "timestamp": "2025-09-23T06:49:04.704Z"
  },
  "ETHUSDT": {
    "price": 4209.91,
    "volume": 4168125.409,
    "timestamp": "2025-09-23T06:49:04.740Z"
  }
}
```

### Get OHLC Data
```
GET /ohlc/:symbol?interval=:interval&hours=:hours
```
Returns OHLC (Open, High, Low, Close) data for charting.

Parameters:
- `symbol`: The trading pair symbol (e.g., BTCUSDT)
- `interval`: Time interval for OHLC aggregation (default: "1 hour")
- `hours`: Number of hours of historical data (default: 24)

Response:
```json
{
  "symbol": "BTCUSDT",
  "interval": "1 hour",
  "hours": 24,
  "data": [
    {
      "bucket": "2025-09-23T06:00:00.000Z",
      "symbol": "BTCUSDT",
      "open": 112800,
      "high": 112950,
      "low": 112750,
      "close": 112950,
      "volume": 120000
    }
  ]
}
```

### Get Price History
```
GET /history/:symbol?hours=:hours
```
Returns detailed price history for a symbol.

Parameters:
- `symbol`: The trading pair symbol (e.g., BTCUSDT)
- `hours`: Number of hours of historical data (default: 24)

Response:
```json
{
  "symbol": "BTCUSDT",
  "hours": 24,
  "data": [
    {
      "time": "2025-09-23T06:49:04.704Z",
      "symbol": "BTCUSDT",
      "price": 112950,
      "volume": 118077.244
    }
  ]
}
```

## Chart.js Integration

The dashboard uses Chart.js for data visualization. The library is loaded from a CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### Chart Configuration
The line chart is configured with the following options:
- Responsive design that adapts to container size
- Smooth line tension for better visualization
- Time-based x-axis labels
- Automatic y-axis scaling

### Customization
You can customize the chart appearance by modifying the Chart.js configuration in the HTML file:
```javascript
const chartConfig = {
    type: 'line',
    data: chartData,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: false
            }
        }
    }
};
```

## Technical Implementation

### Frontend Components
1. **HTML Structure**: Semantic HTML with CSS styling
2. **CSS Styling**: Responsive design with flexbox and grid layouts
3. **JavaScript**: Asynchronous data fetching and DOM manipulation
4. **Chart.js**: Interactive charting library

### Backend Endpoints
1. **Static File Serving**: Express.js middleware for serving HTML/CSS/JS
2. **API Routes**: RESTful endpoints for data retrieval
3. **Database Queries**: TimescaleDB queries for historical data
4. **Data Aggregation**: OHLC data calculation using SQL functions

## Usage Examples

### Viewing the Dashboard
1. Start the server: `npm run server`
2. Open browser to: `http://localhost:3000/`
3. View real-time prices in the grid
4. Select a symbol to view its chart
5. Adjust interval and time range as needed

### Customizing the Dashboard
1. Modify `public/index.html` to change layout/styling
2. Update CSS styles in the `<style>` section
3. Add new chart types by extending the JavaScript
4. Add new API endpoints for additional data sources

## Troubleshooting

### Common Issues
1. **Chart not displaying**: Check browser console for JavaScript errors
2. **No data showing**: Verify TimescaleDB connection and data storage
3. **Slow loading**: Optimize database queries or reduce data range

### Debugging Tips
1. Use browser developer tools to inspect network requests
2. Check server logs for database connection errors
3. Verify API endpoint responses using curl or Postman
4. Ensure TimescaleDB extension is properly installed

## Future Enhancements
1. Add more chart types (candlestick, bar charts)
2. Implement technical indicators (RSI, MACD, moving averages)
3. Add comparison charts for multiple symbols
4. Include trading volume charts
5. Add export functionality for charts and data