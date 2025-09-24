const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load config
let config;
try {
  const configPath = path.join(__dirname, '../config/config.staging.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    const rootConfigPath = path.join(__dirname, '../../config.staging.json');
    config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading config:', error);
  process.exit(1);
}

// Database connection - use the environment variable if available
const databaseUrl = process.env.DATABASE_URL || config.databaseUrl || 'postgresql://postgres:postgres@timescaledb-staging:5432/quantflow_staging';

// Database connection
const client = new Client({
  connectionString: databaseUrl
});

async function populateSampleData() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create table if it doesn't exist (matching TimescaleDB storage structure)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prices (
        time TIMESTAMPTZ NOT NULL,
        symbol TEXT NOT NULL,
        price DECIMAL NOT NULL,
        volume DECIMAL NOT NULL,
        PRIMARY KEY (time, symbol)
      );
    `);

    // Convert to hypertable for TimescaleDB optimization (if not already)
    try {
      await client.query(`
        SELECT create_hypertable('prices', 'time', if_not_exists => TRUE);
      `);
    } catch (error) {
      // Hypertable might already exist, ignore error
      console.log('Hypertable creation skipped (may already exist)');
    }

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prices_symbol_time ON prices (symbol, time DESC);
    `);

    // Clear existing data
    await client.query('DELETE FROM prices');
    console.log('Cleared existing data');

    // Insert sample data for each symbol
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      for (const symbol of symbols) {
        // Generate realistic price data
        const basePrice = getBasePrice(symbol);
        const price = basePrice + (Math.random() - 0.5) * basePrice * 0.02; // ±1% variation
        const volume = Math.random() * 1000000;
        const timestamp = new Date(now.getTime() - (99 - i) * 60000); // 100 minutes of data
        
        await client.query(
          'INSERT INTO prices (time, symbol, price, volume) VALUES ($1, $2, $3, $4)',
          [timestamp, symbol, price, volume]
        );
      }
    }
    
    console.log('Sample data populated successfully');
    
    // Verify data
    const result = await client.query('SELECT COUNT(*) as count FROM prices');
    console.log(`Total records in database: ${result.rows[0].count}`);
    
    await client.end();
  } catch (error) {
    console.error('Error populating sample data:', error);
    process.exit(1);
  }
}

function getBasePrice(symbol) {
  switch (symbol) {
    case 'BTCUSDT': return 65000;
    case 'ETHUSDT': return 3500;
    case 'BNBUSDT': return 600;
    case 'SOLUSDT': return 150;
    case 'XRPUSDT': return 0.6;
    default: return 1000;
  }
}

// Run the script
populateSampleData();