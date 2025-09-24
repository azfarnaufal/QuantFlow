const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy middleware for each service
const dataIngestionProxy = createProxyMiddleware({
  target: 'http://data-ingestion:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/data': '', // remove /api/data prefix
  },
});

const storageProxy = createProxyMiddleware({
  target: 'http://storage:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/storage': '', // remove /api/storage prefix
  },
});

const analysisProxy = createProxyMiddleware({
  target: 'http://analysis:3003',
  changeOrigin: true,
  pathRewrite: {
    '^/api/analysis': '', // remove /api/analysis prefix
  },
});

const tradingProxy = createProxyMiddleware({
  target: 'http://trading:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/trading': '', // remove /api/trading prefix
  },
});

const aiAgentProxy = createProxyMiddleware({
  target: 'http://ai-agent:3005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/ai': '', // remove /api/ai prefix
  },
});

// Route requests to appropriate services
app.use('/api/data', dataIngestionProxy);
app.use('/api/storage', storageProxy);
app.use('/api/analysis', analysisProxy);
app.use('/api/trading', tradingProxy);
app.use('/api/ai', aiAgentProxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'API Gateway is running',
    timestamp: new Date().toISOString()
  });
});

// Main dashboard route
app.get('/', (req, res) => {
  res.send(`
    <h1>QuantFlow API Gateway</h1>
    <p>Microservices Architecture:</p>
    <ul>
      <li><a href="/api/data/health">Data Ingestion Service</a></li>
      <li><a href="/api/storage/health">Storage Service</a></li>
      <li><a href="/api/analysis/health">Analysis Service</a></li>
      <li><a href="/api/trading/health">Trading Service</a></li>
      <li><a href="/api/ai/health">AI Agent Service</a></li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}`);
});