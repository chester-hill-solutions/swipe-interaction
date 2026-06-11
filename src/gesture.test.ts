/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import {
  clampSwipeDragDx,
  horizontalSwipeIntent,
  isDefaultSwipeExcludedTarget,
  leftDragPxFromDx,
  leftSwipeIntent,
  rightSwipeIntent,
  shouldCommitSwipe,
  shouldShowSwipeDragReveal,
  swipeMovementExceedsDeadZone,
  verticalSwipeIntent,
} from "./gesture.js";

describe("gesture", () => {
  it("clampSwipeDragDx clamps to symmetric limit", () => {
    expect(clampSwipeDragDx(0)).toBe(0);
    expect(clampSwipeDragDx(200)).toBe(96);
    expect(clampSwipeDragDx(-200)).toBe(-96);
  });

  it("leftDragPxFromDx returns positive left distance", () => {
    expect(leftDragPxFromDx(null)).toBeNull();
    expect(leftDragPxFromDx(10)).toBeNull();
    expect(leftDragPxFromDx(-24)).toBe(24);
  });

  it("swipeMovementExceedsDeadZone respects 5px threshold", () => {
    expect(swipeMovementExceedsDeadZone(0, 0)).toBe(false);
    expect(swipeMovementExceedsDeadZone(4, 0)).toBe(false);
    expect(swipeMovementExceedsDeadZone(5, 0)).toBe(true);
    expect(swipeMovementExceedsDeadZone(0, 5)).toBe(true);
  });

  it("shouldCommitSwipe uses min dx and horizontal dominance", () => {
    expect(shouldCommitSwipe(33, 0)).toBe(false);
    expect(shouldCommitSwipe(34, 0)).toBe(true);
    expect(shouldCommitSwipe(-34, 0)).toBe(true);
    expect(shouldCommitSwipe(43, 40)).toBe(false);
    expect(shouldCommitSwipe(44, 40)).toBe(true);
  });

  it("shouldShowSwipeDragReveal uses tint threshold", () => {
    expect(shouldShowSwipeDragReveal(null)).toBe(false);
    expect(shouldShowSwipeDragReveal(23)).toBe(false);
    expect(shouldShowSwipeDragReveal(24)).toBe(true);
    expect(shouldShowSwipeDragReveal(-24)).toBe(true);
  });

  it("horizontalSwipeIntent requires dominant horizontal movement", () => {
    expect(horizontalSwipeIntent(5, 0)).toBe(false);
    expect(horizontalSwipeIntent(6, 0)).toBe(true);
    expect(horizontalSwipeIntent(7, 8)).toBe(false);
    expect(horizontalSwipeIntent(8, 7)).toBe(true);
  });

  it("leftSwipeIntent and rightSwipeIntent are direction-specific", () => {
    expect(leftSwipeIntent(-6, 0)).toBe(true);
    expect(leftSwipeIntent(6, 0)).toBe(false);
    expect(rightSwipeIntent(6, 0)).toBe(true);
    expect(rightSwipeIntent(-6, 0)).toBe(false);
  });

  it("verticalSwipeIntent only when vertical clearly dominates", () => {
    expect(verticalSwipeIntent(0, 4)).toBe(false);
    expect(verticalSwipeIntent(2, 5)).toBe(true);
    expect(verticalSwipeIntent(10, 14)).toBe(false);
    expect(verticalSwipeIntent(10, 19)).toBe(true);
  });

  it("detects excluded interactive targets", () => {
    document.body.innerHTML = `
      <div id="root">
        <button id="btn">Save</button>
        <div id="plain">Swipe me</div>
      </div>
    `;
    const btn = document.getElementById("btn");
    const plain = document.getElementById("plain");
    expect(isDefaultSwipeExcludedTarget(btn)).toBe(true);
    expect(isDefaultSwipeExcludedTarget(plain)).toBe(false);
  });
});
