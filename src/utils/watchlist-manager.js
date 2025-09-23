// Watchlist Manager
// This module manages user watchlists for cryptocurrency symbols

class WatchlistManager {
  constructor() {
    // In a real application, this would be stored in a database
    // For now, we'll use an in-memory store
    this.watchlists = new Map();
    this.defaultWatchlist = 'default';
    
    // Initialize with a default watchlist
    if (!this.watchlists.has(this.defaultWatchlist)) {
      this.watchlists.set(this.defaultWatchlist, []);
    }
  }

  // Create a new watchlist
  createWatchlist(name, symbols = []) {
    if (this.watchlists.has(name)) {
      throw new Error(`Watchlist '${name}' already exists`);
    }
    
    this.watchlists.set(name, [...symbols]);
    return true;
  }

  // Get all watchlists
  getWatchlists() {
    const result = {};
    for (const [name, symbols] of this.watchlists.entries()) {
      result[name] = [...symbols];
    }
    return result;
  }

  // Get symbols in a watchlist
  getWatchlist(name = this.defaultWatchlist) {
    if (!this.watchlists.has(name)) {
      throw new Error(`Watchlist '${name}' does not exist`);
    }
    
    return [...this.watchlists.get(name)];
  }

  // Add symbol to watchlist
  addToWatchlist(symbol, watchlistName = this.defaultWatchlist) {
    if (!this.watchlists.has(watchlistName)) {
      throw new Error(`Watchlist '${watchlistName}' does not exist`);
    }
    
    const watchlist = this.watchlists.get(watchlistName);
    if (!watchlist.includes(symbol)) {
      watchlist.push(symbol);
      return true;
    }
    
    return false; // Already in watchlist
  }

  // Remove symbol from watchlist
  removeFromWatchlist(symbol, watchlistName = this.defaultWatchlist) {
    if (!this.watchlists.has(watchlistName)) {
      throw new Error(`Watchlist '${watchlistName}' does not exist`);
    }
    
    const watchlist = this.watchlists.get(watchlistName);
    const index = watchlist.indexOf(symbol);
    if (index !== -1) {
      watchlist.splice(index, 1);
      return true;
    }
    
    return false; // Not in watchlist
  }

  // Check if symbol is in watchlist
  isInWatchlist(symbol, watchlistName = this.defaultWatchlist) {
    if (!this.watchlists.has(watchlistName)) {
      return false;
    }
    
    return this.watchlists.get(watchlistName).includes(symbol);
  }

  // Delete a watchlist
  deleteWatchlist(name) {
    if (name === this.defaultWatchlist) {
      throw new Error(`Cannot delete default watchlist`);
    }
    
    return this.watchlists.delete(name);
  }

  // Update watchlist symbols
  updateWatchlist(name, symbols) {
    if (!this.watchlists.has(name)) {
      throw new Error(`Watchlist '${name}' does not exist`);
    }
    
    this.watchlists.set(name, [...symbols]);
    return true;
  }
}

module.exports = WatchlistManager;