const assert = require("assert");
const { LifeConfig } = require("life-config");

assert(
  typeof LifeConfig === "function",
  'expect import("life-config").LifeConfig is a function',
);
