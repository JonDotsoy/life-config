const assert = require("assert");
const { HTTPSource } = require("life-config/sources/http-source");

assert(
  typeof HTTPSource === "function",
  'expect import("life-config/sources/http-source").HTTPSource is a function',
);
