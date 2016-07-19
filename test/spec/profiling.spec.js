"use strict";

// test profiling feature

const SSRProfiler = require("../..");
const renderGreeting = require("../gen-lib/render-greeting").default;

describe("SSRProfiler", function () {
  beforeEach(() => {
    SSRProfiler.enableCaching(false);
    SSRProfiler.enableProfiling(false);
    SSRProfiler.clearProfileData();
  });

  it("should not do anyting if profiling and caching disabled", function () {
    renderGreeting("test");
    expect(SSRProfiler.profileData).to.deep.equal({});
  });

  it("should not generate profiling data when it's disabled", function () {
    SSRProfiler.enableCaching();
    SSRProfiler.enableProfiling(false);
    renderGreeting("test");
    expect(SSRProfiler.profileData).to.deep.equal({});
  });

  it("should generate profiling data for SSR component", function () {
    SSRProfiler.enableProfiling(true);
    renderGreeting("test");
    expect(SSRProfiler.profileData.Greeting[0].time).to.be.above(0);
    expect(SSRProfiler.profileData.Greeting[0].Hello[0].time).to.be.above(0);
    SSRProfiler.clearProfileData();
    expect(SSRProfiler.profileData).to.deep.equal({});
  });
});
