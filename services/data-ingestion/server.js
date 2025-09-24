const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const KafkaEventBus = require('../event-bus/kafka-client');

// Load config
const config = require('../../src/config/config.json');

class DataIngestionService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.eventBus = new KafkaEventBus();
    this.wsClients = new Map();
  }

  async initialize() {
    // Connect to event bus
    await this.eventBus.connect();
    
    // Initialize Express middleware
    this.app.use(express.json());
    
    // Define routes
    this.setupRoutes();
    
    // Start WebSocket connections
    this.startWebSocketConnections();
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        service: 'data-ingestion',
        timestamp: new Date().toISOString()
      });
    });

    // Get tracked symbols
    this.app.get('/symbols', (req, res) => {
      res.json({ symbols: config.symbolsToTrack });
    });

    // WebSocket connection test endpoint
    this.app.get('/ws-status', (req, res) => {
      const status = {};
      for (const [symbol, client] of this.wsClients.entries()) {
        status[symbol] = {
          readyState: client.readyState,
          connected: client.readyState === WebSocket.OPEN
        };
      }
      res.json(status);
    });
  }

  startWebSocketConnections() {
    // Connect to Binance for each symbol
    config.symbolsToTrack.forEach(symbol => {
      this.connectToBinance(symbol);
    });
  }

  connectToBinance(symbol) {
    const wsUrl = config.binanceWsUrl;
    console.log(`Connecting to Binance for ${symbol} at ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    this.wsClients.set(symbol, ws);
    
    ws.on('open', () => {
      console.log(`WebSocket connected for ${symbol}`);
      
      // Subscribe to aggregate trades
      const subscriptionMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@aggTrade`],
        id: Date.now()
      };
      
      ws.send(JSON.stringify(subscriptionMessage));
    });
    
    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data);
        
        if (parsed.e === 'aggTrade') {
          // Process trade data
          const tradeData = {
            symbol: parsed.s,
            price: parseFloat(parsed.p),
            volume: parseFloat(parsed.q),
            timestamp: parsed.T,
            eventType: 'trade'
          };
          
          // Publish to event bus
          await this.eventBus.publish('market-data', tradeData);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${symbol}:`, error);
    });
    
    ws.on('close', () => {
      console.log(`WebSocket connection closed for ${symbol}`);
      // Attempt to reconnect
      setTimeout(() => {
        this.connectToBinance(symbol);
      }, 5000);
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Data Ingestion Service running at http://localhost:${this.port}`);
    });
  }
}

// Initialize and start service
async function startService() {
  const service = new DataIngestionService();
  await service.initialize();
  service.start();
}

startService().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Data Ingestion Service...');
  process.exit(0);
});