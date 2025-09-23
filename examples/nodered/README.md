# Node-RED Flow Examples

This directory contains example Node-RED flows that demonstrate how to integrate with the QuantFlow API.

## Prerequisites

1. Node-RED installed (included in the docker-compose setup)
2. QuantFlow server running
3. Access to the Node-RED interface at http://localhost:1880

## Example Flows

### 1. Price Monitor Flow

This flow monitors cryptocurrency prices and sends notifications when significant changes occur.

### 2. Backtesting Automation Flow

This flow automates the process of running backtests for different strategies and symbols.

### 3. Alert System Flow

This flow creates custom alerts based on technical indicators and market conditions.

## How to Use

1. Open Node-RED at http://localhost:1880
2. Import the desired flow JSON file
3. Configure the flow parameters as needed
4. Deploy the flow

## Customization

You can modify these flows to:
- Add new notification channels (Slack, Discord, etc.)
- Implement custom trading strategies
- Create advanced data visualization dashboards
- Integrate with external APIs