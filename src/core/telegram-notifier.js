// Telegram Notification Script
// This script can be used to send price alerts via Telegram

const axios = require('axios');

class TelegramNotifier {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  }

  async sendPriceAlert(symbol, price, volume, threshold) {
    const message = `
🔔 *Price Alert*

*${symbol}* has crossed your threshold!

💰 Current Price: $${price.toFixed(2)}
📊 24h Volume: ${volume.toFixed(2)}
🎯 Threshold: $${threshold}

_${new Date().toLocaleString()}_
`;

    try {
      await axios.post(this.telegramApiUrl, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'Markdown'
      });
      
      console.log(`Alert sent for ${symbol}`);
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
    }
  }

  async sendCustomMessage(message) {
    try {
      await axios.post(this.telegramApiUrl, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'Markdown'
      });
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
    }
  }
}

// Example usage
// const notifier = new TelegramNotifier('YOUR_BOT_TOKEN', 'YOUR_CHAT_ID');
// notifier.sendPriceAlert('BTCUSDT', 50000, 1000000, 49000);

module.exports = TelegramNotifier;