const express = require('express');
const { Pool } = require('pg');
const KafkaEventBus = require('../event-bus/kafka-client');

class StorageService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3002;
    this.eventBus = new KafkaEventBus();
    
    // Initialize database connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/quantflow',
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
    });
  }

  async initialize() {
    // Connect to event bus
    await this.eventBus.connect();
    
    // Initialize database
    await this.initializeDatabase();
    
    // Initialize Express middleware
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
    
    // Subscribe to market data events
    await this.subscribeToMarketData();
  }

  async initializeDatabase() {
    const client = await this.pool.connect();
    try {
      // Create prices table with hypertable for TimescaleDB
      await client.query(`
        CREATE TABLE IF NOT EXISTS prices (
          time TIMESTAMPTZ NOT NULL,
          symbol TEXT NOT NULL,
          price DECIMAL NOT NULL,
          volume DECIMAL NOT NULL,
          PRIMARY KEY (time, symbol)
        );
      `);
      
      // Convert to hypertable for TimescaleDB optimization
      await client.query(`
        SELECT create_hypertable('prices', 'time', if_not_exists => TRUE);
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_prices_symbol_time ON prices (symbol, time DESC);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_prices_time ON prices (time DESC);
      `);
      
      console.log('Storage database initialized successfully');
    } catch (error) {
      console.error('Error initializing storage database:', error);
    } finally {
      client.release();
    }
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        service: 'storage',
        timestamp: new Date().toISOString()
      });
    });

    // Get latest price data for a symbol
    this.app.get('/price/:symbol', async (req, res) => {
      try {
        const symbol = req.params.symbol.toUpperCase();
        const client = await this.pool.connect();
        
        try {
          const result = await client.query(
            'SELECT * FROM prices WHERE symbol = $1 ORDER BY time DESC LIMIT 1',
            [symbol]
          );
          
          if (result.rows.length > 0) {
            res.json(result.rows[0]);
          } else {
            res.status(404).json({ error: 'No data found for symbol' });
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error getting latest price:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get price history for a symbol
    this.app.get('/history/:symbol', async (req, res) => {
      try {
        const symbol = req.params.symbol.toUpperCase();
        const limit = parseInt(req.query.limit) || 100;
        const client = await this.pool.connect();
        
        try {
          const result = await client.query(
            'SELECT * FROM prices WHERE symbol = $1 ORDER BY time DESC LIMIT $2',
            [symbol, limit]
          );
          
          res.json(result.rows);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error getting price history:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get OHLC data for charting
    this.app.get('/ohlc/:symbol', async (req, res) => {
      try {
        const symbol = req.params.symbol.toUpperCase();
        const hours = parseInt(req.query.hours) || 24;
        const client = await this.pool.connect();
        
        try {
          const endTime = new Date();
          const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
          
          const query = `
            SELECT 
              time_bucket('1 hour', time) AS bucket,
              FIRST(price, time) AS open,
              MAX(price) AS high,
              MIN(price) AS low,
              LAST(price, time) AS close,
              SUM(volume) AS volume
            FROM prices
            WHERE symbol = $1 AND time >= $2 AND time <= $3
            GROUP BY bucket
            ORDER BY bucket;
          `;
          
          const result = await client.query(query, [symbol, startTime, endTime]);
          res.json(result.rows);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error getting OHLC data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async subscribeToMarketData() {
    await this.eventBus.subscribe('market-data', async (data) => {
      if (data.eventType === 'trade') {
        await this.storePriceData(data);
      }
    });
  }

  async storePriceData(data) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO prices (time, symbol, price, volume)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (time, symbol) 
        DO UPDATE SET 
          price = EXCLUDED.price,
          volume = EXCLUDED.volume;
      `;
      
      await client.query(query, [
        new Date(data.timestamp),
        data.symbol,
        data.price,
        data.volume
      ]);
      
      console.log(`Stored price data for ${data.symbol}`);
    } catch (error) {
      console.error('Error storing price data:', error);
    } finally {
      client.release();
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Storage Service running at http://localhost:${this.port}`);
    });
  }
}

// Initialize and start service
async function startService() {
  const service = new StorageService();
  await service.initialize();
  service.start();
}

startService().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Storage Service...');
  process.exit(0);
});