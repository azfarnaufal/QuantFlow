const ChatService = require('../ai-engine/chat-service');

async function testChatService() {
  const chatService = new ChatService();
  
  try {
    console.log('Initializing chat service...');
    await chatService.initialize();
    
    console.log('\n=== Testing Chat Service ===\n');
    
    // Test different types of messages
    const testMessages = [
      "Hello, what can you do?",
      "Can you predict the price of BTCUSDT?",
      "What's your analysis of the ETHUSDT market?",
      "Should I buy or sell BTCUSDT right now?",
      "What's your learning status?",
      "Can you run a backtest for me?",
      "Thank you for your help!"
    ];
    
    for (const message of testMessages) {
      console.log(`User: ${message}`);
      const response = await chatService.processMessage(message, { symbol: 'BTCUSDT' });
      console.log(`AI: ${response}\n`);
    }
    
    // Show conversation history
    console.log('=== Conversation History ===');
    const history = chatService.getConversationHistory();
    history.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.role}: ${entry.content}`);
    });
    
    console.log('\nChat service test completed successfully!');
  } catch (error) {
    console.error('Error testing chat service:', error);
  }
}

testChatService();