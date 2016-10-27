"use strict";

const lru = require("lru-cache");

/* eslint-disable */
function CacheStore(cfg) {
  this.cache = lru({
    // The total amount of memory the cache is allowed to use
    max: cfg.MAX_CACHE_SIZE,
    maxAge: cfg.maxAge,
    length: function(n, key) {
      // Calculate the amount of memory this cache item is taking
      return n.length + key.length;
    },
    stale: false // DO NOT return stale cache items when requested, cache miss and drop them
  });
  this.hits = {};
}

function createKey(name, key) {
  return `${name}-${key}`;
}

CacheStore.prototype.newEntry = function (name, key, value) {
  const entryKey = createKey(name, key);

  this.cache.set(entryKey, value.html, value.maxAge);
};

CacheStore.prototype.getEntry = function (name, key) {
  const entryKey = createKey(name, key);

  const value = this.cache.get(entryKey);

  if (value) {
    const hits = this.hits[entryKey] || 0;
    this.hits[entryKey] = hits + 1;
  }

  return value;
};

module.exports = CacheStore;
