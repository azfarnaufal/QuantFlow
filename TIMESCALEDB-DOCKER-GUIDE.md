# TimescaleDB with Docker Guide

This guide explains how to use TimescaleDB with the crypto price tracker in Docker containers.

## Docker Configuration

The `docker-compose.yml` file includes a TimescaleDB service based on the official TimescaleDB image. The configuration includes:

1. **TimescaleDB Service**:
   - Uses the `timescale/timescaledb:latest-pg15` image
   - Exposes port 5432 for external access
   - Sets up environment variables for database, user, and password
   - Includes volume persistence for data
   - Uses an initialization script to set up the database schema

2. **Crypto Price Tracker Service**:
   - Configured to use TimescaleDB as storage by default
   - Environment variables point to the TimescaleDB service
   - Depends on the TimescaleDB service to ensure proper startup order

## Starting the Services

To start all services including TimescaleDB:

```bash
docker-compose up -d
```

This will start:
- TimescaleDB database
- Crypto price tracker (using TimescaleDB storage)
- Node-RED integration service
- Node-RED UI

## Accessing the Services

Once running, you can access:

1. **Crypto Price Tracker API**: http://localhost:3000
2. **Node-RED Integration**: http://localhost:3001
3. **Node-RED UI**: http://localhost:1880
4. **TimescaleDB**: localhost:5432 (PostgreSQL connection)

## Connecting to TimescaleDB

You can connect to the TimescaleDB instance using any PostgreSQL client:

```bash
# Using psql from the command line
psql -h localhost -p 5432 -U postgres -d crypto_prices
```

Default credentials:
- Host: localhost
- Port: 5432
- Database: crypto_prices
- User: postgres
- Password: postgres

## Database Schema

The initialization script creates:

1. **prices table** with columns:
   - time (TIMESTAMPTZ)
   - symbol (TEXT)
   - price (DECIMAL)
   - volume (DECIMAL)

2. **Hypertable** for optimized time-series queries
3. **Index** on symbol and time for faster queries

## Querying Data

Example queries to explore your stored data:

```sql
-- Get all data for a specific symbol
SELECT * FROM prices WHERE symbol = 'BTCUSDT' ORDER BY time DESC LIMIT 10;

-- Get price history for the last 24 hours
SELECT * FROM prices 
WHERE symbol = 'BTCUSDT' 
AND time >= NOW() - INTERVAL '24 hours'
ORDER BY time DESC;

-- Get distinct symbols
SELECT DISTINCT symbol FROM prices ORDER BY symbol;
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure all services are running:
   ```bash
   docker-compose ps
   ```

2. **Database Not Initialized**: Check the TimescaleDB container logs:
   ```bash
   docker-compose logs timescaledb
   ```

3. **Permission Issues**: Ensure the volume has proper permissions:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Resetting the Database

To start with a clean database:

```bash
docker-compose down -v
docker-compose up -d
```

The `-v` flag removes the volumes, clearing all stored data.

## Customization

To customize the TimescaleDB configuration:

1. Modify environment variables in `docker-compose.yml`
2. Update the initialization script in `init-timescaledb.sql`
3. Adjust the connection settings in `timescaledb-storage.js`

## Using Only TimescaleDB (without other services)

If you want to run only the TimescaleDB service:

```bash
docker-compose up -d timescaledb
```

This is useful for development or when connecting with external applications.