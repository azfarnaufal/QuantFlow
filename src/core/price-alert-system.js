// Price Alert System
// This script monitors price thresholds and sends notifications via multiple channels

const TelegramNotifier = require('./telegram-notifier');
const EmailNotifier = require('./email-notifier');
const DiscordNotifier = require('./discord-notifier');
const StorageFactory = require('./storage-factory');
const TechnicalIndicators = require('./technical-indicators');
const config = require('./config.json');
const alertsConfig = require('./alerts-config.json');

class PriceAlertSystem {
  constructor() {
    this.storage = StorageFactory.createStorage('timescaledb');
    
    // Initialize notifiers
    this.telegramNotifier = new TelegramNotifier(
      alertsConfig.telegram.botToken,
      alertsConfig.telegram.chatId
    );
    
    this.emailNotifier = new EmailNotifier(
      alertsConfig.email.smtp,
      alertsConfig.email.from
    );
    
    this.discordNotifier = new DiscordNotifier(
      alertsConfig.discord.webhookUrl
    );
    
    this.activeAlerts = new Map(); // Track which alerts have been sent to avoid duplicates
    this.checkInterval = alertsConfig.checkInterval || 30000; // Default 30 seconds
    this.lastReportTime = null;
  }

  async initialize() {
    try {
      await this.storage.connect();
      console.log('Price Alert System initialized');
      console.log(`Monitoring ${alertsConfig.alerts.length} alerts`);
      
      // Verify email configuration
      await this.emailNotifier.verifyConnection();
    } catch (error) {
      console.error('Error initializing Price Alert System:', error);
    }
  }

  async startMonitoring() {
    console.log('Starting price alert monitoring...');
    
    // Initial check
    await this.checkAlerts();
    
    // Set up periodic checking
    setInterval(async () => {
      await this.checkAlerts();
      await this.checkScheduledReports();
    }, this.checkInterval);
  }

  async checkAlerts() {
    try {
      // Get current prices for all symbols
      const currentPrices = await this.storage.getSummary();
      
      // Check each alert configuration
      for (const alert of alertsConfig.alerts) {
        if (!alert.enabled) continue;
        
        const { symbol, type, threshold, indicator, condition } = alert;
        
        // Check if we have data for this symbol
        if (!currentPrices[symbol]) {
          console.log(`No data available for symbol ${symbol}`);
          continue;
        }
        
        const currentPrice = currentPrices[symbol].price;
        const volume = currentPrices[symbol].volume;
        const alertKey = `${symbol}-${type}-${threshold}-${indicator || ''}-${condition || ''}`;
        
        let alertTriggered = false;
        let alertMessage = '';
        
        // Handle different alert types
        if (type === 'above' || type === 'below') {
          // Standard price threshold alerts
          if (type === 'above' && currentPrice >= threshold) {
            alertTriggered = true;
            alertMessage = `${symbol} price $${currentPrice.toFixed(2)} crossed above threshold $${threshold}`;
          } else if (type === 'below' && currentPrice <= threshold) {
            alertTriggered = true;
            alertMessage = `${symbol} price $${currentPrice.toFixed(2)} crossed below threshold $${threshold}`;
          }
        } else if (type === 'indicator') {
          // Technical indicator based alerts
          const history = await this.storage.getPriceHistory(symbol, 24); // Last 24 hours
          if (history && history.length > 0) {
            const prices = history.map(item => parseFloat(item.price)).reverse();
            
            let indicatorValue = null;
            
            // Calculate the indicator value
            switch (indicator) {
              case 'rsi':
                indicatorValue = TechnicalIndicators.calculateRSI(prices, threshold);
                break;
              case 'sma':
                indicatorValue = TechnicalIndicators.calculateSMA(prices, threshold);
                break;
              case 'ema':
                indicatorValue = TechnicalIndicators.calculateEMA(prices, threshold);
                break;
              case 'macd':
                const macd = TechnicalIndicators.calculateMACD(prices);
                if (macd) {
                  // For MACD, we'll use the histogram for alerts
                  indicatorValue = macd.histogram;
                }
                break;
            }
            
            if (indicatorValue !== null) {
              if (condition === 'above' && indicatorValue >= threshold) {
                alertTriggered = true;
                alertMessage = `${symbol} ${indicator.toUpperCase()} value ${indicatorValue.toFixed(2)} crossed above threshold ${threshold}`;
              } else if (condition === 'below' && indicatorValue <= threshold) {
                alertTriggered = true;
                alertMessage = `${symbol} ${indicator.toUpperCase()} value ${indicatorValue.toFixed(2)} crossed below threshold ${threshold}`;
              }
            }
          }
        }
        
        // Send alert if condition is met and we haven't sent it recently
        if (alertTriggered && !this.activeAlerts.has(alertKey)) {
          console.log(`Alert triggered: ${alertMessage}`);
          
          // Send notifications to all configured channels
          await this.sendNotifications(alert, symbol, currentPrice, volume, threshold, alertMessage);
          
          // Mark alert as active to avoid duplicate notifications
          this.activeAlerts.set(alertKey, {
            timestamp: Date.now(),
            price: currentPrice
          });
        }
        
        // Clear alert from active list if condition is no longer met
        if (!alertTriggered && this.activeAlerts.has(alertKey)) {
          console.log(`Alert cleared for ${symbol}`);
          this.activeAlerts.delete(alertKey);
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  async sendNotifications(alert, symbol, price, volume, threshold, message) {
    const channels = alert.channels || ['telegram']; // Default to Telegram if not specified
    
    // Send to each configured channel
    for (const channel of channels) {
      switch (channel) {
        case 'telegram':
          await this.telegramNotifier.sendPriceAlert(symbol, price, volume, threshold);
          break;
        case 'email':
          await this.emailNotifier.sendPriceAlert(
            symbol, 
            price, 
            volume, 
            threshold, 
            alertsConfig.email.to
          );
          break;
        case 'discord':
          await this.discordNotifier.sendPriceAlert(symbol, price, volume, threshold);
          break;
        default:
          console.warn(`Unknown notification channel: ${channel}`);
      }
    }
  }

  async checkScheduledReports() {
    if (!alertsConfig.scheduledReports || !alertsConfig.scheduledReports.enabled) {
      return;
    }
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Check if it's time to send the report
    if (currentTime === alertsConfig.scheduledReports.time) {
      // Check if we already sent a report today
      const today = now.toDateString();
      if (!this.lastReportTime || this.lastReportTime !== today) {
        await this.sendScheduledReport();
        this.lastReportTime = today;
      }
    }
  }

  async sendScheduledReport() {
    try {
      console.log('Sending scheduled report...');
      
      // Get current prices summary
      const currentPrices = await this.storage.getSummary();
      
      // Create report content
      let reportText = `📅 **Daily Crypto Price Report**\n\n`;
      reportText += `Report generated at: ${new Date().toLocaleString()}\n\n`;
      
      let reportHtml = `
        <h2>📅 Daily Crypto Price Report</h2>
        <p><strong>Report generated at:</strong> ${new Date().toLocaleString()}</p>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>24h Volume</th>
          </tr>
      `;
      
      for (const [symbol, data] of Object.entries(currentPrices)) {
        reportText += `${symbol}: $${data.price.toFixed(2)} (Volume: ${data.volume.toFixed(2)})\n`;
        reportHtml += `
          <tr>
            <td>${symbol}</td>
            <td>$${data.price.toFixed(2)}</td>
            <td>${data.volume.toFixed(2)}</td>
          </tr>
        `;
      }
      
      reportHtml += `</table>`;
      
      // Send to all configured channels
      const channels = alertsConfig.scheduledReports.channels || ['email'];
      
      for (const channel of channels) {
        switch (channel) {
          case 'telegram':
            await this.telegramNotifier.sendCustomMessage(reportText);
            break;
          case 'email':
            await this.emailNotifier.sendCustomMessage(
              'Daily Crypto Price Report',
              reportText,
              reportHtml,
              alertsConfig.email.to
            );
            break;
          case 'discord':
            await this.discordNotifier.sendCustomMessage(reportText);
            break;
        }
      }
      
      console.log('Scheduled report sent successfully');
    } catch (error) {
      console.error('Error sending scheduled report:', error);
    }
  }

  // Add a new alert
  addAlert(symbol, type, threshold, channels = ['telegram']) {
    const newAlert = {
      symbol,
      type,
      threshold,
      enabled: true,
      channels: channels
    };
    
    alertsConfig.alerts.push(newAlert);
    console.log(`Added new alert: ${symbol} ${type} ${threshold}`);
  }

  // Add a new indicator-based alert
  addIndicatorAlert(symbol, indicator, condition, threshold, channels = ['telegram']) {
    const newAlert = {
      symbol,
      type: 'indicator',
      indicator,
      condition,
      threshold,
      enabled: true,
      channels: channels
    };
    
    alertsConfig.alerts.push(newAlert);
    console.log(`Added new indicator alert: ${symbol} ${indicator} ${condition} ${threshold}`);
  }

  // Remove an alert
  removeAlert(symbol, type, threshold, indicator = null, condition = null) {
    const index = alertsConfig.alerts.findIndex(
      alert => alert.symbol === symbol && 
               alert.type === type && 
               alert.threshold === threshold &&
               (indicator ? alert.indicator === indicator : true) &&
               (condition ? alert.condition === condition : true)
    );
    
    if (index !== -1) {
      alertsConfig.alerts.splice(index, 1);
      console.log(`Removed alert: ${symbol} ${type} ${threshold}`);
    }
  }

  // List all active alerts
  listAlerts() {
    return alertsConfig.alerts.filter(alert => alert.enabled);
  }

  async close() {
    if (this.storage.close) {
      await this.storage.close();
    }
    console.log('Price Alert System closed');
  }
}

// CLI interface
if (require.main === module) {
  const alertSystem = new PriceAlertSystem();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down Price Alert System...');
    await alertSystem.close();
    process.exit(0);
  });
  
  // Initialize and start monitoring
  alertSystem.initialize().then(() => {
    alertSystem.startMonitoring();
  });
}

module.exports = PriceAlertSystem;