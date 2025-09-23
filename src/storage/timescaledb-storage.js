// TimescaleDB Storage Implementation with Connection Pooling
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load config file
let config;
try {
  // Try to load from src/config directory first (for development)
  const configPath = path.join(__dirname, '../config/config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to root directory (for Docker)
    const rootConfigPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(rootConfigPath)) {
      config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
    } else {
      // Final fallback to src/config directory with absolute path
      const absoluteConfigPath = path.join(process.cwd(), 'src/config/config.json');
      config = JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8'));
    }
  }
} catch (error) {
  console.error('Error loading config file:', error);
  // Use default config if file cannot be loaded
  config = {
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/quantflow',
    dbPoolMax: 20,
    dbPoolMin: 5,
    dbPoolIdleTimeout: 30000,
    dbPoolConnectionTimeout: 2000
  };
}

/**
 * TimescaleDB Storage
 * PostgreSQL/TimescaleDB storage implementation with connection pooling
 */
class TimescaleDBStorage {
  constructor() {
    // Create connection pool for better performance
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || config.databaseUrl,
      max: config.dbPoolMax || 20, // Maximum number of clients in the pool
      min: config.dbPoolMin || 5,  // Minimum number of clients in the pool
      idleTimeoutMillis: config.dbPoolIdleTimeout || 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: config.dbPoolConnectionTimeout || 2000, // Return an error after 2 seconds if connection could not be established
    });
    
    this.initDatabase();
  }

  /**
   * Initialize database tables
   */
  async initDatabase() {
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
      
      // Create indexes for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_prices_symbol_time ON prices (symbol, time DESC);
      `);
      
      console.log('TimescaleDB initialized successfully');
    } catch (error) {
      console.error('Error initializing TimescaleDB:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Store price data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {Object} data - Price data
   */
  async storePriceData(symbol, data) {
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
        data.timestamp,
        symbol,
        data.price,
        data.volume
      ]);
    } catch (error) {
      console.error('Error storing price data:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Get latest price data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} Latest price data
   */
  async getLatestPriceData(symbol) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM prices WHERE symbol = $1 ORDER BY time DESC LIMIT 1',
        [symbol]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting latest price data:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Get price history for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {number} limit - Number of records to return (default: 100)
   * @returns {Array} Historical price data
   */
  async getPriceHistory(symbol, limit = 100) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM prices WHERE symbol = $1 ORDER BY time DESC LIMIT $2',
        [symbol, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Get OHLC data for charting
   * @param {string} symbol - Trading pair symbol
   * @param {number} hours - Number of hours of data to retrieve
   * @returns {Array} OHLC data
   */
  async getOHLCData(symbol, hours = 24) {
    const client = await this.pool.connect();
    try {
      // Calculate time range
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
      return result.rows;
    } catch (error) {
      console.error('Error getting OHLC data:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Get summary of all tracked symbols
   * @returns {Object} Summary of all tracked symbols
   */
  async getSummary() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT ON (symbol) 
          symbol, price, volume, time
        FROM prices 
        ORDER BY symbol, time DESC
      `);
      
      const summary = {};
      result.rows.forEach(row => {
        summary[row.symbol] = {
          price: parseFloat(row.price),
          volume: parseFloat(row.volume),
          timestamp: row.time
        };
      });
      
      return summary;
    } catch (error) {
      console.error('Error getting summary:', error);
      return {};
    } finally {
      client.release();
    }
  }

  /**
   * Get list of all tracked symbols
   * @returns {Array} List of symbols
   */
  async getSymbols() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT DISTINCT symbol FROM prices ORDER BY symbol');
      return result.rows.map(row => row.symbol);
    } catch (error) {
      console.error('Error getting symbols:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Close all database connections
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = TimescaleDBStorage;