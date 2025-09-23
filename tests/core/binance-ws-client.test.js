// Binance WebSocket Client Tests
const BinancePerpetualPriceTracker = require('../../src/core/binance-ws-client');

describe('BinancePerpetualPriceTracker', () => {
  let priceTracker;
  
  beforeEach(() => {
    priceTracker = new BinancePerpetualPriceTracker('memory');
  });
  
  afterEach(() => {
    // Clean up any connections
    if (priceTracker.ws) {
      priceTracker.ws.terminate();
    }
  });
  
  describe('Constructor', () => {
    it('should create an instance with default parameters', () => {
      expect(priceTracker).toBeInstanceOf(BinancePerpetualPriceTracker);
      expect(priceTracker.subscribedSymbols).toBeInstanceOf(Set);
    });
  });
  
  describe('Symbol Subscription', () => {
    it('should add symbol to subscribed symbols', () => {
      priceTracker.subscribeToSymbol('BTCUSDT');
      expect(priceTracker.subscribedSymbols.has('BTCUSDT')).toBe(true);
    });
  });
  
  describe('Message Handling', () => {
    it('should handle ticker data messages', () => {
      const tickerData = {
        e: '24hrTicker',
        s: 'BTCUSDT',
        c: '45000.00',
        v: '1000.00',
        E: Date.now(),
        p: '1000.00',
        P: '2.22'
      };
      
      // Mock storage storePriceData method
      const storePriceDataSpy = jest.spyOn(priceTracker.storage, 'storePriceData').mockImplementation(() => {});
      
      priceTracker.handleMessage(tickerData);
      
      // Process the batch immediately
      priceTracker.processBatch();
      
      expect(storePriceDataSpy).toHaveBeenCalledWith('BTCUSDT', expect.objectContaining({
        symbol: 'BTCUSDT',
        price: 45000.00,
        volume: 1000.00
      }));
    });
  });
});