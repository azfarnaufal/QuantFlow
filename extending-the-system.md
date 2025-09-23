# Extending the Crypto Price Tracker

This document explains how to extend the crypto price tracker with additional features and integrations.

## Adding New Symbols

To track additional symbols:

1. Edit `config.json` and add symbols to the `symbolsToTrack` array:
   ```json
   {
     "symbolsToTrack": [
       "BTCUSDT",
       "ETHUSDT",
       "BNBUSDT",
       "SOLUSDT",
       "XRPUSDT",
       "ADAUSDT"  // New symbol
     ]
   }
   ```

2. Restart the application for changes to take effect.

## Adding Technical Indicators

To add technical indicators like moving averages or RSI:

1. Create a new file `technical-indicators.js`:
   ```javascript
   class TechnicalIndicators {
     static calculateSMA(prices, period) {
       if (prices.length < period) return null;
       
       const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
       return sum / period;
     }
     
     static calculateRSI(prices, period = 14) {
       if (prices.length < period + 1) return null;
       
       let gains = 0;
       let losses = 0;
       
       for (let i = prices.length - period; i < prices.length; i++) {
         const change = prices[i] - prices[i - 1];
         if (change > 0) {
           gains += change;
         } else {
           losses -= change;
         }
       }
       
       const avgGain = gains / period;
       const avgLoss = losses / period;
       const rs = avgGain / avgLoss;
       
       return 100 - (100 / (1 + rs));
     }
   }
   
   module.exports = TechnicalIndicators;
   ```

2. Integrate with the price tracker:
   ```javascript
   // In binance-ws-client.js
   const TechnicalIndicators = require('./technical-indicators');
   
   // Add to the price tracking logic
   onPriceUpdate(priceData) {
     // Store the data
     this.storage.storePriceData(priceData.symbol, priceData);
     
     // Calculate indicators
     const history = this.getPriceHistory(priceData.symbol);
     const prices = history.map(item => item.price);
     
     const sma20 = TechnicalIndicators.calculateSMA(prices, 20);
     const rsi14 = TechnicalIndicators.calculateRSI(prices, 14);
     
     // Log the data with indicators
     console.log(`[${priceData.timestamp.toLocaleTimeString()}] ${priceData.symbol}: $${priceData.price.toFixed(2)} | SMA(20): ${sma20 ? sma20.toFixed(2) : 'N/A'} | RSI(14): ${rsi14 ? rsi14.toFixed(2) : 'N/A'}`);
   }
   ```

## Adding Discord Notifications

To add Discord notifications alongside Telegram:

1. Create `discord-notifier.js`:
   ```javascript
   const axios = require('axios');
   
   class DiscordNotifier {
     constructor(webhookUrl) {
       this.webhookUrl = webhookUrl;
     }
   
     async sendPriceAlert(symbol, price, volume, threshold) {
       const message = {
         embeds: [{
           title: '🔔 Price Alert',
           color: 0x0099ff,
           fields: [
             {
               name: 'Symbol',
               value: symbol,
               inline: true
             },
             {
               name: 'Current Price',
               value: `$${price.toFixed(2)}`,
               inline: true
             },
             {
               name: '24h Volume',
               value: volume.toFixed(2),
               inline: true
             },
             {
               name: 'Threshold',
               value: `$${threshold}`,
               inline: true
             }
           ],
           timestamp: new Date().toISOString()
         }]
       };
   
       try {
         await axios.post(this.webhookUrl, message);
         console.log(`Discord alert sent for ${symbol}`);
       } catch (error) {
         console.error('Error sending Discord message:', error.message);
       }
     }
   }
   
   module.exports = DiscordNotifier;
   ```

2. Update the price alert system to support Discord:
   ```javascript
   // In price-alert-system.js
   const DiscordNotifier = require('./discord-notifier');
   
   // Add to constructor
   const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_WEBHOOK_URL';
   this.discordNotifier = new DiscordNotifier(DISCORD_WEBHOOK_URL);
   
   // Update sendPriceAlert method
   async sendPriceAlert(symbol, price, volume, threshold) {
     console.log(`🚨 ALERT: ${symbol} crossed $${threshold} - Current price: $${price.toFixed(2)}`);
     
     // Send Telegram notification
     await this.telegramNotifier.sendPriceAlert(symbol, price, volume, threshold);
     
     // Send Discord notification
     if (DISCORD_WEBHOOK_URL !== 'YOUR_WEBHOOK_URL') {
       await this.discordNotifier.sendPriceAlert(symbol, price, volume, threshold);
     }
   }
   ```

## Adding More Exchanges

To add support for more exchanges:

1. Create a new WebSocket client for the exchange (e.g., `coinbase-ws-client.js`):
   ```javascript
   const WebSocket = require('ws');
   
   class CoinbasePriceTracker {
     constructor() {
       this.ws = null;
       this.reconnectInterval = 5000;
     }
   
     connect() {
       // Implementation for Coinbase WebSocket API
     }
   
     // ... other methods
   }
   
   module.exports = CoinbasePriceTracker;
   ```

2. Update the main application to support multiple exchanges:
   ```javascript
   // In server.js or a new multi-exchange tracker
   const BinanceTracker = require('./binance-ws-client');
   const CoinbaseTracker = require('./coinbase-ws-client');
   
   class MultiExchangeTracker {
     constructor() {
       this.trackers = {
         binance: new BinanceTracker(),
         coinbase: new CoinbaseTracker()
       };
     }
   
     start() {
       Object.values(this.trackers).forEach(tracker => {
         tracker.connect();
       });
     }
   }
   ```

## Adding a Web Dashboard

To add a web dashboard for visualizing price data:

1. Install additional dependencies:
   ```bash
   npm install socket.io chart.js
   ```

2. Create a dashboard server:
   ```javascript
   // dashboard.js
   const express = require('express');
   const http = require('http');
   const socketIo = require('socket.io');
   
   const app = express();
   const server = http.createServer(app);
   const io = socketIo(server);
   
   // Serve static files
   app.use(express.static('public'));
   
   // Handle WebSocket connections
   io.on('connection', (socket) => {
     console.log('Dashboard client connected');
     
     // Send price updates to connected clients
     // This would be integrated with your price tracker
   });
   
   server.listen(3002, () => {
     console.log('Dashboard server running on http://localhost:3002');
   });
   ```

3. Create HTML/JS files for the dashboard in a `public/` directory.

## Adding Database Persistence

To enhance the TimescaleDB integration:

1. Add more sophisticated schema:
   ```sql
   -- Enhanced schema for TimescaleDB
   CREATE TABLE IF NOT EXISTS price_data (
     time TIMESTAMPTZ NOT NULL,
     symbol TEXT NOT NULL,
     price DECIMAL NOT NULL,
     volume DECIMAL NOT NULL,
     open DECIMAL,
     high DECIMAL,
     low DECIMAL,
     close DECIMAL,
     PRIMARY KEY (time, symbol)
   );
   
   SELECT create_hypertable('price_data', 'time', if_not_exists => TRUE);
   
   -- Indexes for better query performance
   CREATE INDEX IF NOT EXISTS idx_symbol_time ON price_data (symbol, time DESC);
   ```

2. Enhance the storage implementation to handle more data points.

## Adding Configuration Management

To make the system more configurable:

1. Create a configuration manager:
   ```javascript
   // config-manager.js
   const fs = require('fs');
   const path = require('path');
   
   class ConfigManager {
     constructor() {
       this.configPath = path.join(__dirname, 'config.json');
       this.config = this.loadConfig();
     }
   
     loadConfig() {
       try {
         const configData = fs.readFileSync(this.configPath, 'utf8');
         return JSON.parse(configData);
       } catch (error) {
         console.error('Error loading config:', error);
         return {};
       }
     }
   
     getConfig() {
       return this.config;
     }
   
     updateConfig(newConfig) {
       this.config = { ...this.config, ...newConfig };
       this.saveConfig();
     }
   
     saveConfig() {
       try {
         fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
       } catch (error) {
         console.error('Error saving config:', error);
       }
     }
   }
   
   module.exports = ConfigManager;
   ```

These extensions will allow you to customize and enhance the crypto price tracker to meet your specific needs while maintaining compatibility with your planned stack of n8n, Huginn, Node-RED, and other tools.