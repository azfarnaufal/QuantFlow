#!/usr/bin/env node

/**
 * Network Troubleshooting Script for QuantFlow
 * 
 * This script helps diagnose connectivity issues with Binance WebSocket APIs
 * and provides recommendations for fixing network problems.
 */

const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load config
let config;
try {
  const configPath = path.join(__dirname, '../src/config/config.staging.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    const rootConfigPath = path.join(__dirname, '../config.staging.json');
    if (fs.existsSync(rootConfigPath)) {
      config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
    } else {
      config = {
        binanceWsUrl: 'wss://fstream.binance.com/ws',
        symbolsToTrack: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']
      };
    }
  }
} catch (error) {
  console.error('Error loading config:', error);
  config = {
    binanceWsUrl: 'wss://fstream.binance.com/ws',
    symbolsToTrack: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']
  };
}

// Binance WebSocket URLs to test
const BINANCE_WS_URLS = [
  config.binanceWsUrl, // Primary: wss://fstream.binance.com/ws
  'wss://fstream.binance.com/stream', // Alternative 1
  'wss://dstream.binance.com/ws', // Alternative 2 (delivery futures)
  'wss://dstream.binance.com/stream', // Alternative 3 (delivery futures)
  'wss://ws-api.binance.com/ws-api/v3', // Alternative 4
  'wss://nbstream.binance.com/ws' // Alternative 5
];

// HTTP endpoints to test
const BINANCE_HTTP_URLS = [
  'https://fapi.binance.com/fapi/v1/ping',
  'https://api.binance.com/api/v3/ping',
  'https://fstream.binance.com/ws',
  'https://dstream.binance.com/ws'
];

/**
 * Test HTTP connectivity to a URL
 * @param {string} url - URL to test
 * @returns {Promise<Object>} Test result
 */
function testHttpConnectivity(url) {
  return new Promise((resolve) => {
    console.log(`Testing HTTP connectivity to: ${url}`);
    
    const startTime = Date.now();
    const req = https.get(url, (res) => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`  ✓ HTTP ${res.statusCode} - Latency: ${latency}ms`);
      resolve({
        url,
        success: true,
        statusCode: res.statusCode,
        latency,
        timestamp: new Date().toISOString()
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`  ✗ HTTP Error: ${error.message} - Time: ${latency}ms`);
      resolve({
        url,
        success: false,
        error: error.message,
        latency,
        timestamp: new Date().toISOString()
      });
    });
    
    req.setTimeout(10000, () => {
      console.log(`  ✗ HTTP Timeout after 10s`);
      req.destroy();
      resolve({
        url,
        success: false,
        error: 'Timeout',
        latency: 10000,
        timestamp: new Date().toISOString()
      });
    });
  });
}

/**
 * Test WebSocket connectivity to a URL
 * @param {string} url - URL to test
 * @returns {Promise<Object>} Test result
 */
function testWebSocketConnectivity(url) {
  return new Promise((resolve) => {
    console.log(`Testing WebSocket connectivity to: ${url}`);
    
    const startTime = Date.now();
    
    // Add connection options to help with networking issues
    const wsOptions = {
      handshakeTimeout: 10000,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      perMessageDeflate: false
    };
    
    try {
      const ws = new WebSocket(url, wsOptions);
      
      ws.on('open', () => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`  ✓ WebSocket Connected - Latency: ${latency}ms`);
        ws.close();
        resolve({
          url,
          success: true,
          latency,
          timestamp: new Date().toISOString()
        });
      });
      
      ws.on('error', (error) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`  ✗ WebSocket Error: ${error.message} - Time: ${latency}ms`);
        resolve({
          url,
          success: false,
          error: error.message,
          latency,
          timestamp: new Date().toISOString()
        });
      });
      
      ws.on('close', () => {
        // Connection closed normally after successful open
      });
      
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`  ✗ WebSocket Exception: ${error.message} - Time: ${latency}ms`);
      resolve({
        url,
        success: false,
        error: error.message,
        latency,
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Test subscription to a symbol
 * @param {string} url - WebSocket URL
 * @param {string} symbol - Symbol to subscribe to
 * @returns {Promise<Object>} Test result
 */
function testSymbolSubscription(url, symbol) {
  return new Promise((resolve) => {
    console.log(`Testing symbol subscription: ${symbol} on ${url}`);
    
    const startTime = Date.now();
    
    // Add connection options
    const wsOptions = {
      handshakeTimeout: 10000,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      perMessageDeflate: false
    };
    
    try {
      const ws = new WebSocket(url, wsOptions);
      let subscriptionConfirmed = false;
      
      ws.on('open', () => {
        // Send subscription message
        const subscribeMsg = {
          method: 'SUBSCRIBE',
          params: [`${symbol.toLowerCase()}@ticker`],
          id: Date.now()
        };
        
        ws.send(JSON.stringify(subscribeMsg));
        console.log(`  Sent subscription for ${symbol}`);
      });
      
      ws.on('message', (data) => {
        try {
          const jsonData = JSON.parse(data);
          
          // Check if this is a subscription confirmation
          if (jsonData.id && !subscriptionConfirmed) {
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            console.log(`  ✓ Symbol subscription confirmed - Latency: ${latency}ms`);
            subscriptionConfirmed = true;
            ws.close();
            resolve({
              url,
              symbol,
              success: true,
              latency,
              timestamp: new Date().toISOString()
            });
          }
          
          // Check if this is ticker data
          if (jsonData.e === '24hrTicker' && jsonData.s === symbol) {
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            console.log(`  ✓ Received ticker data for ${symbol} - Price: ${jsonData.c}`);
            subscriptionConfirmed = true;
            ws.close();
            resolve({
              url,
              symbol,
              success: true,
              price: jsonData.c,
              latency,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Not JSON data, ignore
        }
      });
      
      ws.on('error', (error) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`  ✗ Subscription Error: ${error.message}`);
        resolve({
          url,
          symbol,
          success: false,
          error: error.message,
          latency,
          timestamp: new Date().toISOString()
        });
      });
      
      // Timeout after 15 seconds
      setTimeout(() => {
        if (!subscriptionConfirmed) {
          console.log(`  ✗ Subscription Timeout after 15s`);
          ws.close();
          resolve({
            url,
            symbol,
            success: false,
            error: 'Subscription timeout',
            latency: 15000,
            timestamp: new Date().toISOString()
          });
        }
      }, 15000);
      
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`  ✗ Subscription Exception: ${error.message}`);
      resolve({
        url,
        symbol,
        success: false,
        error: error.message,
        latency,
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Generate troubleshooting report
 * @param {Array} httpResults - HTTP test results
 * @param {Array} wsResults - WebSocket test results
 * @param {Array} subscriptionResults - Subscription test results
 */
function generateReport(httpResults, wsResults, subscriptionResults) {
  console.log('\n' + '='.repeat(60));
  console.log('QUANTFLOW NETWORK TROUBLESHOOTING REPORT');
  console.log('='.repeat(60));
  
  // HTTP Connectivity Summary
  console.log('\n1. HTTP CONNECTIVITY TESTS:');
  console.log('-'.repeat(30));
  const successfulHttp = httpResults.filter(r => r.success);
  const failedHttp = httpResults.filter(r => !r.success);
  
  if (successfulHttp.length > 0) {
    console.log('✓ Successful HTTP connections:');
    successfulHttp.forEach(result => {
      console.log(`  ${result.url} - ${result.statusCode} (${result.latency}ms)`);
    });
  }
  
  if (failedHttp.length > 0) {
    console.log('✗ Failed HTTP connections:');
    failedHttp.forEach(result => {
      console.log(`  ${result.url} - ${result.error} (${result.latency}ms)`);
    });
  }
  
  // WebSocket Connectivity Summary
  console.log('\n2. WEBSOCKET CONNECTIVITY TESTS:');
  console.log('-'.repeat(35));
  const successfulWs = wsResults.filter(r => r.success);
  const failedWs = wsResults.filter(r => !r.success);
  
  if (successfulWs.length > 0) {
    console.log('✓ Successful WebSocket connections:');
    successfulWs.forEach(result => {
      console.log(`  ${result.url} (${result.latency}ms)`);
    });
  }
  
  if (failedWs.length > 0) {
    console.log('✗ Failed WebSocket connections:');
    failedWs.forEach(result => {
      console.log(`  ${result.url} - ${result.error} (${result.latency}ms)`);
    });
  }
  
  // Symbol Subscription Summary
  console.log('\n3. SYMBOL SUBSCRIPTION TESTS:');
  console.log('-'.repeat(30));
  const successfulSubs = subscriptionResults.filter(r => r.success);
  const failedSubs = subscriptionResults.filter(r => !r.success);
  
  if (successfulSubs.length > 0) {
    console.log('✓ Successful symbol subscriptions:');
    successfulSubs.forEach(result => {
      if (result.price) {
        console.log(`  ${result.symbol}@${result.url} - Price: ${result.price} (${result.latency}ms)`);
      } else {
        console.log(`  ${result.symbol}@${result.url} (${result.latency}ms)`);
      }
    });
  }
  
  if (failedSubs.length > 0) {
    console.log('✗ Failed symbol subscriptions:');
    failedSubs.forEach(result => {
      console.log(`  ${result.symbol}@${result.url} - ${result.error} (${result.latency}ms)`);
    });
  }
  
  // Recommendations
  console.log('\n4. RECOMMENDATIONS:');
  console.log('-'.repeat(18));
  
  if (successfulHttp.length === 0 && failedHttp.length > 0) {
    console.log('• Network connectivity issues detected');
    console.log('  - Check your firewall settings');
    console.log('  - Verify DNS resolution');
    console.log('  - Test from a different network if possible');
  }
  
  if (successfulWs.length === 0 && failedWs.length > 0) {
    console.log('• WebSocket connectivity issues detected');
    console.log('  - Corporate networks may block WebSocket connections');
    console.log('  - Try using a VPN or different network');
    console.log('  - Check proxy settings if applicable');
  }
  
  if (successfulSubs.length === 0 && failedSubs.length > 0) {
    console.log('• Binance API access issues detected');
    console.log('  - Binance may be blocking requests from your region');
    console.log('  - Try using a different Binance endpoint');
    console.log('  - Check if your IP has been rate-limited');
  }
  
  if (successfulHttp.length > 0 || successfulWs.length > 0 || successfulSubs.length > 0) {
    console.log('• Partial connectivity available');
    console.log('  - Use the working endpoints in your configuration');
    console.log('  - The system should work when connectivity is restored');
  }
  
  console.log('\n5. NEXT STEPS:');
  console.log('-'.repeat(14));
  console.log('• Monitor network connectivity periodically');
  console.log('• Check Binance API status page for service issues');
  console.log('• Review firewall and proxy settings');
  console.log('• Consider using a VPN if regional restrictions apply');
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main function
 */
async function main() {
  console.log('QuantFlow Network Troubleshooting Script');
  console.log('========================================\n');
  
  console.log('Testing network connectivity to Binance APIs...\n');
  
  // Test HTTP connectivity
  console.log('1. Testing HTTP connectivity...');
  const httpResults = [];
  for (const url of BINANCE_HTTP_URLS) {
    const result = await testHttpConnectivity(url);
    httpResults.push(result);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test WebSocket connectivity
  console.log('\n2. Testing WebSocket connectivity...');
  const wsResults = [];
  for (const url of BINANCE_WS_URLS) {
    const result = await testWebSocketConnectivity(url);
    wsResults.push(result);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test symbol subscription (only if WebSocket works)
  console.log('\n3. Testing symbol subscription...');
  const subscriptionResults = [];
  const workingWsUrls = wsResults.filter(r => r.success).slice(0, 2); // Test only first 2 working URLs
  
  if (workingWsUrls.length > 0) {
    const symbol = config.symbolsToTrack[0] || 'BTCUSDT';
    for (const result of workingWsUrls) {
      const subResult = await testSymbolSubscription(result.url, symbol);
      subscriptionResults.push(subResult);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    console.log('  Skipping symbol subscription tests (no working WebSocket connections)');
  }
  
  // Generate report
  generateReport(httpResults, wsResults, subscriptionResults);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  });
}

module.exports = {
  testHttpConnectivity,
  testWebSocketConnectivity,
  testSymbolSubscription,
  generateReport
};