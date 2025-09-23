// Simple debug test for SMA calculation
const prices = [
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
  110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
  120, 121, 122, 123, 124
];

console.log('Prices:', prices);
console.log('Length:', prices.length);

const shortPeriod = 10;
const longPeriod = 20;

// Calculate SMAs for index 20
const i = 20;
console.log(`\nCalculating for index ${i}:`);
console.log(`Price at index ${i}: ${prices[i]}`);

// Short SMA (10 periods)
const shortSlice = prices.slice(i - shortPeriod, i);
console.log(`Short slice (indices ${i - shortPeriod} to ${i - 1}):`, shortSlice);
const shortSMA = shortSlice.reduce((sum, price) => sum + price, 0) / shortPeriod;
console.log(`Short SMA: ${shortSMA}`);

// Long SMA (20 periods)
const longSlice = prices.slice(i - longPeriod, i);
console.log(`Long slice (indices ${i - longPeriod} to ${i - 1}):`, longSlice);
const longSMA = longSlice.reduce((sum, price) => sum + price, 0) / longPeriod;
console.log(`Long SMA: ${longSMA}`);

console.log(`\nSignal: ${shortSMA > longSMA ? 'BUY' : shortSMA < longSMA ? 'SELL' : 'HOLD'}`);