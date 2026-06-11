import { leftDragPxFromDx } from "../dist/index.js";

if (leftDragPxFromDx(-10) !== 10) {
  throw new Error("expected leftDragPxFromDx(-10) to be 10");
}

console.log("Node ESM import from dist/ OK");
