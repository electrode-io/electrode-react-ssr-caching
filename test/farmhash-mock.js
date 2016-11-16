"use strict";

const mock = require("mock-require");
const crypto = require("crypto");

mock("farmhash", {
  hash64: function (s) {
    const hash = crypto.createHmac("md5", "")
      .update(s)
      .digest("hex");

    return hash;
  }
});
