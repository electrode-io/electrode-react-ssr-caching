"use strict";

const ReactCompositeComponent = require("react/lib/ReactCompositeComponent");
const assert = require("assert");
const _ = require("lodash");
let FarmHash;  // load the farmhash module if it's available and config.hashKey is true

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

exports.setHashKey = function (flag) {
  if (typeof flag === "boolean") {
    config.hashKey = flag;
  }

  if (config.hashKey) {
    try {
      FarmHash = require("farmhash");
    } catch (e) {
      console.log("farmhash module not available, turning off hashKey");
      config.hashKey = false;
    }
  }
};

exports.setHashKey();

function CacheStore() {
  this.cache = {};
  this.size = 0;
  this.entries = 0;
}

CacheStore.prototype.cleanCache = function (minFreeSize) {
  const keys = Object.keys(this.cache);
  keys.sort((a, b) => this.cache[a].access - this.cache[b].access);
  const now = Date.now();
  let freed = 0;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = this.cache[key];
    delete this.cache[key];
    const freeSize = key.length + entry.value.html.length;
    freed += freeSize;
    this.size -= freeSize;
    this.entries--;
    if (now - entry.access < config.cacheExpireTime && freed >= minFreeSize) {
      break;
    }
  }
};

CacheStore.prototype.newEntry = function (name, key, value) {
  const entryKey = `${name}-${key}`;
  const size = entryKey.length + value.html.length;
  const newSize = this.size + size;
  if (newSize > config.MAX_CACHE_SIZE) {
    console.log("ssr react profiler caching - max cache size exceeded");
    let freeSize = Math.max(size, config.minFreeCacheSize);
    this.cleanCache(Math.min(freeSize, config.maxFreeCacheSize));
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

const profileData = {};
const blackListed = {};
let cacheComponents = {};
let debugComponents = {};
let cacheStore = new CacheStore();

//
// cache key is generated from props
// generate template from props for cache strategy template
//
// Note: It's hard (or impossible) to template non-string props.  Since the code may behave differently
// depending on a boolean being true/false, or a number with different values.
// Even string props the code could behave differently base on what the value is.  For example,
// collection status could be "PUBLISHED", "UNPUBLISHED", etc.
//
// returns { template, lookup, cacheKey }
//
function generateTemplate(props, opts) {
  const template = {};
  const lookup = {};
  const path = [];
  let index = 0;
  const cacheKey = [];

  const gen = (obj, tmpl) => {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = obj[k];
      cacheKey.push(k);
      //cacheKey.push(typeof v);
      if (opts.preserveKeys.indexOf(k) >= 0) {
        tmpl[k] = v;
        cacheKey.push(JSON.stringify(v));
      } else if (typeof v === "function") {
        tmpl[k] = v;
      } else if (v && typeof v === "object") {
        const isArray = Array.isArray(v);
        if (isArray) {
          tmpl[k] = [];
          cacheKey.push(`[${v.length}`);
        } else {
          tmpl[k] = {};
        }
        path.push(k);
        gen(v, tmpl[k]);
        isArray && cacheKey.push("]");
        path.pop(k);
      } else if (typeof v === "string") {
        if (!v) {
          tmpl[k] = v;
        } else {
          const templateValue = `@'${index}"@`;
          if (config.stripUrlProtocol) {
            const lv = v.toLowerCase();
            if (lv.startsWith("http://")) {
              tmpl[k] = "http://" + templateValue;
            } else if (lv.startsWith("https://")) {
              tmpl[k] = "https://" + templateValue;
            } else {
              tmpl[k] = templateValue;
            }
          } else {
            tmpl[k] = templateValue;
          }
          const lookupKey = `@${index}@`;
          lookup[lookupKey] = path.join(".") + "." + k;
          cacheKey.push(`:${lookupKey}`);
          index++;
        }
      } else if (v && opts.whiteListNonStringKeys.indexOf(k) >= 0) {
        tmpl[k] = `@'${index}"@`;
        const lookupKey = `@${index}@`;
        cacheKey.push(`:${lookupKey}`);
        lookup[lookupKey] = path.join(".") + "." + k;
        index++;
      } else {
        tmpl[k] = v;
        cacheKey.push(JSON.stringify(v));
      }
    }
  };

  gen(props, template);
  return {
    template, lookup, cacheKey: cacheKey.join(",")
  };
}


const TMP_ROOT_ID = "@{SSR_CACHE}";
const tmpRootIdRegex = new RegExp(TMP_ROOT_ID, "g");

const replacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#x27;",
  '"': "&quot;"
};

ReactCompositeComponent.Mixin._construct = ReactCompositeComponent.Mixin.construct;

ReactCompositeComponent.Mixin.construct = function (element) {
  if (config.enabled) {
    if (config.profiling) {
      this.__p = {time: undefined};
    }
    this._name = element.type && typeof element.type !== "string" && (element.type.name || element.type.displayName);
  }
  return this._construct(element);
};

ReactCompositeComponent.Mixin._mountComponent = ReactCompositeComponent.Mixin.mountComponent;

ReactCompositeComponent.Mixin.mountComponent = function mountComponent(rootID, transaction, context) {
  return this._name ?
    this.mountComponentCache(rootID, transaction, context)
    : this._mountComponent(rootID, transaction, context);
};

ReactCompositeComponent.Mixin.__profileTime = function (start) {
  if (config.profiling) {
    const name = this._name;
    const d = process.hrtime(start);
    const owner = this._currentElement._owner;

    if (owner) {
      (owner.__p[name] || (owner.__p[name] = [])).push(this.__p);
    } else {
      (profileData[name] || (profileData[name] = [])).push(this.__p);
    }

    assert(this.__p.time === undefined);

    this.__p.time = d[0] * 1000.0 + d[1] / 1000000.0;
  }
};

ReactCompositeComponent.Mixin.mountComponentCache = function mountComponentCache(rootID, transaction, context) {
  const updateReactId = (r) => {
    return r.replace(tmpRootIdRegex, rootID);
  };

  const restoreRealProps = (r, lookup, realProps) => {
    return r.replace(/(\@\'|\@&#x27;)([0-9]+)(\"\@|\&quot;\@)/g, function (m, a, b, c) {
      let v = _.get(realProps, lookup[`@${b}@`]);
      if (typeof v === "string") {
        if (config.stripUrlProtocol) {
          let lv = v.toLowerCase();
          if (lv.startsWith("http://")) {
            v = v.substr(7);
          } else if (lv.startsWith("https://")) {
            v = v.substr(8);
          }
        }
        if (a === `@'`) {
          return v;
        }
        return v.replace(/([&<'">])/g, (m, c) => {
          return replacements[c];
        });
      } else {
        return v;
      }
    });
  };

  const templatePostProcess = (r, lookup, realProps) => {
    r = restoreRealProps(r, lookup, realProps);
    return updateReactId(r);
  };

  let template, cached, key;

  const currentElement = this._currentElement;
  const saveProps = currentElement.props;
  const name = this._name;

  const a = config.profiling && process.hrtime();

  let cacheType = "NONE";
  let opts;
  const parentCached = rootID.startsWith(TMP_ROOT_ID);
  const bl = blackListed[name];

  // if props has children then can't cache
  // if owner is already caching, then no need to cache
  const canCache = !bl && (opts = cacheComponents[name]) && opts.enable && !(parentCached ||
    _.isEmpty(saveProps) || typeof saveProps.children === "object");

  const doCache = config.caching && canCache;

  if (doCache) {
    const strategy = opts.strategy;
    if (strategy === "simple") {
      cacheType = "cache";
      template = {cacheKey: opts.genCacheKey ? opts.genCacheKey(saveProps) : JSON.stringify(saveProps)};
      key = config.hashKey ? FarmHash.hash64(template.cacheKey) : template.cacheKey;
      cached = cacheStore.getEntry(name, key);
      if (cached) {
        config.profiling && this.__profileTime(a);
        return config.debug ? `<!-- component ${name} cacheType HIT ${key} -->${cached.html}` : cached.html;
      }
    } else if (strategy === "template") {
      cacheType = "cache";
      template = generateTemplate(saveProps, opts);
      key = config.hashKey ? FarmHash.hash64(template.cacheKey) : template.cacheKey;
      cached = cacheStore.getEntry(name, key);
      if (cached) {
        const r = templatePostProcess(cached.html, template.lookup, saveProps);
        config.profiling && this.__profileTime(a);
        return config.debug ? `<!-- component ${name} cacheType HIT ${key} -->${r}` : r;
      }
    }
  } else if (parentCached) {
    cacheType = "byParent";
  } else if (bl) {
    cacheType = "blackListed";
  } else if (config.debug && debugComponents[name]) {
    cacheType = "debugNone";
    key = generateTemplate(saveProps, {preserveKeys: [], whiteListNonStringKeys: []}).cacheKey;
  }

  let tmpRootID = rootID;

  if (template) {
    if (template.template) {
      currentElement.props = template.template;
    }
    tmpRootID = TMP_ROOT_ID;
  }

  let r = this._mountComponent(tmpRootID, transaction, context);

  if (template) {
    currentElement.props = saveProps;
    if (!cached) {
      cacheStore.newEntry(name, key, {html: r});
    } else if (config.debug) {
      if (cached.html !== r) {
        blackListed[name] = true;
      }
    }

    if (template.lookup) {
      r = templatePostProcess(r, template.lookup, saveProps);
    }
  }

  config.profiling && this.__profileTime();

  if (config.caching && config.debug) {
    return `<!-- component ${name} cacheType ${cacheType} ${key} -->${r}`;
  } else {
    return r;
  }
};

exports.enableProfiling = function (flag) {
  config.profiling = flag === undefined || !!flag;
  config.enabled = config.profiling || config.caching;
};

exports.enableCaching = function (flag) {
  config.caching = flag === undefined || !!flag;
  config.enabled = config.profiling || config.caching;
};

exports.stripUrlProtocol = function (flag) {
  config.stripUrlProtocol = flag;
};

exports.profileData = profileData;

exports.clearProfileData = function () {
  Object.keys(profileData).forEach((k) => {
    delete profileData[k];
  });
};

exports.clearCache = function () {
  cacheStore = new CacheStore();
};

exports.cacheSize = function () {
  return cacheStore.size;
};

exports.cacheEntries = function () {
  return cacheStore.entries;
};

exports.cacheHitReport = function () {
  Object.keys(cacheStore.cache).forEach((key) => {
    const entry = cacheStore.cache[key];
    console.log(`Cache Entry ${key} Hits ${entry.hits}`);
  })
};

exports.setCachingConfig = function (config) {
  cacheComponents = config.components;
  debugComponents = config.debugComponents;
};

exports.blackListed = blackListed;

exports.cache = cacheStore;

