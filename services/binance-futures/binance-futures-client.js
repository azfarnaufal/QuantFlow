const WebSocket = require('ws');
const axios = require('axios');

class BinanceFuturesClient {
  constructor() {
    this.wsBaseURL = 'wss://fstream.binance.com';
    this.restBaseURL = 'https://fapi.binance.com';
    this.ws = null;
    this.callbacks = new Map();
    this.subscribedSymbols = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    // Add support for major perpetual futures symbols
    this.supportedSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT',
      'SHIBUSDT', 'TRXUSDT', 'UNIUSDT', 'LINKUSDT', 'TONUSDT'
    ];
  }

  // Connect to Binance Futures WebSocket
  connect() {
    try {
      this.ws = new WebSocket(`${this.wsBaseURL}/stream`);
      
      this.ws.on('open', () => {
        console.log('Connected to Binance Futures WebSocket');
        this.reconnectAttempts = 0;
        
        // Resubscribe to symbols if any
        if (this.subscribedSymbols.size > 0) {
          for (const symbol of this.subscribedSymbols) {
            this.subscribeToSymbol(symbol);
          }
        }
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMessage(message);
      });
      
      this.ws.on('error', (error) => {
        console.error('Binance Futures WebSocket error:', error);
      });
      
      this.ws.on('close', () => {
        console.log('Binance Futures WebSocket closed');
        this.handleReconnection();
      });
    } catch (error) {
      console.error('Error connecting to Binance Futures:', error);
      this.handleReconnection();
    }
  }

  // Handle message from WebSocket
  handleMessage(message) {
    try {
      if (message.stream && message.data) {
        const streamType = message.stream.split('@')[1];
        const symbol = message.stream.split('@')[0].toUpperCase();
        
        switch (streamType) {
          case 'markPrice':
            this.handleMarkPriceUpdate(symbol, message.data);
            break;
          case 'kline_1m':
            this.handleKlineUpdate(symbol, message.data);
            break;
          case 'depth20':
            this.handleOrderBookUpdate(symbol, message.data);
            break;
          case 'aggTrade':
            this.handleTradeUpdate(symbol, message.data);
            break;
          default:
            console.log(`Unhandled stream type: ${streamType}`);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Handle mark price updates
  handleMarkPriceUpdate(symbol, data) {
    const update = {
      symbol,
      markPrice: parseFloat(data.p),
      indexPrice: parseFloat(data.i),
      estimatedSettlePrice: parseFloat(data.P),
      fundingRate: parseFloat(data.r),
      nextFundingTime: data.T,
      timestamp: Date.now()
    };
    
    if (this.callbacks.has('markPrice')) {
      this.callbacks.get('markPrice')(update);
    }
  }

  // Handle kline updates
  handleKlineUpdate(symbol, data) {
    const kline = data.k;
    const update = {
      symbol,
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
      quoteVolume: parseFloat(kline.q),
      trades: kline.n,
      isFinal: kline.x,
      timestamp: kline.t,
      closeTime: kline.T
    };
    
    if (this.callbacks.has('kline')) {
      this.callbacks.get('kline')(update);
    }
  }

  // Handle order book updates
  handleOrderBookUpdate(symbol, data) {
    const update = {
      symbol,
      lastUpdateId: data.u,
      bids: data.b.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]),
      asks: data.a.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]),
      timestamp: data.E
    };
    
    if (this.callbacks.has('orderBook')) {
      this.callbacks.get('orderBook')(update);
    }
  }

  // Handle trade updates
  handleTradeUpdate(symbol, data) {
    const update = {
      symbol,
      tradeId: data.a,
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      firstTradeId: data.f,
      lastTradeId: data.l,
      timestamp: data.T,
      isBuyerMaker: data.m
    };
    
    if (this.callbacks.has('trade')) {
      this.callbacks.get('trade')(update);
    }
  }

  // Subscribe to a symbol
  subscribeToSymbol(symbol) {
    // Validate symbol
    if (!this.supportedSymbols.includes(symbol.toUpperCase())) {
      console.warn(`Warning: ${symbol} is not in the list of supported symbols. Adding it anyway.`);
    }
    
    const lowerSymbol = symbol.toLowerCase();
    this.subscribedSymbols.add(symbol);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Subscribe to multiple streams
      const streams = [
        `${lowerSymbol}@markPrice`,
        `${lowerSymbol}@kline_1m`,
        `${lowerSymbol}@depth20@100ms`,
        `${lowerSymbol}@aggTrade`
      ];
      
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: streams,
        id: Date.now()
      };
      
      this.ws.send(JSON.stringify(subscribeMessage));
      console.log(`Subscribed to ${symbol} streams`);
    }
  }

  // Unsubscribe from a symbol
  unsubscribeFromSymbol(symbol) {
    const lowerSymbol = symbol.toLowerCase();
    this.subscribedSymbols.delete(symbol);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Unsubscribe from multiple streams
      const streams = [
        `${lowerSymbol}@markPrice`,
        `${lowerSymbol}@kline_1m`,
        `${lowerSymbol}@depth20@100ms`,
        `${lowerSymbol}@aggTrade`
      ];
      
      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: streams,
        id: Date.now()
      };
      
      this.ws.send(JSON.stringify(unsubscribeMessage));
      console.log(`Unsubscribed from ${symbol} streams`);
    }
  }

  // Subscribe to multiple symbols
  subscribeToMultipleSymbols(symbols) {
    for (const symbol of symbols) {
      this.subscribeToSymbol(symbol);
    }
  }

  // Get list of supported symbols
  getSupportedSymbols() {
    return [...this.supportedSymbols];
  }

  // Add a new symbol to supported list
  addSupportedSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (!this.supportedSymbols.includes(upperSymbol)) {
      this.supportedSymbols.push(upperSymbol);
      console.log(`Added ${upperSymbol} to supported symbols`);
    }
  }

  // Set callback for data types
  on(eventType, callback) {
    this.callbacks.set(eventType, callback);
  }

  // Handle reconnection
  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Get funding rates for all symbols
  async getFundingRates() {
    try {
      const response = await axios.get(`${this.restBaseURL}/fapi/v1/fundingRate`, {
        params: {
          limit: 1
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching funding rates:', error);
      return [];
    }
  }

  // Get open interest for a symbol
  async getOpenInterest(symbol) {
    try {
      const response = await axios.get(`${this.restBaseURL}/fapi/v1/openInterest`, {
        params: {
          symbol: symbol.toUpperCase()
        }
      });
      
      return {
        symbol: response.data.symbol,
        openInterest: parseFloat(response.data.openInterest),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching open interest for ${symbol}:`, error);
      return null;
    }
  }

  // Get 24hr ticker statistics
  async get24hrTicker(symbol) {
    try {
      const response = await axios.get(`${this.restBaseURL}/fapi/v1/ticker/24hr`, {
        params: {
          symbol: symbol.toUpperCase()
        }
      });
      
      return {
        symbol: response.data.symbol,
        priceChange: parseFloat(response.data.priceChange),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        weightedAvgPrice: parseFloat(response.data.weightedAvgPrice),
        lastPrice: parseFloat(response.data.lastPrice),
        lastQuantity: parseFloat(response.data.lastQty),
        openPrice: parseFloat(response.data.openPrice),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        volume: parseFloat(response.data.volume),
        quoteVolume: parseFloat(response.data.quoteVolume),
        openTime: response.data.openTime,
        closeTime: response.data.closeTime,
        firstId: response.data.firstId,
        lastId: response.data.lastId,
        count: response.data.count
      };
    } catch (error) {
      console.error(`Error fetching 24hr ticker for ${symbol}:`, error);
      return null;
    }
  }

  // Get mark price for a symbol
  async getMarkPrice(symbol) {
    try {
      const response = await axios.get(`${this.restBaseURL}/fapi/v1/premiumIndex`, {
        params: {
          symbol: symbol.toUpperCase()
        }
      });
      
      return {
        symbol: response.data.symbol,
        markPrice: parseFloat(response.data.markPrice),
        indexPrice: parseFloat(response.data.indexPrice),
        estimatedSettlePrice: parseFloat(response.data.estimatedSettlePrice),
        lastFundingRate: parseFloat(response.data.lastFundingRate),
        nextFundingTime: response.data.nextFundingTime,
        interestRate: parseFloat(response.data.interestRate),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching mark price for ${symbol}:`, error);
      return null;
    }
  }

  // Get historical klines (candlestick data)
  async getKlines(symbol, interval = '1h', limit = 1000, startTime = null, endTime = null) {
    try {
      const params = {
        symbol: symbol.toUpperCase(),
        interval: interval,
        limit: limit
      };
      
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      
      const response = await axios.get(`${this.restBaseURL}/fapi/v1/klines`, { params });
      
      // Transform klines data into more readable format
      const klines = response.data.map(kline => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteAssetVolume: parseFloat(kline[7]),
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: parseFloat(kline[9]),
        takerBuyQuoteAssetVolume: parseFloat(kline[10]),
        ignore: kline[11]
      }));
      
      return klines;
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      return [];
    }
  }

  // Get historical klines for a specified time range
  async getHistoricalKlines(symbol, interval = '1h', daysBack = 30) {
    try {
      const endTime = Date.now();
      const startTime = endTime - (daysBack * 24 * 60 * 60 * 1000);
      
      // Binance API limit is 1000 klines per request, so we need to paginate
      const allKlines = [];
      let currentStartTime = startTime;
      
      while (currentStartTime < endTime) {
        const klines = await this.getKlines(symbol, interval, 1000, currentStartTime, endTime);
        
        if (klines.length === 0) break;
        
        allKlines.push(...klines);
        
        // Move start time to just after the last kline
        currentStartTime = klines[klines.length - 1].closeTime + 1;
        
        // Add a small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Remove duplicates and sort by time
      const uniqueKlines = Array.from(new Map(allKlines.map(item => [item.openTime, item])).values());
      uniqueKlines.sort((a, b) => a.openTime - b.openTime);
      
      return uniqueKlines;
    } catch (error) {
      console.error(`Error fetching historical klines for ${symbol}:`, error);
      return [];
    }
  }

  // Get exchange information (supported symbols)
  async getExchangeInfo() {
    try {
      const response = await axios.get(`${this.restBaseURL}/fapi/v1/exchangeInfo`);
      return response.data;
    } catch (error) {
      console.error('Error fetching exchange info:', error);
      return null;
    }
  }

  // Get all supported perpetual futures symbols
  async getAllPerpetualSymbols() {
    try {
      const exchangeInfo = await this.getExchangeInfo();
      if (!exchangeInfo) return this.supportedSymbols;
      
      const perpetualSymbols = exchangeInfo.symbols
        .filter(symbol => symbol.contractType === 'PERPETUAL')
        .map(symbol => symbol.symbol);
      
      return perpetualSymbols;
    } catch (error) {
      console.error('Error fetching perpetual symbols:', error);
      return this.supportedSymbols;
    }
  }

  // Close connection
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = BinanceFuturesClient;