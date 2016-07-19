"use strict";

// test profiling feature

const SSRProfiler = require("../..");
const renderGreeting = require("../gen-lib/render-greeting").default;
const chai = require("chai");
const expect = chai.expect;
process.env.NODE_ENV = "production";

describe("SSRProfiler template caching", function () {

  beforeEach(() => {
    SSRProfiler.setCachingConfig({});
    SSRProfiler.clearCache();
    SSRProfiler.clearProfileData();
    SSRProfiler.enableCaching(false);
    SSRProfiler.enableProfiling(false);
  });

  function removeReactId(html) {
    const x = html.replace(/data-reactid\=\"[^\"]+\"/g, "");
    return x.replace(/data-react-checksum\=\"[^\"]+\"/g, "").replace(/ *>/g, ">");
  }

  const verifyRenderResults = (r1, r2, r3) => {
    chai.assert(r1 !== r2, "render1 and render2 should be different");
    chai.assert(r1 !== r3, "render1 and render3 should be different");
    chai.assert(r2 !== r3, "render2 and render3 should be different");
    r1 = removeReactId(r1);
    r2 = removeReactId(r2);
    r3 = removeReactId(r3);
    chai.assert(r1 === r2, "render1 and render2 should be the same");
    chai.assert(r1 === r3, "render1 and render3 should be the same");
    chai.assert(r2 === r3, "render2 and render3 should be the same");
  };

  //
  // test simple strategy with user provided function to generate cache key
  //
  it("should cache component with template strategy", function () {
    const message = "good morning";
    const r1 = renderGreeting("test", message);
    SSRProfiler.enableCaching();
    SSRProfiler.setCachingConfig({
      components: {
        "Hello": {
          strategy: "template",
          enable: true
        }
      }
    });
    // should add an entry to cache with template key
    SSRProfiler.stripUrlProtocol(true);
    SSRProfiler.setHashKey(false);
    renderGreeting("test", message);
    const key1 = Object.keys(SSRProfiler.cacheStore.cache)[0];
    const keyTmpl = key1.substr(6);
    const entry1 = SSRProfiler.cacheStore.getEntry("Hello", keyTmpl);
    expect(entry1.hits).to.equal(1);
    // should add an entry to cache with hashed key from template key
    SSRProfiler.setHashKey(true);
    const hashKey = SSRProfiler.hashKeyFn(keyTmpl);
    const r2 = renderGreeting("test", message);
    const entry = SSRProfiler.cacheStore.getEntry("Hello", hashKey);
    expect(entry.hits).to.equal(1);
    // now render should use result from cache
    const r3 = renderGreeting("test", message);
    expect(entry.hits).to.equal(2);
    expect(r2).includes(message);
    verifyRenderResults(r1, r2, r3);
    SSRProfiler.cacheHitReport();
    expect(SSRProfiler.cacheEntries()).to.equal(2);
    expect(SSRProfiler.cacheSize()).to.be.above(0);
  });
});
