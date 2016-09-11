"use strict";

// test profiling feature

const SSRCaching = require("../..");
const renderGreeting = require("../gen-lib/render-greeting").default;

describe("SSRCaching", function () {
  beforeEach(() => {
    SSRCaching.enableCaching(false);
    SSRCaching.enableProfiling(false);
    SSRCaching.clearProfileData();
  });

  it("should not do anyting if profiling and caching disabled", function () {
    renderGreeting("test");
    expect(SSRCaching.profileData).to.deep.equal({});
  });

  it("should not generate profiling data when it's disabled", function () {
    SSRCaching.enableCaching();
    SSRCaching.enableProfiling(false);
    renderGreeting("test");
    expect(SSRCaching.profileData).to.deep.equal({});
  });

  it("should generate profiling data for SSR component", function () {
    SSRCaching.enableProfiling(true);
    renderGreeting("test");
    expect(SSRCaching.profileData.Greeting[0].time).to.be.above(0);
    expect(SSRCaching.profileData.Greeting[0].Hello[0].time).to.be.above(0);
    SSRCaching.clearProfileData();
    expect(SSRCaching.profileData).to.deep.equal({});
  });
});
