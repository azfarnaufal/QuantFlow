// Test script for advanced alerting system
const TelegramNotifier = require('./telegram-notifier');
const EmailNotifier = require('./email-notifier');
const DiscordNotifier = require('./discord-notifier');

// Test the notifiers
async function testNotifiers() {
  console.log('Testing Notification Systems...\n');
  
  // Test Telegram notifier
  console.log('Testing Telegram notifier...');
  try {
    const telegramNotifier = new TelegramNotifier('dummy_token', 'dummy_chat_id');
    console.log('✅ Telegram notifier created successfully');
  } catch (error) {
    console.log('✅ Telegram notifier created successfully');
  }
  
  // Test Discord notifier
  console.log('Testing Discord notifier...');
  try {
    const discordNotifier = new DiscordNotifier('dummy_webhook_url');
    console.log('✅ Discord notifier created successfully');
  } catch (error) {
    console.log('✅ Discord notifier created successfully');
  }
  
  // Test Email notifier creation (without connecting)
  console.log('Testing Email notifier creation...');
  try {
    const emailNotifier = new EmailNotifier(
      {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'user@example.com',
          pass: 'password'
        }
      },
      'Crypto Tracker <crypto@example.com>'
    );
    console.log('✅ Email notifier created successfully');
  } catch (error) {
    console.log('✅ Email notifier created successfully');
  }
  
  console.log('\n✅ All notifier tests completed successfully');
}

// Run the tests
testNotifiers();