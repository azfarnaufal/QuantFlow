// Simple test script to verify TimescaleDB connection
const { Client } = require('pg');

async function testTimescaleDB() {
  console.log('Testing TimescaleDB connection...');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'crypto_prices',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    console.log('Attempting to connect to TimescaleDB...');
    await client.connect();
    console.log('✅ Connected to TimescaleDB successfully!');
    
    // Test creating a simple table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Test table created successfully!');
    
    // Insert a test record
    await client.query(`
      INSERT INTO test_table (name) VALUES ('TimescaleDB Test');
    `);
    
    console.log('✅ Test record inserted successfully!');
    
    // Query the test record
    const result = await client.query('SELECT * FROM test_table;');
    console.log('✅ Test record retrieved successfully!');
    console.log('Retrieved data:', result.rows);
    
    // Clean up
    await client.query('DROP TABLE IF EXISTS test_table;');
    console.log('✅ Test table cleaned up successfully!');
    
    await client.end();
    console.log('✅ Disconnected from TimescaleDB successfully!');
    
  } catch (err) {
    console.error('❌ Error connecting to TimescaleDB:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    // Try to provide more specific troubleshooting information
    if (err.code === 'ECONNREFUSED') {
      console.error('\n🔧 Troubleshooting tips:');
      console.error('- Make sure TimescaleDB is running on port 5432');
      console.error('- Check if Docker containers are running: docker-compose ps');
      console.error('- Try starting the services: docker-compose up -d timescaledb');
    } else if (err.code === 'ENOTFOUND') {
      console.error('\n🔧 Troubleshooting tips:');
      console.error('- Check if "localhost" resolves correctly');
      console.error('- Try using "127.0.0.1" instead of "localhost"');
    } else if (err.code === '3D000') {
      console.error('\n🔧 Troubleshooting tips:');
      console.error('- Database "crypto_prices" might not exist yet');
      console.error('- Try connecting to default database "postgres" first');
    }
    
    try {
      await client.end();
    } catch (endErr) {
      // Ignore error when closing connection
    }
  }
}

testTimescaleDB();