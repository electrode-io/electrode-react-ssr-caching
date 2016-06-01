"use strict";

const Module = require("module");
const original = require("react/lib/instantiateReactComponent");
const assert = require("assert");

let enabled = false;
const profileData = {};

function mountComponentProfiler(rootID, transaction, context) {
  const a = process.hrtime();
  const r = this._mountComponent(rootID, transaction, context);
  const d = process.hrtime(a);
  const name = this._name;

  const owner = this._currentElement._owner;
  if (owner) {
    // if current element has an owner, then push its render time into owner's timing hierarchy
    (owner.__p[name] || (owner.__p[name] = [])).push(this.__p);
  } else {
    // else save timing in profiling data
    (profileData[name] || (profileData[name] = [])).push(this.__p);
  }

  assert(this.__p.time === undefined);
  this.__p.time = d[0] * 1000.0 + d[1] / 1000000.0;

  return r;
}

function instantiateReactComponent(node) {
  const instance = original(node);
  if (!instance || !enabled || !node || !node.type || !instance.mountComponent || typeof node.type === "string") {
    return instance;
  }

  const name = node.type.name || node.type.displayName;

  if (!name) {
    return instance;
  }

  assert(!instance.__p);

  if (instance._instantiateReactComponent) {
    instance._instantiateReactComponent = instantiateReactComponent;
  }

  instance.__p = {time: undefined};
  instance._name = name;
  instance._mountComponent = instance.mountComponent;
  instance.mountComponent = mountComponentProfiler;

  return instance;
}

const _load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "./instantiateReactComponent") {
    return instantiateReactComponent;
  }
  return _load.apply(this, [request, parent, isMain]);
};

exports.enable = function (flag) {
  enabled = flag === undefined || !!flag;
};

exports.profileData = profileData;

exports.clearProfileData = function () {
  Object.keys(profileData).forEach((k) => {
    delete profileData[k];
  });
};
