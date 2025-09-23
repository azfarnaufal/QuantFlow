// Test script for enhanced dashboard features
const WatchlistManager = require('./watchlist-manager');

// Test the watchlist manager
function testWatchlistManager() {
  console.log('Testing Watchlist Manager...\n');
  
  const watchlistManager = new WatchlistManager();
  
  try {
    // Test creating watchlists
    console.log('Testing watchlist creation...');
    watchlistManager.createWatchlist('crypto', ['BTCUSDT', 'ETHUSDT']);
    console.log('✅ Created watchlist "crypto" with BTCUSDT and ETHUSDT');
    
    watchlistManager.createWatchlist('defi', ['SOLUSDT', 'AVAXUSDT']);
    console.log('✅ Created watchlist "defi" with SOLUSDT and AVAXUSDT');
    
    // Test getting watchlists
    console.log('\nTesting watchlist retrieval...');
    const watchlists = watchlistManager.getWatchlists();
    console.log('✅ Retrieved all watchlists:');
    for (const [name, symbols] of Object.entries(watchlists)) {
      console.log(`  ${name}: ${symbols.join(', ')}`);
    }
    
    // Test adding to watchlist
    console.log('\nTesting adding to watchlist...');
    watchlistManager.addToWatchlist('XRPUSDT', 'crypto');
    console.log('✅ Added XRPUSDT to "crypto" watchlist');
    
    // Test removing from watchlist
    console.log('\nTesting removing from watchlist...');
    watchlistManager.removeFromWatchlist('ETHUSDT', 'crypto');
    console.log('✅ Removed ETHUSDT from "crypto" watchlist');
    
    // Test checking if symbol is in watchlist
    console.log('\nTesting watchlist membership...');
    const inWatchlist = watchlistManager.isInWatchlist('BTCUSDT', 'crypto');
    console.log(`✅ BTCUSDT in "crypto" watchlist: ${inWatchlist}`);
    
    // Test updating watchlist
    console.log('\nTesting watchlist update...');
    watchlistManager.updateWatchlist('defi', ['SOLUSDT', 'AVAXUSDT', 'MATICUSDT']);
    console.log('✅ Updated "defi" watchlist');
    
    // Final state
    console.log('\nFinal watchlist state:');
    const finalWatchlists = watchlistManager.getWatchlists();
    for (const [name, symbols] of Object.entries(finalWatchlists)) {
      console.log(`  ${name}: ${symbols.join(', ')}`);
    }
    
    console.log('\n✅ All watchlist tests completed successfully');
  } catch (error) {
    console.error('❌ Error testing watchlist manager:', error);
  }
}

// Run the tests
testWatchlistManager();