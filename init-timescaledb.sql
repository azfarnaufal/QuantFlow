-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create the prices table
CREATE TABLE IF NOT EXISTS prices (
  time TIMESTAMPTZ NOT NULL,
  symbol TEXT NOT NULL,
  price DECIMAL NOT NULL,
  volume DECIMAL NOT NULL,
  PRIMARY KEY (time, symbol)
);

-- Convert to hypertable
SELECT create_hypertable('prices', 'time', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prices_symbol_time 
ON prices (symbol, time DESC);