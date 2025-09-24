const BinanceFuturesClient = require('./binance-futures-client');

async function testHistoricalData() {
  const client = new BinanceFuturesClient();
  
  try {
    console.log('Fetching historical data for BTCUSDT (1 hour interval, last 7 days)...');
    
    const klines = await client.getHistoricalKlines('BTCUSDT', '1h', 7);
    
    console.log(`Fetched ${klines.length} klines`);
    
    if (klines.length > 0) {
      console.log('First kline:', klines[0]);
      console.log('Last kline:', klines[klines.length - 1]);
      
      // Show some statistics
      const prices = klines.map(k => k.close);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      console.log(`\nPrice statistics for last 7 days:`);
      console.log(`Min price: $${minPrice.toFixed(2)}`);
      console.log(`Max price: $${maxPrice.toFixed(2)}`);
      console.log(`Avg price: $${avgPrice.toFixed(2)}`);
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
  } finally {
    client.close();
  }
}

testHistoricalData();