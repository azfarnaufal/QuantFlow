// Test script for Redis cache
const RedisCache = require('../src/core/redis-cache');

async function testRedisCache() {
  console.log('Testing Redis Cache...\n');
  
  try {
    // Create Redis cache instance
    const cache = new RedisCache();
    
    // Wait a moment for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!cache.isConnected) {
      console.log('⚠️  Redis not connected, skipping cache tests');
      return;
    }
    
    console.log('✅ Redis connected successfully\n');
    
    // Test basic set/get operations
    console.log('Testing basic set/get operations...');
    
    const testKey = 'test_key';
    const testValue = { name: 'QuantFlow', version: '1.0', features: ['redis', 'caching', 'performance'] };
    
    // Set value
    await cache.set(testKey, testValue, 10); // 10 seconds TTL
    console.log('✅ Set operation completed');
    
    // Get value
    const retrievedValue = await cache.get(testKey);
    console.log('✅ Get operation completed');
    
    // Verify value
    if (JSON.stringify(retrievedValue) === JSON.stringify(testValue)) {
      console.log('✅ Value retrieved correctly');
    } else {
      console.log('❌ Value mismatch');
      console.log('Expected:', testValue);
      console.log('Received:', retrievedValue);
    }
    
    // Test cache expiration
    console.log('\nTesting cache expiration...');
    await cache.set('expiring_key', 'expiring_value', 2); // 2 seconds TTL
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const expiredValue = await cache.get('expiring_key');
    if (expiredValue === null) {
      console.log('✅ Cache expiration working correctly');
    } else {
      console.log('❌ Cache expiration not working');
    }
    
    // Test deletion
    console.log('\nTesting cache deletion...');
    await cache.set('delete_key', 'delete_value');
    let value = await cache.get('delete_key');
    if (value !== null) {
      console.log('✅ Value set for deletion test');
      
      await cache.del('delete_key');
      value = await cache.get('delete_key');
      if (value === null) {
        console.log('✅ Cache deletion working correctly');
      } else {
        console.log('❌ Cache deletion not working');
      }
    }
    
    // Test flush
    console.log('\nTesting cache flush...');
    await cache.set('flush_key1', 'flush_value1');
    await cache.set('flush_key2', 'flush_value2');
    
    let value1 = await cache.get('flush_key1');
    let value2 = await cache.get('flush_key2');
    if (value1 !== null && value2 !== null) {
      console.log('✅ Values set for flush test');
      
      await cache.flush();
      
      value1 = await cache.get('flush_key1');
      value2 = await cache.get('flush_key2');
      if (value1 === null && value2 === null) {
        console.log('✅ Cache flush working correctly');
      } else {
        console.log('❌ Cache flush not working');
      }
    }
    
    // Close connection
    await cache.close();
    console.log('\n✅ Redis cache tests completed successfully');
    
  } catch (error) {
    console.error('❌ Error testing Redis cache:', error);
  }
}

// Run the tests
testRedisCache();