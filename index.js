"use strict";

const ReactCompositeComponent = require("react/lib/ReactCompositeComponent");
const assert = require("assert");
const _ = require("lodash");

const config = {
  enabled: false,
  profiling: false,
  caching: false,
  debug: false,
  hashKey: true,
  stripUrlProtocol: true,
  MAX_CACHE_SIZE: 50 * 1024 * 1024 // 50Meg
};

let FarmHash;

if (config.hashKey) {
  try {
    FarmHash = require("farmhash");
  } catch (e) {
    console.log("farmhash module not available, turning off hashKey");
    config.hashKey = false;
  }
}

const profileData = {};

/* non string keys that can be templatized */
const whiteListNonStringKeys = [
  // "price",
  // "savingsPrice",
  // "wasPrice",
  // "listPrice",
  // "unitPrice",
  // "averageRating",
  // "numberOfReviews"
];

/* keys that should not be templatized */
const preserveKeys = [
  "lifeCycleStatus",
  "availabilityStatus",
  "isAValidOffer",
  "variantType",
  "variantTypes",
  "variants"
];

const omit = _.omitBy ? _.omitBy : _.omit;
const propsToOmit = ["moduleData",
  "moduleType",
  "moduleVersion",
  "moduleTypeComponentMap",
  "zoneName",
  "children"];

function genHeaderKey(props) {
  const filteredProps = omit(props, function (value, key) {
    return (propsToOmit.indexOf(key) > -1 || _.isFunction(value));
  });
  if (props.moduleData) {
    filteredProps.publishedDate = props.moduleData.publishedDate;
  }
  return JSON.stringify(filteredProps);
}

const blackListed = {};
const whiteListed = {
  // product collection
  "ProductQuantity": {
    enable: false,  // quantity has to be dynamic
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "ProductInformation": {
    enable: false, // can't cache due to dynamic price
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "ProductCard": {
    enable: false,  // contains ProductInformation
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "ProductOffer": {
    enable: false,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "ProductImage": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "Layout": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "HeroImagery": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "About": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "ProductCallToAction": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "JSMediaSelector": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "RadonSelectOption": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "Chooser.Option": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "RadonSelect": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "PriceHero": {
    enable: false,
    strategy: "template",
    preserveKeys
  },
  "Link": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  "Image": {
    enable: true,
    strategy: "template",
    preserveKeys
  },
  "ProductPrimaryCTA": {
    enable: true,
    strategy: "template",
    preserveKeys,
    whiteListNonStringKeys
  },
  // Header
  "GlobalLefthandNavMobile": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalSecondaryNav": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalEyebrowNavMobile": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalEyebrowNav": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalLefthandNav": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalMarketingMessages": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalAccountFlyout": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "ArrangeFit": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalSearch": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalEmailSignup": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalSocialIcons": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalFooter": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  },
  "GlobalEmailSignupModal": {
    enable: true,
    strategy: "simple",
    genCacheKey: genHeaderKey
  }
};

const debugComponents = {
  "ProductCallToAction": true
};

// if props has children then can't cache
// if owner is already caching, then no cache

// cache key is generated from props

// generate template from props

//
// It's hard (or impossible) to template non-string props.  Since the code may behave differently
// depending on a boolean being true/false, or a number with different values.
// Even string props the code could behave differently base on what the value is.  For example,
// collection status could be "PUBLISHED", "UNPUBLISHED", etc.
//

function CacheStore() {
  this.cache = {};
  this.size = 0;
  this.entries = 0;
}

CacheStore.prototype.newEntry = function (name, key, value) {
  const c = this.cache[name] || (this.cache[name] = {});
  c[key] = value;
  value.hits = 0;
  c.access = value.access = Date.now();
  const size = key.length + value.html.length;
  const newSize = this.size + size;
  if (newSize > config.MAX_CACHE_SIZE) {
    console.log("ssr react profiler caching - max cache size exceeded");
  }
  this.size = newSize;
  this.entries++;
};

CacheStore.prototype.getEntry = function (name, key) {
  const c = this.cache[name] || (this.cache[name] = {});
  const x = c[key];
  if (x) {
    x.hits++;
    c.access = x.access = Date.now();
  }
  return x;
};

const cacheStore = new CacheStore();

// example tempate:

var props = {
  foo: {
    bar: {
      a: [0, 1, 2, 3, 4],
      b: "hello"
    }
  }
};

var template = {
  foo: {
    bar: {
      a: [`@'0"@`, `@'1"@`, `@'2"@`, `@'3"@`, `@'4"@`],
      b: `@'5"@`
    }
  }
};

var lookup = {
  "@0@": "foo.bar.a.0",
  "@1@": "foo.bar.a.1",
  "@2@": "foo.bar.a.2",
  "@3@": "foo.bar.a.3",
  "@4@": "foo.bar.a.4",
  "@5@": "foo.bar.b"
};

//
// generate template for cache strategy template
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

  const profileTime = () => {
    if (config.profiling) {
      const d = process.hrtime(a);
      const owner = currentElement._owner;

      if (owner) {
        (owner.__p[name] || (owner.__p[name] = [])).push(this.__p);
      } else {
        (profileData[name] || (profileData[name] = [])).push(this.__p);
      }

      assert(this.__p.time === undefined);

      this.__p.time = d[0] * 1000.0 + d[1] / 1000000.0;
    }
  };


  let cacheType = "NONE";
  let opts;
  const parentCached = rootID.startsWith(TMP_ROOT_ID);
  const bl = blackListed[name];
  const canCache = !bl && (opts = whiteListed[name]) && opts.enable && !(parentCached ||
    _.isEmpty(saveProps) || typeof saveProps.children === "object");
  const doCache = config.caching && canCache;

  if (doCache) {
    const strategy = opts.strategy;
    if (strategy === "simple") {
      cacheType = "cache";
      template = {cacheKey: opts.genCacheKey ? opts.genCacheKey(saveProps) : JSON.stringify(saveProps)};
      key = config.hashKey ? FarmHash.hash64(template.cacheKey) : template.cacheKey;
      cached = cacheStore.getEntry(name, key);
      if (cached && cached.confidence >= 2) {
        profileTime();
        return config.debug ? `<!-- component ${name} cacheType HIT ${key} -->${cached.html}` : cached.html;
      }
    } else if (strategy === "template") {
      cacheType = "cache";
      template = generateTemplate(saveProps, opts);
      key = config.hashKey ? FarmHash.hash64(template.cacheKey) : template.cacheKey;
      cached = cacheStore.getEntry(name, key);
      if (cached && cached.confidence >= 2) {
        const r = templatePostProcess(cached.html, template.lookup, saveProps);
        profileTime();
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
      cacheStore.newEntry(name, key, {html: r, confidence: 0});
    } else if (cached.html === r) {
      cached.confidence++;
    } else {
      blackListed[name] = true;
      cached.confidence = -1;
    }
    if (template.lookup) {
      r = templatePostProcess(r, template.lookup, saveProps);
    }
  }

  profileTime();

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

exports.cacheSize = function () {
  return cacheStore.size;
};

exports.cacheEntries = function () {
  return cacheStore.entries;
};

exports.cacheHitReport = function () {
  Object.keys(cacheStore.cache).forEach((name) => {
    const componentCache = cacheStore.cache[name];
    Object.keys(componentCache).forEach((key) => {
      if (key !== "access") {
        console.log(`Cache Entry ${name}-${key} Hits ${componentCache[key].hits}`);
      }
    });
  })
};

exports.blackListed = blackListed;

exports.cache = cacheStore;
