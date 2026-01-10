// Simple in-memory cache with TTL
class SimpleCache {
  constructor() {
    this.map = new Map();
  }

  set(key, value, ttlMs = 60_000) {
    const expires = Date.now() + ttlMs;
    this.map.set(key, { value, expires });
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }
}

module.exports = new SimpleCache();
