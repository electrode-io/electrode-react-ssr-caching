"use strict";
/* eslint-disable */
function CacheStore(cfg) {
  this.cache = {};
  this.size = 0;
  this.entries = 0;
  this.config = cfg;
}

CacheStore.prototype.cleanCache = function (minFreeSize) {
  const keys = Object.keys(this.cache);
  keys.sort((a, b) => this.cache[a].access - this.cache[b].access);
  let freed = 0;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = this.cache[key];
    if (freed >= minFreeSize) {
      break;
    }
    delete this.cache[key];
    const freeSize = key.length + entry.html.length;
    freed += freeSize;
    this.size -= freeSize;
    this.entries--;
  }
};

CacheStore.prototype.newEntry = function (name, key, value) {
  const entryKey = `${name}-${key}`;
  const size = entryKey.length + value.html.length;
  const newSize = this.size + size;
  if (newSize > this.config.MAX_CACHE_SIZE) {
    const freeSize = Math.max(size, this.config.minFreeCacheSize);
    this.cleanCache(Math.min(freeSize, this.config.maxFreeCacheSize));
  }
  this.cache[entryKey] = value;
  value.hits = 0;
  value.access = Date.now();
  this.size = newSize;
  this.entries++;
};

CacheStore.prototype.getEntry = function (name, key) {
  const entryKey = `${name}-${key}`;
  const x = this.cache[entryKey];
  if (x) {
    x.hits++;
    x.access = Date.now();
  }
  return x;
};

module.exports = CacheStore;
