"use strict";

// test hash key feature

const SSRProfiler = require("../..");
const Module = require("module");

describe("shouldHashKeys", function () {
  it("should enable with custom function", function () {
    SSRProfiler.shouldHashKeys(true, (s) => {
      return `test${s}`;
    });
    expect(SSRProfiler.hashKeyFn("1")).to.equal("test1");
  });

  it("should disable with false", function () {
    SSRProfiler.shouldHashKeys(true, () => 0);
    expect(typeof SSRProfiler.hashKeyFn).to.equal("function");
    SSRProfiler.shouldHashKeys(false);
    expect(SSRProfiler.hashKeyFn("12345")).to.equal("12345");
  });

  it("should use FarmHash", function () {
    SSRProfiler.shouldHashKeys(true);
    expect(SSRProfiler.hashKeyFn("hello, world")).to.equal("12299089882482858311");
  });

  it("should disable if farmhash missing", function () {
    const req = Module.prototype.require;
    Module.prototype.require = () => {
      throw new Error("not found");
    };
    SSRProfiler.shouldHashKeys(true);
    expect(SSRProfiler.hashKeyFn("12345")).to.equal("12345");
    expect(SSRProfiler.config.hashKey).to.equal(false);
    Module.prototype.require = req;
  });
});
