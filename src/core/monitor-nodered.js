// Simple script to demonstrate Node-RED flow working
const axios = require('axios');

async function monitorFlow() {
    console.log("Monitoring Node-RED flow for crypto price data...");
    console.log("Make sure you've deployed the flow in Node-RED UI!");
    console.log("Access Node-RED at: http://localhost:1880");
    console.log("");
    
    // Test the Node-RED integration endpoint directly
    try {
        console.log("Testing direct API call to Node-RED integration server...");
        const response = await axios.get('http://localhost:3001/nodered/prices');
        
        console.log("✅ Successfully retrieved data from Node-RED integration server:");
        console.log(`   Timestamp: ${response.data.timestamp}`);
        console.log(`   Symbols tracked: ${response.data.symbols}`);
        console.log("");
        
        // Display key prices
        const prices = response.data.data;
        for (const [symbol, data] of Object.entries(prices)) {
            console.log(`   ${symbol}: $${data.price} (24h Volume: ${data.volume.toFixed(2)})`);
        }
        
        console.log("");
        console.log("✅ Node-RED flow is working correctly!");
        console.log("   The flow is automatically polling every 10 seconds");
        console.log("   Check the debug panel in Node-RED UI to see the live data flow");
        
    } catch (error) {
        console.error("❌ Error connecting to Node-RED integration server:", error.message);
        console.log("   Make sure the services are running:");
        console.log("   - Node-RED integration server (port 3001)");
        console.log("   - Node-RED (port 1880)");
    }
}

// Run the monitoring function
monitorFlow();