// TimescaleDB integration example
// This would replace the PriceStorage class for persistent storage

const { Client } = require('pg');

class TimescaleDBStorage {
  constructor() {
    // TimescaleDB connection configuration from environment variables
    this.client = new Client({
      host: process.env.TSDB_HOST || 'localhost',
      port: process.env.TSDB_PORT || 5432,
      database: process.env.TSDB_DATABASE || 'crypto_prices',
      user: process.env.TSDB_USER || 'postgres',
      password: process.env.TSDB_PASSWORD || 'postgres',
    });
    
    // Connect to database
    this.connect();
    
    // Create tables if they don't exist
    this.createTables();
  }
  
  async connect() {
    try {
      await this.client.connect();
      console.log('Connected to TimescaleDB');
    } catch (err) {
      console.error('Error connecting to TimescaleDB:', err);
    }
  }
  
  async createTables() {
    try {
      // Create prices table with time-series optimization
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS prices (
          time TIMESTAMPTZ NOT NULL,
          symbol TEXT NOT NULL,
          price DECIMAL NOT NULL,
          volume DECIMAL NOT NULL,
          PRIMARY KEY (time, symbol)
        );
      `);
      
      // Convert to hypertable for TimescaleDB optimization
      // Check if timescaledb extension is installed
      try {
        await this.client.query(`
          CREATE EXTENSION IF NOT EXISTS timescaledb;
        `);
        
        // Convert to hypertable for TimescaleDB optimization
        await this.client.query(`
          SELECT create_hypertable('prices', 'time', if_not_exists => TRUE);
        `);
      } catch (extensionErr) {
        console.log('TimescaleDB extension not available, using regular PostgreSQL table');
      }
      
      // Create indexes for better query performance
      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_prices_symbol_time 
        ON prices (symbol, time DESC);
      `);
      
      console.log('TimescaleDB tables created successfully');
    } catch (err) {
      console.error('Error creating TimescaleDB tables:', err);
    }
  }
  
  async storePriceData(symbol, priceData) {
    try {
      const query = `
        INSERT INTO prices (time, symbol, price, volume)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (time, symbol) 
        DO UPDATE SET 
          price = EXCLUDED.price,
          volume = EXCLUDED.volume;
      `;
      
      const values = [
        priceData.timestamp,
        symbol,
        priceData.price,
        priceData.volume
      ];
      
      await this.client.query(query, values);
      console.log(`Stored price data for ${symbol} at ${priceData.timestamp}`);
    } catch (err) {
      console.error('Error storing price data:', err);
    }
  }
  
  async getLatestPriceData(symbol) {
    try {
      const query = `
        SELECT * FROM prices 
        WHERE symbol = $1 
        ORDER BY time DESC 
        LIMIT 1;
      `;
      
      const result = await this.client.query(query, [symbol]);
      return result.rows[0];
    } catch (err) {
      console.error('Error retrieving price data:', err);
      return null;
    }
  }
  
  async getPriceHistory(symbol, hours = 24) {
    try {
      const query = `
        SELECT * FROM prices 
        WHERE symbol = $1 
        AND time >= NOW() - INTERVAL '${hours} hours'
        ORDER BY time DESC;
      `;
      
      const result = await this.client.query(query, [symbol]);
      return result.rows;
    } catch (err) {
      console.error('Error retrieving price history:', err);
      return [];
    }
  }
  
  async getOHLCData(symbol, interval = '1 hour', hours = 24) {
    try {
      // Check if timescaledb is available for time_bucket function
      const ohlcQuery = `
        SELECT 
          time_bucket('${interval}', time) AS bucket,
          symbol,
          FIRST(price, time) AS open,
          MAX(price) AS high,
          MIN(price) AS low,
          LAST(price, time) AS close,
          SUM(volume) AS volume
        FROM prices
        WHERE symbol = $1
        AND time >= NOW() - INTERVAL '${hours} hours'
        GROUP BY bucket, symbol
        ORDER BY bucket DESC;
      `;
      
      const regularQuery = `
        SELECT 
          DATE_TRUNC('hour', time) AS bucket,
          symbol,
          FIRST_VALUE(price) OVER (PARTITION BY DATE_TRUNC('hour', time) ORDER BY time) AS open,
          MAX(price) AS high,
          MIN(price) AS low,
          FIRST_VALUE(price) OVER (PARTITION BY DATE_TRUNC('hour', time) ORDER BY time DESC) AS close,
          SUM(volume) AS volume
        FROM prices
        WHERE symbol = $1
        AND time >= NOW() - INTERVAL '${hours} hours'
        GROUP BY bucket, symbol
        ORDER BY bucket DESC;
      `;
      
      let result;
      try {
        result = await this.client.query(ohlcQuery, [symbol]);
      } catch (timescaleErr) {
        // Fallback to regular PostgreSQL if time_bucket is not available
        result = await this.client.query(regularQuery, [symbol]);
      }
      
      return result.rows;
    } catch (err) {
      console.error('Error retrieving OHLC data:', err);
      return [];
    }
  }
  
  async getSymbols() {
    try {
      const query = `
        SELECT DISTINCT symbol FROM prices ORDER BY symbol;
      `;
      
      const result = await this.client.query(query);
      return result.rows.map(row => row.symbol);
    } catch (err) {
      console.error('Error retrieving symbols:', err);
      return [];
    }
  }
  
  async close() {
    try {
      await this.client.end();
      console.log('TimescaleDB connection closed');
    } catch (err) {
      console.error('Error closing TimescaleDB connection:', err);
    }
  }
  
  // Get formatted summary of all tracked symbols
  async getSummary() {
    try {
      const query = `
        SELECT DISTINCT ON (symbol) 
          symbol, 
          price, 
          volume, 
          time as timestamp
        FROM prices 
        ORDER BY symbol, time DESC;
      `;
      
      const result = await this.client.query(query);
      const summary = {};
      
      result.rows.forEach(row => {
        summary[row.symbol] = {
          price: parseFloat(row.price),
          volume: parseFloat(row.volume),
          timestamp: row.timestamp
        };
      });
      
      return summary;
    } catch (err) {
      console.error('Error retrieving summary data:', err);
      return {};
    }
  }
}

module.exports = TimescaleDBStorage;