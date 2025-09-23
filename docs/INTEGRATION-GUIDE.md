# Integration Guide

This guide provides detailed instructions for integrating the Crypto Price Tracker with various workflow automation tools.

## Table of Contents
1. [n8n Integration](#n8n-integration)
2. [Huginn Integration](#huginn-integration)
3. [Node-RED Integration](#node-red-integration)
4. [TimescaleDB Integration](#timescaledb-integration)
5. [Telegram Notifications](#telegram-notifications)

## n8n Integration

### Basic Workflow
The basic n8n workflow ([n8n-example-workflow.json](file:///Users/azfar.naufal/Documents/projects/crypto-price-tracker/n8n-example-workflow.json)) demonstrates simple price checking and Telegram notifications.

### Advanced Workflow
The advanced workflow ([n8n-advanced-workflow.json](file:///Users/azfar.naufal/Documents/projects/crypto-price-tracker/n8n-advanced-workflow.json)) includes:
- Price movement analysis
- Database storage
- Advanced alerting
- Data transformation

### Setup Instructions
1. Install n8n:
   ```bash
   npm install -g n8n
   ```

2. Start n8n:
   ```bash
   n8n
   ```

3. Import the workflow JSON file:
   - Open n8n UI at http://localhost:5678
   - Click "Import from File"
   - Select the workflow JSON file

4. Configure credentials:
   - Add Telegram credentials for notifications
   - Add database credentials for storage

5. Activate the workflow

## Huginn Integration

### Basic Scenario
The basic Huginn scenario ([huginn-example-config.txt](file:///Users/azfar.naufal/Documents/projects/crypto-price-tracker/huginn-example-config.txt)) provides simple price tracking.

### Advanced Scenario
The advanced scenario ([huginn-advanced-scenario.txt](file:///Users/azfar.naufal/Documents/projects/crypto-price-tracker/huginn-advanced-scenario.txt)) includes:
- Multi-agent architecture
- Database schema definition
- Scheduled reporting
- Advanced alerting conditions

### Setup Instructions
1. Install Huginn (Docker recommended):
   ```bash
   docker run -d -p 3000:3000 --name huginn huginn/huginn
   ```

2. Access Huginn at http://localhost:3000
3. Create agents based on the configuration files
4. Set up database tables using the provided schema
5. Configure credentials for Telegram notifications

## Node-RED Integration

### Basic Flow
The basic Node-RED flow ([node-red-example-flow.json](file:///Users/azfar.naufal/Documents/projects/crypto-price-tracker/node-red-example-flow.json)) demonstrates simple price checking.

### Advanced Flows
The advanced flows ([node-red-advanced-flows.json](file:///Users/azfar.naufal/Documents/projects/crypto-price-tracker/node-red-advanced-flows.json)) include:
- Multi-flow architecture
- Price movement analysis
- Database storage preparation
- Trend analysis
- Manual and scheduled triggers

### Setup Instructions
1. Install Node-RED:
   ```bash
   npm install -g node-red
   ```

2. Start Node-RED:
   ```bash
   node-red
   ```

3. Access Node-RED at http://localhost:1880
4. Import the flow JSON file:
   - Click the menu icon
   - Select "Import" → "Clipboard"
   - Paste the JSON content
   - Click "Import"

5. Install required nodes:
   - telegrambot (for Telegram notifications)
   - postgresql (for database storage)

6. Configure nodes with appropriate credentials
7. Deploy the flow

## TimescaleDB Integration

### Setup
1. Install PostgreSQL with TimescaleDB extension
2. Create a database:
   ```sql
   CREATE DATABASE crypto_prices;
   ```

3. Connect to the database and enable TimescaleDB:
   ```sql
   CREATE EXTENSION IF NOT EXISTS timescaledb;
   ```

4. Set environment variables:
   ```bash
   export TSDB_HOST=localhost
   export TSDB_PORT=5432
   export TSDB_DATABASE=crypto_prices
   export TSDB_USER=your_username
   export TSDB_PASSWORD=your_password
   ```

5. Start the TimescaleDB-enabled server:
   ```bash
   npm run server:tsdb
   ```

### Features
- Persistent price data storage
- Time-series optimized tables
- OHLC (Open, High, Low, Close) data generation
- Historical data retrieval
- Symbol management

### API Endpoints
- `GET /history/:symbol` - Get price history
- `GET /ohlc/:symbol` - Get OHLC data for charting
- `GET /symbols` - Get all tracked symbols

## Telegram Notifications

### Setup
1. Create a Telegram bot:
   - Contact @BotFather on Telegram
   - Use `/newbot` command
   - Follow instructions to create a bot
   - Save the bot token

2. Get your chat ID:
   - Send a message to your bot
   - Visit `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response

3. Set environment variables:
   ```bash
   export TELEGRAM_BOT_TOKEN=your_bot_token
   export TELEGRAM_CHAT_ID=your_chat_id
   ```

4. Start the alert system:
   ```bash
   npm run alerts
   ```

### Features
- Real-time price alerts
- Customizable alert thresholds
- Cooldown periods to prevent spam
- Formatted messages with Markdown support

## Integration Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│   Binance API   │◄──►│  Price Tracker App   │◄──►│   REST API       │
│ (WebSocket)     │    │ (binance-ws-client)  │    │ (Port 3000)      │
└─────────────────┘    └──────────────────────┘    └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Node-RED Server  │
                       │   (Port 3001)    │
                       └──────────────────┘
                                │
                                ▼
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
     │    n8n      │   │   Huginn    │   │   Node-RED  │
     └─────────────┘   └─────────────┘   └─────────────┘
              ▲                 ▲                 ▲
              └─────────────────┼─────────────────┘
                                ▼
                       ┌──────────────────┐
                       │   TimescaleDB    │
                       │   (Storage)      │
                       └──────────────────┘
                                ▲
                                │
                       ┌──────────────────┐
                       │   Telegram       │
                       │ Notifications    │
                       └──────────────────┘
```

## Best Practices

1. **Security**
   - Use environment variables for sensitive credentials
   - Implement rate limiting
   - Use HTTPS in production

2. **Performance**
   - Implement caching for frequently accessed data
   - Use connection pooling for database connections
   - Optimize database queries

3. **Reliability**
   - Implement error handling and retries
   - Use health checks
   - Implement graceful shutdown procedures

4. **Monitoring**
   - Log important events
   - Monitor API response times
   - Set up alerting for system issues

## Troubleshooting

### Common Issues
1. **Connection Refused**
   - Ensure the price tracker server is running
   - Check that the correct ports are being used
   - Verify firewall settings

2. **Authentication Errors**
   - Verify credentials are correctly configured
   - Check that environment variables are set
   - Ensure tokens are valid and not expired

3. **Data Not Updating**
   - Check Binance WebSocket connection
   - Verify symbol subscriptions
   - Check for API rate limiting

### Debugging Tips
1. Use the debug nodes in Node-RED to inspect data flow
2. Check n8n execution logs for errors
3. Use Huginn's event log to trace agent execution
4. Enable verbose logging in the price tracker application

## Next Steps

1. Customize alert thresholds for your specific needs
2. Extend the system to track additional cryptocurrencies
3. Implement more sophisticated analysis algorithms
4. Add support for additional notification channels (Discord, Email, SMS)
5. Create dashboards for data visualization
6. Implement machine learning for price prediction