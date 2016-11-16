"use strict";

/* eslint-disable no-magic-numbers */

const ReactCompositeComponent = require("react-dom/lib/ReactCompositeComponent");
const DOMPropertyOperations = require("react-dom/lib/DOMPropertyOperations");
const assert = require("assert");
const _ = require("lodash");
const CacheStore = require("./cache-store");
const config = require("./config");

const noOpHashKeyFn = (key) => key;
let hashKeyFn = noOpHashKeyFn;

exports.shouldHashKeys = function (flag, fn) {
  if (typeof flag === "boolean") {
    config.hashKey = flag;
  }

  if (config.hashKey) {
    if (!fn) {
      try {
        const FarmHash = require("farmhash"); // eslint-disable-line
        hashKeyFn = (s) => FarmHash.hash64(s);
      } catch (e) {
        console.log("farmhash module not available, turning off hashKey"); // eslint-disable-line
        config.hashKey = false;
        hashKeyFn = noOpHashKeyFn;
      }
    } else {
      assert(typeof fn === "function", "hashKey function is not a function");
      hashKeyFn = fn;
    }
  } else {
    hashKeyFn = noOpHashKeyFn;
  }

  exports.hashKeyFn = hashKeyFn;
};

exports.shouldHashKeys();

const profileData = {};
const blackListed = {};
let cacheComponents = {};
let cacheStore;

//
// cache key is generated from props
// generate template from props for cache strategy template
//
// Note: It's hard and tricky to template non-string props.  Since the code may
// behave differently depending on a boolean being true/false, or a number with different
// values.  Even string props the code could behave differently base on what the value is.
// For example, collection status could be "PUBLISHED", "UNPUBLISHED", etc.
//
// Non-string props could also be stringified differently by the component.
//
// returns { template, lookup, cacheKey }
//
function generateTemplate(props, opts) {
  const template = {};
  const lookup = {};
  const path = [];
  let index = 0;
  const cacheKey = [];

  const gen = (obj, tmpl) => {  // eslint-disable-line
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = obj[k];
      if (opts.ignoreKeys.indexOf(k) >= 0) {
        tmpl[k] = v;
        continue;
      }

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
        isArray && cacheKey.push("]"); // eslint-disable-line
        path.pop(k);
      } else if (typeof v === "string") {
        if (!v && opts.preserveEmptyKeys.indexOf(k) >= 0) {
          // Sometimes components have logic dependent on strings being empty
          // For example: It skips showing the UI to display a message if it's empty
          tmpl[k] = v;
        } else {
          const templateValue = `@'${index}"@`;
          if (config.stripUrlProtocol) {
            const lv = v.toLowerCase();
            if (lv.startsWith("http://")) { // eslint-disable-line
              tmpl[k] = `http://${templateValue}`;
            } else if (lv.startsWith("https://")) {
              tmpl[k] = `https://${templateValue}`;
            } else {
              tmpl[k] = templateValue;
            }
          } else {
            tmpl[k] = templateValue;
          }
          const lookupKey = `@${index}@`;
          lookup[lookupKey] = path.concat(k);
          cacheKey.push(`:${lookupKey}`);
          index++;
        }
      } else if (v && opts.whiteListNonStringKeys.indexOf(k) >= 0) {
        tmpl[k] = `@'${index}"@`;
        const lookupKey = `@${index}@`;
        cacheKey.push(`:${lookupKey}`);
        lookup[lookupKey] = path.concat(k);
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

const replacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#x27;",
  '"': "&quot;"  // eslint-disable-line
};

ReactCompositeComponent._construct = ReactCompositeComponent.construct;
ReactCompositeComponent._mountComponent = ReactCompositeComponent.mountComponent;

ReactCompositeComponent.construct = function (element) {
  if (config.enabled) {
    if (config.profiling) {
      this.__p = {time: undefined};
      this.__profileTime = this.__realProfileTime;
    }
    this._name = element.type && typeof element.type !== "string" && element.type.name;
    this.mountComponent = this._name ? this.mountComponentCache : this._mountComponent;
  }
  return this._construct(element);
};

ReactCompositeComponent.__profileTime = function () {
};

ReactCompositeComponent.__realProfileTime = function (start) {
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
};

const restoreRealProps = (r, lookup, realProps) => {
  return r.replace(/(\@\'|\@&#x27;)([0-9]+)(\"\@|\&quot;\@)/g, (m, a, b) => {
    let v = _.get(realProps, lookup[`@${b}@`]);
    if (typeof v === "string") {
      if (config.stripUrlProtocol) {
        const lv = v.toLowerCase();
        if (lv.startsWith("http://")) {
          v = v.substr(7);
        } else if (lv.startsWith("https://")) {
          v = v.substr(8);
        }
      }
      if (a === `@'`) {
        return v;
      }
      return v.replace(/([&<'">])/g, (m2, c2) => {
        return replacements[c2];
      });
    } else {
      return v;
    }
  });
};

const MARKUP_FOR_ROOT = DOMPropertyOperations.createMarkupForRoot();

const addRootMarkup = (r) => {
  return r.replace(/(<[^ >]*)([ >])/, (m, a, b) => `${a} ${MARKUP_FOR_ROOT}${b}`);
};

const REACT_ID_REPLACE_REGEX = new RegExp(`(data-reactid="|react-text: )[0-9]*`, "g");

const updateReactId = (r, hostContainerInfo) => { // eslint-disable-line
  let id = hostContainerInfo._idCounter;
  r = r.replace(REACT_ID_REPLACE_REGEX, (m, a) => `${a}${id++}`);
  hostContainerInfo._idCounter = id;
  return r;
};

const templatePostProcess = (r, lookup, realProps, transaction, hostContainerInfo) => { // eslint-disable-line
  r = restoreRealProps(r, lookup, realProps);
  return transaction.renderToStaticMarkup ? r : updateReactId(r, hostContainerInfo);
};

ReactCompositeComponent.mountComponentCache = function mountComponentCache(transaction, hostParent, hostContainerInfo, context, parentDebugID) { // eslint-disable-line

  let template;
  let cached;
  let key;
  let cacheType;
  let opts;

  const currentElement = this._currentElement;
  const saveProps = currentElement.props;
  const name = this._name;
  const startTime = config.profiling && process.hrtime();

  // if props has children then can't cache
  // if owner is already caching, then no need to cache
  const canCache = (opts = cacheComponents[name]) && opts.enable && !(transaction._cached ||
    _.isEmpty(saveProps) || typeof saveProps.children === "object");

  const doCache = config.caching && canCache;

  if (doCache) {
    const strategy = opts.strategy;
    if (strategy === "simple") {
      cacheType = "cache";
      template = {
        cacheKey: opts.genCacheKey ? opts.genCacheKey(saveProps) : JSON.stringify(saveProps)
      };
      key = hashKeyFn(template.cacheKey);
      cached = cacheStore.getEntry(name, key);
      if (cached) {
        this.__profileTime(startTime);
        let r = cached.html;
        if (!transaction.renderToStaticMarkup) {
          r = updateReactId(cached.html, hostContainerInfo);
        }
        if (!hostParent) {
          r = addRootMarkup(r);
        }
        return config.debug ?
          `<!-- component ${name} cacheType HIT ${key} -->${r}` : r;
      }
    } else if (strategy === "template") {
      cacheType = "cache";
      template = generateTemplate(saveProps, opts);
      key = hashKeyFn(template.cacheKey);
      cached = cacheStore.getEntry(name, key);
      if (cached) {
        let r = templatePostProcess(cached.html, template.lookup,
          saveProps, transaction, hostContainerInfo);
        if (!hostParent) {
          r = addRootMarkup(r);
        }
        this.__profileTime(startTime);
        return config.debug ? `<!-- component ${name} cacheType HIT ${key} -->${r}` : r;
      }
    } else {
      throw new Error(`Unknown caching strategy ${strategy} for component ${name}`);
    }
  } else if (transaction._cached) {
    cacheType = "byParent";
  } else {
    cacheType = "NONE";
  }

  const saveId = hostContainerInfo._idCounter;

  if (template) {
    if (template.template) {
      currentElement.props = template.template;
    }
    hostContainerInfo._idCounter = 1;
    transaction._cached = this._name;
  }

  let r = this._mountComponent(transaction, hostParent, hostContainerInfo, context, parentDebugID);

  if (template) {
    hostContainerInfo._idCounter = saveId;
    currentElement.props = saveProps;
    cacheStore.newEntry(name, key, {html: r.replace(` ${MARKUP_FOR_ROOT}`, "")});

    if (template.lookup) {
      r = templatePostProcess(r, template.lookup,
        saveProps, transaction, hostContainerInfo);
    } else if (!transaction.renderToStaticMarkup) {
      r = updateReactId(r, hostContainerInfo);
    }
    transaction._cached = undefined;
  }

  this.__profileTime(startTime);

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

exports.enableCachingDebug = function (flag) {
  config.debug = flag === undefined || !!flag;
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
  exports.cacheStore = cacheStore = new CacheStore(config);
};

exports.cacheSize = function () {
  return cacheStore.size;
};

exports.cacheEntries = function () {
  return cacheStore.entries;
};

exports.cacheHitReport = function () {
  const hitReport = {};
  Object.keys(cacheStore.cache).forEach((key) => {
    const entry = cacheStore.cache[key];
    hitReport[key] = {
      hits: entry.hits
    };
  });
  return hitReport;
};

exports.config = config;

exports.setCachingConfig = function (cfg) {
  cacheComponents = cfg.components || {};
  Object.keys(cacheComponents).forEach((k) => {
    _.defaults(cacheComponents[k], {
      preserveKeys: [],
      preserveEmptyKeys: [],
      ignoreKeys: [],
      whiteListNonStringKeys: []
    });
  });
};

exports.blackListed = blackListed;

exports.clearCache();
