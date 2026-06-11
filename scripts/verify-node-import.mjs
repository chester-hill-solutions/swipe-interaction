import { leftDragPxFromDx, useHorizontalSwipeGesture } from "../dist/index.js";
import { shouldShowSwipeDragReveal } from "../dist/gesture.js";

if (leftDragPxFromDx(-10) !== 10) {
  throw new Error("expected leftDragPxFromDx(-10) to be 10");
}

if (typeof useHorizontalSwipeGesture !== "function") {
  throw new Error("expected useHorizontalSwipeGesture export");
}

if (!shouldShowSwipeDragReveal(-24)) {
  throw new Error("expected gesture subpath import to work");
}

console.log("Node ESM import from dist/ OK");
