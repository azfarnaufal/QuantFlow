// Backtesting Engine Tests
const backtestingEngine = require('../../src/backtesting/backtesting-engine');

describe('BacktestingEngine', () => {
  describe('Strategy Registration', () => {
    it('should retrieve registered strategies', () => {
      const strategies = backtestingEngine.getStrategies();
      expect(strategies).toContain('smaCrossover');
      expect(strategies).toContain('rsiMeanReversion');
      expect(strategies).toContain('momentum');
      expect(strategies).toContain('meanReversion');
    });
  });
  
  describe('SMA Crossover Strategy', () => {
    it('should generate signals for simple price data', () => {
      // Simple upward trend data
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      const result = backtestingEngine.backtest('smaCrossover', prices, { shortPeriod: 3, longPeriod: 5 });
      
      expect(result.signals).toBeDefined();
      expect(result.portfolio).toBeDefined();
    });
  });
  
  describe('RSI Mean Reversion Strategy', () => {
    it('should generate signals for price data', () => {
      // Simple price data
      const prices = [100, 101, 102, 101, 100, 99, 98, 99, 100, 101, 102];
      const result = backtestingEngine.backtest('rsiMeanReversion', prices, { period: 5 });
      
      expect(result.signals).toBeDefined();
      expect(result.portfolio).toBeDefined();
    });
  });
  
  describe('Momentum Strategy', () => {
    it('should generate signals for price data', () => {
      // Simple price data
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      const result = backtestingEngine.backtest('momentum', prices, { period: 3 });
      
      expect(result.signals).toBeDefined();
      expect(result.portfolio).toBeDefined();
    });
  });
  
  describe('Mean Reversion Strategy', () => {
    it('should generate signals for price data', () => {
      // Simple price data with mean reversion characteristics
      const prices = [100, 101, 102, 101, 100, 99, 98, 99, 100, 101, 102];
      const result = backtestingEngine.backtest('meanReversion', prices, { period: 5 });
      
      expect(result.signals).toBeDefined();
      expect(result.portfolio).toBeDefined();
    });
  });
  
  describe('Performance Metrics', () => {
    it('should calculate metrics for a portfolio', () => {
      const portfolio = [
        { portfolioValue: 10000, signal: 'HOLD' },
        { portfolioValue: 10100, signal: 'BUY' },
        { portfolioValue: 10200, signal: 'HOLD' },
        { portfolioValue: 10150, signal: 'SELL' },
        { portfolioValue: 10300, signal: 'HOLD' }
      ];
      
      const metrics = backtestingEngine.calculateMetrics(portfolio);
      
      expect(metrics.totalReturn).toBeDefined();
      expect(metrics.sharpeRatio).toBeDefined();
      expect(metrics.maxDrawdown).toBeDefined();
      expect(metrics.volatility).toBeDefined();
      expect(metrics.trades).toBe(2); // BUY and SELL
    });
  });
});