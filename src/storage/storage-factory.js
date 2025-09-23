// Storage Factory - Creates appropriate storage instances based on configuration

const MemoryStorage = require('./memory-storage');
const TimescaleDBStorage = require('./timescaledb-storage');

/**
 * Storage Factory
 * Creates appropriate storage instances based on configuration
 */
class StorageFactory {
  /**
   * Create a storage instance based on the specified type
   * @param {string} type - Type of storage ('memory' or 'timescaledb')
   * @returns {Object} Storage instance
   */
  static createStorage(type) {
    switch (type.toLowerCase()) {
      case 'memory':
        return new MemoryStorage();
      case 'timescaledb':
        return new TimescaleDBStorage();
      default:
        console.warn(`Unknown storage type '${type}', defaulting to memory storage`);
        return new MemoryStorage();
    }
  }
}

module.exports = StorageFactory;