import assert from "assert";
import { LifeConfig } from "life-config";

assert(
  typeof LifeConfig === "function",
  'expect import("life-config").LifeConfig is a function',
);
