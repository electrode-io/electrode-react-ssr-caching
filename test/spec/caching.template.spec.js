"use strict";

// test template caching feature

require("../farmhash-mock");
const SSRCaching = require("../..");
const renderGreeting = require("../gen-lib/render-greeting").default;
const renderBoard = require("../gen-lib/render-board").default;
const renderHello = require("../gen-lib/render-hello").default;
const chai = require("chai");
const expect = chai.expect;
process.env.NODE_ENV = "production";

describe("SSRCaching template caching", function () {

  this.timeout(10000);

  beforeEach(() => {
    SSRCaching.setCachingConfig({});
    SSRCaching.clearCache();
    SSRCaching.clearProfileData();
    SSRCaching.enableCaching(false);
    SSRCaching.enableProfiling(false);
  });

  function removeReactChecksum(html) {
    return html.replace(/data-react-checksum\=\"[^\"]+\"/g, "").replace(/ *>/g, ">");
  }

  const verifyRenderResults = (r1, r2, r3, cleanUp) => { // eslint-disable-line
    if (cleanUp) {
      r1 = removeReactChecksum(r1);
      r2 = removeReactChecksum(r2);
      r3 = removeReactChecksum(r3);
    }
    expect(r1).to.equal(r2);
    expect(r1).to.equal(r3);
    expect(r2).to.equal(r3);
  };

  //
  // test simple strategy with user provided function to generate cache key
  //
  it("should cache component with template strategy", function () {
    const message = "good morning";

    // save render Hello with caching off
    const rHello1 = renderHello("test", message); // eslint-disable-line

    // save render Greeting with caching off
    const r1 = renderGreeting("test", message);

    // Enable caching and test

    SSRCaching.enableCaching();
    SSRCaching.setCachingConfig({
      components: {
        "Hello": {
          strategy: "template",
          enable: true
        }
      }
    });

    // should add an entry to cache with template key

    SSRCaching.stripUrlProtocol(true);
    SSRCaching.shouldHashKeys(false);

    // first just render Hello by itself to create a cache with diff react-id's

    renderHello("test", message); // eslint-disable-line
    const key1 = Object.keys(SSRCaching.cacheStore.cache)[0];
    const keyTmpl = key1.substr(6);
    const entry1 = SSRCaching.cacheStore.getEntry("Hello", keyTmpl);
    expect(entry1.hits).to.equal(1);

    // render hello again and verify cache

    const rHello2 = renderHello("test", message);
    expect(rHello1).to.equal(rHello2);
    expect(entry1.hits).to.equal(2);

    // render Greeting that has Hello inside and verify

    const rX = renderGreeting("test", message);
    expect(entry1.hits).to.equal(3);
    expect(r1).to.equal(rX);

    // should add an entry to cache with hashed key from template key

    SSRCaching.shouldHashKeys(true);
    const hashKey = SSRCaching.hashKeyFn(keyTmpl);
    const r2 = renderGreeting("test", message);
    const entry = SSRCaching.cacheStore.getEntry("Hello", hashKey);
    expect(entry.hits).to.equal(1);

    // now render should use result from cache

    const r3 = renderGreeting("test", message);
    expect(entry.hits).to.equal(2);
    expect(r2).includes(message);
    verifyRenderResults(r1, r2, r3);

    const hitReport = SSRCaching.cacheHitReport();
    Object.keys(hitReport).forEach((key) => {
      console.log(`Cache Entry ${key} Hits ${hitReport[key].hits}`); // eslint-disable-line
    });

    expect(SSRCaching.cacheEntries()).to.equal(2);
    expect(SSRCaching.cacheSize()).to.be.above(0);
  });

  const users = [
    {
      name: "Joel",
      message: "good morning",
      hasAvatar: true,
      quote: "blah",
      preserve: "preserve",
      empty: "",
      ignore: "ignore-me",
      urls: [
        "http://zzzzl.com/xchen11",
        "https://github.com/jchip"
      ],
      data: {
        location: "SR",
        role: "dev",
        distance: 40
      },
      random: 1,
      f: () => 0
    },
    {
      name: "Alex",
      message: "how're you?",
      hasAvatar: false,
      quote: "let's do this",
      preserve: "preserve",
      urls: [
        "http://zzzzl.com/ag",
        "https://github.com/alex"
      ],
      data: {
        location: "SJ",
        role: "dir",
        distance: 20
      },
      random: 2,
      f: () => 0
    },
    {
      name: "Arpan",
      message: "how's your kitchen?",
      hasAvatar: true,
      quote: "what's up?",
      preserve: "preserve",
      urls: [
        "http://zzzzl.com/aa",
        "https://github.com/arpan"
      ],
      data: {
        location: "CV",
        role: "dev",
        distance: 30
      },
      random: 3,
      f: () => 0
    }
  ];

  const cacheConfig = {
    components: {
      "Heading": {
        strategy: "simple",
        enable: true
      },
      "Hello": {
        strategy: "simple",
        enable: true
      },
      "Board": {
        strategy: "template",
        enable: false
      },
      "InfoCard": {
        strategy: "template",
        enable: true,
        preserveKeys: ["preserve"],
        preserveEmptyKeys: ["empty"],
        ignoreKeys: ["ignore"],
        whiteListNonStringKeys: ["random", "distance"]
      }
    }
  };

  const verifyAndRemoveUrlProtocol = (r) => {
    expect(r).includes("http://");
    expect(r).includes("https://");
    r = r.replace(/http:/g, "");
    r = r.replace(/https:/g, "");
    return r;
  };

  const testTemplate = (stripUrlProtocol, hashKeys, profiling) => {
    SSRCaching.enableProfiling(profiling);

    let start = Date.now();
    const r1 = renderBoard(users);
    const r1Time = Date.now() - start;

    if (profiling) {
      const data = SSRCaching.profileData;
      expect(data.Board[0].InfoCard[0].time).to.be.above(0);
      SSRCaching.clearProfileData();
      SSRCaching.enableProfiling(false);
    }

    SSRCaching.enableCaching();
    SSRCaching.setCachingConfig(cacheConfig);
    SSRCaching.shouldHashKeys(hashKeys);
    SSRCaching.stripUrlProtocol(stripUrlProtocol);

    start = Date.now();
    let r2 = renderBoard(users);
    const r2Time = Date.now() - start;

    const cache = SSRCaching.cacheStore.cache;
    const keys = Object.keys(cache);
    keys.forEach((x) => {
      expect(cache[x].hits).to.equal(0);
    });

    SSRCaching.enableProfiling(profiling);

    start = Date.now();
    let r3 = renderBoard(users);
    const r3Time = Date.now() - start;

    if (profiling) {
      const data = SSRCaching.profileData;
      expect(data.Board[0].InfoCard[0].time).to.be.above(0);
      SSRCaching.clearProfileData();
    }

    console.log(`rendering time r1 ${r1Time}ms r2 ${r2Time}ms r3 (cached) ${r3Time}ms`);
    expect(r3Time).below(r1Time);
    expect(r3Time).below(r2Time);

    expect(Object.keys(cache)).to.deep.equal(keys);

    keys.forEach((x) => {
      expect(cache[x].hits).to.equal(1);
      if (!hashKeys) {
        expect(x).not.includes("ignore");
      }
    });

    if (!stripUrlProtocol) {
      r2 = verifyAndRemoveUrlProtocol(r2);
      r3 = verifyAndRemoveUrlProtocol(r3);
    }

    verifyRenderResults(r1, r2, r3, !stripUrlProtocol);
  };

  it("should handle other scenarios for template cache", function () {
    testTemplate(false, false, false);
  });

  it("should handle template and strip url protocol", function () {
    testTemplate(true, true, true);
  });

  it("should support debug caching", function () {
    renderBoard(users);
    SSRCaching.enableCaching();
    SSRCaching.enableCachingDebug();
    expect(SSRCaching.config.debug).to.equal(true);
    SSRCaching.enableCachingDebug(false);
    expect(SSRCaching.config.debug).to.equal(false);
    SSRCaching.enableCachingDebug(true);
    expect(SSRCaching.config.debug).to.equal(true);
    SSRCaching.setCachingConfig(cacheConfig);
    SSRCaching.shouldHashKeys(false);
    const r2 = renderBoard(users);
    expect(r2).includes("<!-- component Board cacheType NONE");
    expect(r2).includes("<!-- component InfoCard cacheType cache");
    const r3 = renderBoard(users);
    expect(r3).includes("<!-- component Board cacheType NONE");
    expect(r3).includes("<!-- component InfoCard cacheType HIT");
  });

  it("should throw error for unknown caching strategy", function () {
    const config = JSON.parse(JSON.stringify(cacheConfig));
    config.components.Heading.strategy = "unknown";
    SSRCaching.enableCaching();
    SSRCaching.setCachingConfig(config);
    expect(() => renderBoard(users)).to.throw(Error, /Unknown caching strategy unknown for component Heading/);
  });
});
