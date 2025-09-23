// test-connection.js
// Simple script to test WebSocket connection

const WebSocket = require('ws');

console.log('Testing WebSocket connection to Binance...');

const ws = new WebSocket('wss://fstream.binance.com/ws');

ws.on('open', () => {
  console.log('Successfully connected to Binance WebSocket');
  ws.close();
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('WebSocket connection error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('Connection test timed out');
  ws.close();
  process.exit(1);
}, 10000);