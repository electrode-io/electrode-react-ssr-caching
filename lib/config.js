"use strict";

/* eslint-disable no-magic-numbers */

const config = {
  enabled: false,
  profiling: false,
  caching: false,
  debug: false,
  hashKey: true,
  stripUrlProtocol: true,
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50Meg
  maxAge: 24 * 60 * 60 * 1000 // 24hrs
};

module.exports = config;
