"use strict";

// test hash key feature

const SSRProfiler = require("../..");
const Module = require("module");

describe("setHashKey", function () {
  it("should enable with custom function", function () {
    SSRProfiler.setHashKey(true, (s) => {
      return `test${s}`;
    });
    expect(SSRProfiler.hashKeyFn("1")).to.equal("test1");
  });

  it("should disable with false", function () {
    SSRProfiler.setHashKey(true, () => 0);
    expect(typeof SSRProfiler.hashKeyFn).to.equal("function");
    SSRProfiler.setHashKey(false);
    expect(SSRProfiler.hashKeyFn).to.equal(undefined);
  });

  it("should use FarmHash", function () {
    SSRProfiler.setHashKey(true);
    expect(SSRProfiler.hashKeyFn("hello, world")).to.equal("12299089882482858311");
  });

  it("should disable if farmhash missing", function () {
    const req = Module.prototype.require;
    Module.prototype.require = () => {
      throw new Error("not found");
    };
    SSRProfiler.setHashKey(true);
    expect(SSRProfiler.hashKeyFn).to.equal(undefined);
    expect(SSRProfiler.config.hashKey).to.equal(false);
    Module.prototype.require = req;
  });
});
