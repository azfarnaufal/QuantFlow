// Redis Cache Service
// Provides caching functionality for frequently accessed price data

const redis = require('redis');
const fs = require('fs');
const path = require('path');

// Load config file
let config;
try {
  // Try to load from src/config directory first (for development)
  const configPath = path.join(__dirname, '../config/config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to root directory (for Docker)
    const rootConfigPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(rootConfigPath)) {
      config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
    } else {
      // Final fallback to src/config directory with absolute path
      const absoluteConfigPath = path.join(process.cwd(), 'src/config/config.json');
      config = JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8'));
    }
  }
} catch (error) {
  console.error('Error loading config file:', error);
  // Use default config if file cannot be loaded
  config = {
    redisUrl: 'redis://localhost:6379',
    redisCacheTTL: 30 // Cache TTL in seconds
  };
}

/**
 * Redis Cache Service
 * Provides caching functionality for frequently accessed price data
 */
class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.cacheTTL = config.redisCacheTTL || 30; // Default to 30 seconds
    
    // Initialize Redis client
    this.init();
  }

  /**
   * Initialize Redis client
   */
  async init() {
    try {
      // Create Redis client
      this.client = redis.createClient({
        url: process.env.REDIS_URL || config.redisUrl || 'redis://localhost:6379'
      });

      // Handle connection events
      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      console.log('Redis cache initialized successfully');
    } catch (error) {
      console.error('Error initializing Redis cache:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any} Cached data or null if not found
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting data from Redis cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(key, value, ttl = this.cacheTTL) {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting data in Redis cache:', error);
    }
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Error deleting data from Redis cache:', error);
    }
  }

  /**
   * Clear all data from cache
   */
  async flush() {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.flushAll();
    } catch (error) {
      console.error('Error flushing Redis cache:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('Redis connection closed');
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }
    }
  }
}

module.exports = RedisCache;