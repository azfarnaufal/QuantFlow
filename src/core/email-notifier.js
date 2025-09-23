// Email Notification Script
// This script can be used to send price alerts via email

const nodemailer = require('nodemailer');

class EmailNotifier {
  constructor(smtpConfig, fromAddress) {
    this.smtpConfig = smtpConfig;
    this.fromAddress = fromAddress;
    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendPriceAlert(symbol, price, volume, threshold, toAddress) {
    const subject = `🔔 Price Alert: ${symbol} has crossed your threshold`;
    
    const html = `
      <h2>Price Alert</h2>
      <p><strong>${symbol}</strong> has crossed your threshold!</p>
      <ul>
        <li><strong>Current Price:</strong> $${price.toFixed(2)}</li>
        <li><strong>24h Volume:</strong> ${volume.toFixed(2)}</li>
        <li><strong>Threshold:</strong> $${threshold}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;

    const text = `
      Price Alert
      
      ${symbol} has crossed your threshold!
      
      Current Price: $${price.toFixed(2)}
      24h Volume: ${volume.toFixed(2)}
      Threshold: $${threshold}
      Time: ${new Date().toLocaleString()}
    `;

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: toAddress,
        subject: subject,
        text: text,
        html: html
      });
      
      console.log(`Email alert sent for ${symbol}`);
      return true;
    } catch (error) {
      console.error('Error sending email message:', error.message);
      return false;
    }
  }

  async sendCustomMessage(subject, text, html, toAddress) {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: toAddress,
        subject: subject,
        text: text,
        html: html
      });
      
      console.log('Email message sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email message:', error.message);
      return false;
    }
  }

  // Verify SMTP configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email notifier: SMTP connection verified');
      return true;
    } catch (error) {
      console.error('Email notifier: SMTP connection failed:', error.message);
      return false;
    }
  }
}

module.exports = EmailNotifier;