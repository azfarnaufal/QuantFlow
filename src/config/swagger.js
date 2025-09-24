const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuantFlow Crypto Trading API',
      version: '1.0.0',
      description: 'Advanced cryptocurrency trading platform with real-time data, technical analysis, and ML strategies',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        PriceData: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              example: 'BTCUSDT',
            },
            price: {
              type: 'number',
              format: 'float',
              example: 45231.23,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00Z',
            },
            volume: {
              type: 'number',
              format: 'float',
              example: 2.5,
            },
          },
        },
        OHLCData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bucket: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T10:00:00Z',
              },
              open: {
                type: 'number',
                format: 'float',
                example: 45231.23,
              },
              high: {
                type: 'number',
                format: 'float',
                example: 45500.00,
              },
              low: {
                type: 'number',
                format: 'float',
                example: 45100.50,
              },
              close: {
                type: 'number',
                format: 'float',
                example: 45350.75,
              },
              volume: {
                type: 'number',
                format: 'float',
                example: 125.5,
              },
            },
          },
        },
        TechnicalIndicators: {
          type: 'object',
          properties: {
            sma: {
              type: 'object',
              properties: {
                period: { type: 'integer', example: 20 },
                value: { type: 'number', format: 'float', example: 45231.23 },
              },
            },
            ema: {
              type: 'object',
              properties: {
                period: { type: 'integer', example: 20 },
                value: { type: 'number', format: 'float', example: 45231.23 },
              },
            },
            rsi: {
              type: 'object',
              properties: {
                period: { type: 'integer', example: 14 },
                value: { type: 'number', format: 'float', example: 55.5 },
              },
            },
            macd: {
              type: 'object',
              properties: {
                macd: { type: 'number', format: 'float', example: 125.5 },
                signal: { type: 'number', format: 'float', example: 110.2 },
                histogram: { type: 'number', format: 'float', example: 15.3 },
              },
            },
            bollingerBands: {
              type: 'object',
              properties: {
                upper: { type: 'number', format: 'float', example: 46000.00 },
                middle: { type: 'number', format: 'float', example: 45231.23 },
                lower: { type: 'number', format: 'float', example: 44500.00 },
              },
            },
          },
        },
        StrategyResult: {
          type: 'object',
          properties: {
            symbol: { type: 'string', example: 'BTCUSDT' },
            strategy: { type: 'string', example: 'simple_moving_average' },
            signals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string', format: 'date-time' },
                  price: { type: 'number', format: 'float' },
                  signal: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
                  cash: { type: 'number', format: 'float' },
                  shares: { type: 'number', format: 'float' },
                  transactionCost: { type: 'number', format: 'float' },
                  portfolioValue: { type: 'number', format: 'float' },
                },
              },
            },
            performance: {
              type: 'object',
              properties: {
                totalReturn: { type: 'number', format: 'float', example: 12.5 },
                winRate: { type: 'number', format: 'float', example: 65.0 },
                sharpeRatio: { type: 'number', format: 'float', example: 1.25 },
                maxDrawdown: { type: 'number', format: 'float', example: 8.5 },
              },
            },
          },
        },
        StrategyComparison: {
          type: 'object',
          properties: {
            symbol: { type: 'string', example: 'BTCUSDT' },
            strategies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'simple_moving_average' },
                  displayName: { type: 'string', example: 'Simple Moving Average' },
                  performance: {
                    type: 'object',
                    properties: {
                      totalReturn: { type: 'number', format: 'float', example: 12.5 },
                      winRate: { type: 'number', format: 'float', example: 65.0 },
                      sharpeRatio: { type: 'number', format: 'float', example: 1.25 },
                      maxDrawdown: { type: 'number', format: 'float', example: 8.5 },
                    },
                  },
                },
              },
            },
          },
        },
        CorrelationMatrix: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: { type: 'string' },
              example: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
            },
            correlationMatrix: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number', format: 'float' },
              },
              example: [
                [1.0, 0.85, 0.65],
                [0.85, 1.0, 0.72],
                [0.65, 0.72, 1.0],
              ],
            },
          },
        },
      },
    },
  },
  apis: ['./server.js', './src/strategies/*.js'], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);
module.exports = specs;