"use strict";

// test cache store feature

const CacheStore = require("../../lib/cache-store");

describe("CacheStore", function () {
  it("should cache entry", function () {
    const cacheStore = new CacheStore({
      cacheExpireTime: 200,
      MAX_CACHE_SIZE: 1024,
      minFreeCacheSize: 200,
      maxFreeCacheSize: 400
    });
    expect(cacheStore.getEntry("test", "1")).to.equal(undefined);
    cacheStore.newEntry("test", "1", {html: "hello"});
    expect(cacheStore.getEntry("test", "1")).to.be.ok;
    expect(cacheStore.getEntry("test", "1").html).to.equal("hello");
    expect(cacheStore.getEntry("test", "1").hits).to.equal(3);
  });

  it("should free up cache", function (done) {
    const cacheStore = new CacheStore({
      cacheExpireTime: 100,
      MAX_CACHE_SIZE: 85,
      minFreeCacheSize: 20,
      maxFreeCacheSize: 40
    });
    cacheStore.newEntry("test", "1", {html: "hello1"});
    cacheStore.newEntry("test", "2", {html: "hello2"});
    cacheStore.newEntry("test", "3", {html: "hello3"});
    cacheStore.newEntry("test", "4", {html: "hello4"});
    cacheStore.newEntry("test", "5", {html: "hello5"});
    cacheStore.newEntry("test", "6", {html: "hello6"});
    cacheStore.newEntry("test", "7", {html: "hello7"});
    setTimeout(() => {
      cacheStore.getEntry("test", "5");
      cacheStore.newEntry("foobar", "1", {html: "blahblahblahblahblah"});
      expect(Object.keys(cacheStore.cache)).includes("test-4", "test-6", "test-5", "foobar-1");
      cacheStore.newEntry("foobar", "2", {html: "blahblahblahblahblah"});
      expect(Object.keys(cacheStore.cache)).to.deep.equal(["test-5", "foobar-1", "foobar-2"]);
      done();
    }, 90);
  });
});
