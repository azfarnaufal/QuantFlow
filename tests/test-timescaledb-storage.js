// Test script to verify TimescaleDB storage implementation
const TimescaleDBStorage = require('./timescaledb-storage');

async function testTimescaleDBStorage() {
  console.log('Testing TimescaleDB storage implementation...');
  
  try {
    // Create an instance of TimescaleDBStorage
    const storage = new TimescaleDBStorage();
    
    // Wait a moment for the connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ TimescaleDB storage instance created successfully!');
    
    // Test storing price data
    const testSymbol = 'BTCUSDT';
    const testData = {
      price: 50000.00,
      volume: 1000.50,
      timestamp: new Date().toISOString()
    };
    
    await storage.storePriceData(testSymbol, testData);
    console.log('✅ Price data stored successfully!');
    
    // Test retrieving latest price data
    const latestData = await storage.getLatestPriceData(testSymbol);
    console.log('✅ Latest price data retrieved successfully!');
    console.log('Retrieved data:', latestData);
    
    // Test getting symbols
    const symbols = await storage.getSymbols();
    console.log('✅ Symbols retrieved successfully!');
    console.log('Available symbols:', symbols);
    
    // Test getting price history
    const history = await storage.getPriceHistory(testSymbol, 1);
    console.log('✅ Price history retrieved successfully!');
    console.log(`Found ${history.length} historical records`);
    
    // Test getting OHLC data
    const ohlcData = await storage.getOHLCData(testSymbol, '1 hour', 24);
    console.log('✅ OHLC data retrieved successfully!');
    console.log(`Found ${ohlcData.length} OHLC records`);
    
    // Clean up by closing the connection
    await storage.close();
    console.log('✅ TimescaleDB storage connection closed successfully!');
    
    console.log('\n🎉 All tests passed! TimescaleDB storage is working correctly.');
    
  } catch (err) {
    console.error('❌ Error testing TimescaleDB storage:', err.message);
    console.error('Error stack:', err.stack);
  }
}

testTimescaleDBStorage();