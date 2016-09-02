"use strict";

/* eslint-disable no-magic-numbers */

const config = {
  enabled: false,
  profiling: false,
  caching: false,
  debug: false,
  hashKey: true,
  stripUrlProtocol: true,
  cacheExpireTime: 15 * 60 * 1000,   // 15 min
  MAX_CACHE_SIZE: 50 * 1024 * 1024,  // 50Meg
  minFreeCacheSize: 1024 * 1024,     // 1 Meg - min size to free when cache is full
  maxFreeCacheSize: 10 * 1024 * 1024 // 10 Meg - max size to free when cache is full
};

module.exports = config;
