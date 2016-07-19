"use strict";

// test profiling feature

const SSRProfiler = require("../..");
const renderGreeting = require("../gen-lib/render-greeting").default;
const chai = require("chai");
const expect = chai.expect;
process.env.NODE_ENV = "production";

describe("SSRProfiler simple caching", function () {

  afterEach(() => {
    SSRProfiler.setCachingConfig({});
    SSRProfiler.clearCache();
    SSRProfiler.clearProfileData();
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
  it("should cache component with simple strategy", function () {
    const message = "how're you?";
    const r1 = renderGreeting("test", message);

    SSRProfiler.enableCaching();
    SSRProfiler.setCachingConfig({
      components: {
        "Hello": {
          strategy: "simple",
          enable: true,
          genCacheKey: () => "key-simple"
        }
      }
    });
    // should add an entry to cache with key-simple
    SSRProfiler.setHashKey(false);
    renderGreeting("test", message);
    expect(SSRProfiler.cacheStore.getEntry("Hello", "key-simple").hits).to.equal(1);
    // should add an entry to cache with hashed key from key-simple
    SSRProfiler.setHashKey(true);
    const r2 = renderGreeting("test", message);
    const entry = SSRProfiler.cacheStore.getEntry("Hello", "1357465574333202611");
    expect(entry.hits).to.equal(1);
    // now render should use result from cache
    const r3 = renderGreeting("test", message);
    expect(entry.hits).to.equal(2);
    verifyRenderResults(r1, r2, r3);
  });

  //
  // test simple strategy with JSON.stringify on props to generate cache key
  //
  it("should cache component with simple strategy and stringify", function () {
    const message = "good morning";
    SSRProfiler.enableProfiling(true);
    const r1 = renderGreeting("test", message);
    const data = SSRProfiler.profileData;
    expect(data.Greeting[0].Hello[0].time).to.be.above(0);
    SSRProfiler.enableProfiling(false);
    SSRProfiler.clearProfileData();
    expect(data).to.deep.equal({});
    SSRProfiler.enableCaching();
    SSRProfiler.setCachingConfig({
      components: {
        "Hello": {
          strategy: "simple",
          enable: true
        }
      }
    });
    // should add an entry to cache with stringified props as cache key
    SSRProfiler.setHashKey(false);
    renderGreeting("test", message);
    expect(SSRProfiler.cacheStore.getEntry("Hello", JSON.stringify({name: "test", message})).hits).to.equal(1);
    // should add an entry to cache with hashed value of key
    SSRProfiler.setHashKey(true);
    const r2 = renderGreeting("test", message);
    const entry = SSRProfiler.cacheStore.getEntry("Hello", "2422985312975527455");
    expect(entry.hits).to.equal(1);
    // now render should use result from cache
    SSRProfiler.enableProfiling(true);
    const r3 = renderGreeting("test", message);
    expect(data.Greeting[0].Hello[0].time).to.be.above(0);
    expect(entry.hits).to.equal(2);
    verifyRenderResults(r1, r2, r3);
  });
});
