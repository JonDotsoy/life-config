import assert from "assert";
import { HTTPSource } from "life-config/sources/http-source";

assert(
  typeof HTTPSource === "function",
  'expect import("life-config/sources/http-source").HTTPSource is a function',
);
