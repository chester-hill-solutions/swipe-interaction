/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import {
  clampSwipeDragDx,
  dragDistanceForDirection,
  horizontalSwipeIntent,
  isDefaultSwipeExcludedTarget,
  leftDragPxFromDx,
  leftSwipeIntent,
  resolveSwipeThresholds,
  rightDragPxFromDx,
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

  it("clampSwipeDragDx respects custom drag clamp", () => {
    expect(clampSwipeDragDx(80, 40)).toBe(40);
    expect(clampSwipeDragDx(-80, 40)).toBe(-40);
  });

  it("leftDragPxFromDx returns positive left distance", () => {
    expect(leftDragPxFromDx(null)).toBeNull();
    expect(leftDragPxFromDx(10)).toBeNull();
    expect(leftDragPxFromDx(-24)).toBe(24);
  });

  it("rightDragPxFromDx returns positive right distance", () => {
    expect(rightDragPxFromDx(null)).toBeNull();
    expect(rightDragPxFromDx(-10)).toBeNull();
    expect(rightDragPxFromDx(24)).toBe(24);
  });

  it("dragDistanceForDirection maps signed drag to direction distance", () => {
    expect(dragDistanceForDirection(-24, "left")).toBe(24);
    expect(dragDistanceForDirection(24, "right")).toBe(24);
    expect(dragDistanceForDirection(24, "left")).toBeNull();
  });

  it("resolveSwipeThresholds fills defaults", () => {
    expect(resolveSwipeThresholds()).toEqual({
      commitMinDx: 34,
      dragClampPx: 96,
      dragRevealMinDx: 24,
      horizontalIntentMinDx: 6,
    });
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

  it("shouldCommitSwipe respects custom commit threshold", () => {
    expect(shouldCommitSwipe(20, 0, 20)).toBe(true);
    expect(shouldCommitSwipe(19, 0, 20)).toBe(false);
  });

  it("shouldShowSwipeDragReveal uses tint threshold", () => {
    expect(shouldShowSwipeDragReveal(null)).toBe(false);
    expect(shouldShowSwipeDragReveal(23)).toBe(false);
    expect(shouldShowSwipeDragReveal(24)).toBe(true);
    expect(shouldShowSwipeDragReveal(-24)).toBe(true);
  });

  it("shouldShowSwipeDragReveal respects custom reveal threshold", () => {
    expect(shouldShowSwipeDragReveal(15, 16)).toBe(false);
    expect(shouldShowSwipeDragReveal(16, 16)).toBe(true);
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
