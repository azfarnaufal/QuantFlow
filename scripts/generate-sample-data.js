#!/usr/bin/env node

/**
 * Script to generate sample data for the QuantFlow dashboard
 * This is useful for testing the UI when there's no real data available
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = 'http://localhost:3001';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const SAMPLE_SIZE = 100;

// Generate sample OHLC data
function generateSampleOHLCData(symbol, hours = 24) {
  const data = [];
  const now = new Date();
  const points = Math.min(hours, SAMPLE_SIZE);
  
  // Generate base price based on symbol
  let basePrice;
  switch (symbol) {
    case 'BTCUSDT': basePrice = 45000; break;
    case 'ETHUSDT': basePrice = 3000; break;
    case 'BNBUSDT': basePrice = 300; break;
    case 'SOLUSDT': basePrice = 100; break;
    case 'XRPUSDT': basePrice = 0.5; break;
    default: basePrice = 1000;
  }
  
  for (let i = points; i > 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // One data point per hour
    const open = basePrice * (1 + (Math.random() - 0.5) * 0.1);
    const high = open * (1 + Math.random() * 0.05);
    const low = open * (1 - Math.random() * 0.05);
    const close = low + Math.random() * (high - low);
    const volume = basePrice * 10 * (1 + Math.random() * 5);
    
    data.push({
      bucket: timestamp.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });
  }
  
  return data;
}

// Generate sample price history
function generateSamplePriceHistory(symbol, points = 50) {
  const history = [];
  const now = new Date();
  
  // Generate base price based on symbol
  let basePrice;
  switch (symbol) {
    case 'BTCUSDT': basePrice = 45000; break;
    case 'ETHUSDT': basePrice = 3000; break;
    case 'BNBUSDT': basePrice = 300; break;
    case 'SOLUSDT': basePrice = 100; break;
    case 'XRPUSDT': basePrice = 0.5; break;
    default: basePrice = 1000;
  }
  
  for (let i = points; i > 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 1000); // One data point per minute
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.05);
    const volume = basePrice * 10 * (1 + Math.random() * 2);
    
    history.push({
      symbol: symbol,
      price: parseFloat(price.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
      timestamp: timestamp.toISOString()
    });
  }
  
  return history;
}

// Import sample data
async function importSampleData() {
  console.log('Generating sample data for QuantFlow dashboard...');
  
  try {
    for (const symbol of SYMBOLS) {
      console.log(`Generating data for ${symbol}...`);
      
      // Generate and import OHLC data
      const ohlcData = generateSampleOHLCData(symbol, 24);
      console.log(`  Generated ${ohlcData.length} OHLC data points`);
      
      // In a real implementation, we would import this data
      // For now, we'll just log it
      console.log(`  Sample OHLC data for ${symbol}:`, ohlcData.slice(0, 3));
      
      // Generate and import price history
      const historyData = generateSamplePriceHistory(symbol, 50);
      console.log(`  Generated ${historyData.length} history data points`);
      
      // In a real implementation, we would import this data
      // For now, we'll just log it
      console.log(`  Sample history data for ${symbol}:`, historyData.slice(0, 3));
    }
    
    console.log('\nSample data generation completed!');
    console.log('In a full implementation, this script would import the data into the database.');
    console.log('For now, the dashboard will use simulated data.');
    
  } catch (error) {
    console.error('Error generating sample data:', error.message);
    process.exit(1);
  }
}

// Update the dashboard to use simulated data
function updateDashboardForSimulatedData() {
  const dashboardPath = path.join(__dirname, '..', 'public', 'advanced-dashboard.html');
  
  if (!fs.existsSync(dashboardPath)) {
    console.error('Dashboard file not found:', dashboardPath);
    return;
  }
  
  let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Add a flag to indicate we're using simulated data
  if (!dashboardContent.includes('window.useSimulatedData')) {
    dashboardContent = dashboardContent.replace(
      '</script>\n</body>',
      `
window.useSimulatedData = true;

// Generate simulated OHLC data
window.generateSimulatedOHLCData = function(symbol, hours = 24) {
  const data = [];
  const now = new Date();
  const points = Math.min(hours, 100);
  
  // Generate base price based on symbol
  let basePrice;
  switch (symbol) {
    case 'BTCUSDT': basePrice = 45000; break;
    case 'ETHUSDT': basePrice = 3000; break;
    case 'BNBUSDT': basePrice = 300; break;
    case 'SOLUSDT': basePrice = 100; break;
    case 'XRPUSDT': basePrice = 0.5; break;
    default: basePrice = 1000;
  }
  
  for (let i = points; i > 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const open = basePrice * (1 + (Math.random() - 0.5) * 0.1);
    const high = open * (1 + Math.random() * 0.05);
    const low = open * (1 - Math.random() * 0.05);
    const close = low + Math.random() * (high - low);
    const volume = basePrice * 10 * (1 + Math.random() * 5);
    
    data.push({
      bucket: timestamp.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });
  }
  
  return data;
};

// Generate simulated indicators data
window.generateSimulatedIndicators = function(symbol, points = 20) {
  const data = {
    symbol: symbol,
    timestamp: new Date().toISOString(),
    indicators: {
      rsi: Array.from({length: points}, () => Math.random() * 100),
      macd: Array.from({length: points}, () => (Math.random() - 0.5) * 2),
      macdSignal: Array.from({length: points}, () => (Math.random() - 0.5) * 2),
      macdHistogram: Array.from({length: points}, () => (Math.random() - 0.5) * 2),
      bollingerUpper: Array.from({length: points}, () => 50 + Math.random() * 20),
      bollingerMiddle: Array.from({length: points}, () => 50),
      bollingerLower: Array.from({length: points}, () => 50 - Math.random() * 20)
    }
  };
  
  return data;
};

// Generate simulated strategy comparison data
window.generateSimulatedStrategyComparison = function(symbol, strategies, initialCapital = 10000) {
  const results = strategies.map(strategyName => {
    const portfolio = [];
    const baseValue = initialCapital;
    
    // Generate 30 days of portfolio data
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      
      // Simulate portfolio growth/decline
      const dailyChange = (Math.random() - 0.4) * 0.1; // -40% to +60% daily change potential
      const previousValue = portfolio.length > 0 ? portfolio[portfolio.length - 1].portfolioValue : baseValue;
      const currentValue = previousValue * (1 + dailyChange);
      
      portfolio.push({
        time: date.toISOString(),
        portfolioValue: parseFloat(currentValue.toFixed(2)),
        positions: []
      });
    }
    
    // Generate metrics
    const totalReturn = ((portfolio[portfolio.length - 1].portfolioValue - baseValue) / baseValue) * 100;
    const sharpeRatio = (Math.random() * 3).toFixed(2);
    const maxDrawdown = (Math.random() * 20).toFixed(2);
    const winRate = (Math.random() * 100).toFixed(2);
    
    return {
      strategy: strategyName,
      metrics: {
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        sharpeRatio: parseFloat(sharpeRatio),
        maxDrawdown: parseFloat(maxDrawdown),
        winRate: parseFloat(winRate),
        totalTrades: Math.floor(Math.random() * 50) + 10
      },
      results: {
        portfolio: portfolio
      }
    };
  });
  
  return {
    symbol: symbol,
    initialCapital: initialCapital,
    results: results
  };
};

// Generate simulated correlation data
window.generateSimulatedCorrelation = function() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
  const matrix = [];
  
  // Generate correlation matrix
  for (let i = 0; i < symbols.length; i++) {
    const row = [];
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        row.push(1.0);
      } else {
        // Generate correlation between -1 and 1
        row.push((Math.random() * 2 - 1).toFixed(2));
      }
    }
    matrix.push(row);
  }
  
  return {
    symbols: symbols,
    correlationMatrix: matrix
  };
};
</script>\n</body>`
    );
    
    // Update the loadPriceData function to use simulated data
    dashboardContent = dashboardContent.replace(
      /async function loadPriceData\(symbol, timeframe\) \{[\s\S]*?\}/,
      `async function loadPriceData(symbol, timeframe) {
    try {
      showLoading('priceChart');
      
      // Use simulated data if flag is set
      if (window.useSimulatedData) {
        // Convert timeframe to hours for API
        const hoursMap = {
          '1h': 1,
          '4h': 4,
          '1d': 24,
          '1w': 168,
          '1m': 720
        };
        
        const hours = hoursMap[timeframe] || 24;
        const data = window.generateSimulatedOHLCData(symbol, hours);
        
        // Update price chart
        const priceLabels = data.map(item => new Date(item.bucket));
        const prices = data.map(item => item.close);
        
        priceChart.data.labels = priceLabels;
        priceChart.data.datasets[0].data = prices;
        priceChart.update();
        
        // Update volume chart
        const volumes = data.map(item => item.volume);
        
        volumeChart.data.labels = priceLabels;
        volumeChart.data.datasets[0].data = volumes;
        volumeChart.update();
        
        return;
      }
      
      // Convert timeframe to hours for API
      const hoursMap = {
        '1h': 1,
      '4h': 4,
      '1d': 24,
      '1w': 168,
      '1m': 720
      };
      
      const hours = hoursMap[timeframe] || 24;
      
      const response = await fetch(\`\${API_BASE}/chart/ohlc/\${symbol}?hours=\${hours}\`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch price data');
      
      // Update price chart
      const priceLabels = data.map(item => new Date(item.bucket));
      const prices = data.map(item => item.close);
      
      priceChart.data.labels = priceLabels;
      priceChart.data.datasets[0].data = prices;
      priceChart.update();
      
      // Update volume chart
      const volumes = data.map(item => item.volume);
      
      volumeChart.data.labels = priceLabels;
      volumeChart.data.datasets[0].data = volumes;
      volumeChart.update();
      
    } catch (error) {
      console.error('Error loading price data:', error);
      showError('priceChart', 'Failed to load price data');
    }
  }`
    );
    
    // Update the loadIndicators function to use simulated data
    dashboardContent = dashboardContent.replace(
      /async function loadIndicators\(symbol\) \{[\s\S]*?\}/,
      `async function loadIndicators(symbol) {
    try {
      showLoading('indicatorsChart');
      
      // Use simulated data if flag is set
      if (window.useSimulatedData) {
        const data = window.generateSimulatedIndicators(symbol);
        
        // Create labels for the data points
        const labels = Array.from({length: 20}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (20 - i));
          return date;
        });
        
        const rsiData = data.indicators.rsi;
        const macdData = data.indicators.macd;
        
        indicatorsChart.data.labels = labels;
        indicatorsChart.data.datasets[0].data = rsiData;
        indicatorsChart.data.datasets[1].data = macdData;
        indicatorsChart.update();
        
        return;
      }
      
      const response = await fetch(\`\${API_BASE}/indicators/\${symbol}\`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch indicators');
      
      // For simplicity, we'll create some dummy data points
      const labels = Array.from({length: 20}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (20 - i));
        return date;
      });
      
      const rsiData = Array.from({length: 20}, () => Math.random() * 100);
      const macdData = Array.from({length: 20}, () => (Math.random() - 0.5) * 2);
      
      indicatorsChart.data.labels = labels;
      indicatorsChart.data.datasets[0].data = rsiData;
      indicatorsChart.data.datasets[1].data = macdData;
      indicatorsChart.update();
      
    } catch (error) {
      console.error('Error loading indicators:', error);
      showError('indicatorsChart', 'Failed to load indicators');
    }
  }`
    );
    
    // Update the runStrategyComparison function to use simulated data
    dashboardContent = dashboardContent.replace(
      /async function runStrategyComparison\(\) \{[\s\S]*?\}/,
      `async function runStrategyComparison() {
    const symbol = symbolSelect.value;
    const selectedStrategies = Array.from(strategySelect.selectedOptions).map(option => option.value);
    const initialCapital = parseFloat(capitalInput.value) || 10000;
    
    if (!symbol || selectedStrategies.length === 0) {
      alert('Please select a symbol and at least one strategy');
      return;
    }
    
    try {
      showLoading('strategyComparisonChart');
      showLoading('strategyMetrics');
      
      // Use simulated data if flag is set
      if (window.useSimulatedData) {
        const data = window.generateSimulatedStrategyComparison(symbol, selectedStrategies, initialCapital);
        
        // Process results
        updateStrategyComparisonChart(data.results);
        updateStrategyMetrics(data.results);
        
        return;
      }
      
      // Prepare strategy configurations
      const strategies = selectedStrategies.map(name => ({
        name: name,
        options: {}
      }));
      
      const response = await fetch(\`\${API_BASE}/strategy/compare\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol,
          strategies: strategies,
          initialCapital: initialCapital
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to run strategy comparison');
      
      // Process results
      updateStrategyComparisonChart(data.results);
      updateStrategyMetrics(data.results);
      
    } catch (error) {
      console.error('Error running strategy comparison:', error);
      showError('strategyComparisonChart', 'Failed to run strategy comparison');
      showError('strategyMetrics', 'Failed to load strategy metrics');
    }
  }`
    );
    
    // Update the calculateCorrelation function to use simulated data
    dashboardContent = dashboardContent.replace(
      /async function calculateCorrelation\(\) \{[\s\S]*?\}/,
      `async function calculateCorrelation() {
    try {
      showLoading('correlationMatrix');
      showLoading('correlationHeatmap');
      
      // Use simulated data if flag is set
      if (window.useSimulatedData) {
        const data = window.generateSimulatedCorrelation();
        
        updateCorrelationMatrix(data);
        updateCorrelationHeatmap(data);
        
        return;
      }
      
      const response = await fetch(\`\${API_BASE}/correlation\`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to calculate correlation');
      
      updateCorrelationMatrix(data);
      updateCorrelationHeatmap(data);
      
    } catch (error) {
      console.error('Error calculating correlation:', error);
      showError('correlationMatrix', 'Failed to calculate correlation');
      showError('correlationHeatmap', 'Failed to generate correlation heatmap');
    }
  }`
    );
    
    fs.writeFileSync(dashboardPath, dashboardContent);
    console.log('Dashboard updated to support simulated data!');
  }
}

// Main function
async function main() {
  console.log('QuantFlow Sample Data Generator');
  console.log('==============================\n');
  
  // Generate sample data
  await importSampleData();
  
  // Update dashboard to use simulated data
  updateDashboardForSimulatedData();
  
  console.log('\nTo use the dashboard with simulated data:');
  console.log('1. Open http://localhost:3001/advanced-dashboard.html in your browser');
  console.log('2. The dashboard will now show sample data even without real data collection');
  console.log('3. All features (charts, strategy comparison, correlation analysis) will work');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  generateSampleOHLCData,
  generateSamplePriceHistory,
  importSampleData
};