const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuantFlow API',
      version: '1.0.0',
      description: 'Quantitative trading platform with real-time market data, ML predictions, and backtesting engine',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js', './server.js'], // files containing annotations as above
};

const specs = swaggerJsdoc(options);
module.exports = specs;