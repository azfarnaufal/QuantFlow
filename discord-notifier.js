// Discord Notification Script
// This script can be used to send price alerts via Discord

const axios = require('axios');

class DiscordNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendPriceAlert(symbol, price, volume, threshold) {
    const embed = {
      title: '🔔 Price Alert',
      color: 0x0099ff, // Blue color
      fields: [
        {
          name: 'Symbol',
          value: `**${symbol}**`,
          inline: true
        },
        {
          name: 'Current Price',
          value: `$${price.toFixed(2)}`,
          inline: true
        },
        {
          name: '24h Volume',
          value: volume.toFixed(2),
          inline: true
        },
        {
          name: 'Threshold',
          value: `$${threshold}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Crypto Price Tracker'
      }
    };

    try {
      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });
      
      console.log(`Discord alert sent for ${symbol}`);
      return true;
    } catch (error) {
      console.error('Error sending Discord message:', error.message);
      return false;
    }
  }

  async sendCustomMessage(content, embeds = null) {
    try {
      const payload = { content };
      if (embeds) {
        payload.embeds = embeds;
      }
      
      await axios.post(this.webhookUrl, payload);
      
      console.log('Discord message sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending Discord message:', error.message);
      return false;
    }
  }

  // Send a simple text message
  async sendMessage(message) {
    return await this.sendCustomMessage(message);
  }
}

module.exports = DiscordNotifier;