"use strict";

// test hash key feature

const SSRCaching = require("../..");
const Module = require("module");

describe("shouldHashKeys", function () {
  it("should enable with custom function", function () {
    SSRCaching.shouldHashKeys(true, (s) => {
      return `test${s}`;
    });
    expect(SSRCaching.hashKeyFn("1")).to.equal("test1");
  });

  it("should disable with false", function () {
    SSRCaching.shouldHashKeys(true, () => 0);
    expect(typeof SSRCaching.hashKeyFn).to.equal("function");
    SSRCaching.shouldHashKeys(false);
    expect(SSRCaching.hashKeyFn("12345")).to.equal("12345");
  });

  it("should use FarmHash", function () {
    SSRCaching.shouldHashKeys(true);
    expect(SSRCaching.hashKeyFn("hello, world")).to.equal("12299089882482858311");
  });

  it("should disable if farmhash missing", function () {
    const req = Module.prototype.require;
    Module.prototype.require = () => {
      throw new Error("not found");
    };
    SSRCaching.shouldHashKeys(true);
    expect(SSRCaching.hashKeyFn("12345")).to.equal("12345");
    expect(SSRCaching.config.hashKey).to.equal(false);
    Module.prototype.require = req;
  });
});
