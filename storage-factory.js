// Storage factory to easily switch between storage implementations

const PriceStorage = require('./price-storage');
const TimescaleDBStorage = require('./timescaledb-storage');

class StorageFactory {
  static createStorage(type = 'memory') {
    switch (type) {
      case 'timescaledb':
        return new TimescaleDBStorage();
      case 'memory':
      default:
        return new PriceStorage();
    }
  }
}

module.exports = StorageFactory;