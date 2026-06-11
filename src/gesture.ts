/** Horizontal row swipe thresholds and pure gesture helpers. */

export type SwipeDirection = "left" | "right";

export type SwipeThresholds = {
  commitMinDx?: number;
  dragClampPx?: number;
  dragRevealMinDx?: number;
  horizontalIntentMinDx?: number;
};

/** Max horizontal offset shown while dragging (visual rubber limit). */
export const SWIPE_DRAG_CLAMP_PX = 96;

/** Ignore tiny jitter before updating drag visuals. */
export const SWIPE_MOVE_DEAD_ZONE_PX = 5;

/** Horizontal intent requires a clearer x-axis lead before locking swipe tracking. */
export const SWIPE_HORIZONTAL_INTENT_MIN_DX = 6;

/** Vertical abandon once |dy| clearly dominates |dx| (prefer scroll over accidental swipe). */
export const SWIPE_VERTICAL_INTENT_DOMINANCE_RATIO = 1.8;

/** Minimum horizontal travel to commit swipe on pointer up. */
export const SWIPE_COMMIT_MIN_DX_PX = 34;

/** Horizontal movement must dominate vertical by this ratio to commit. */
export const SWIPE_COMMIT_DOMINANCE_RATIO = 1.1;

/** Row tint / edge reveal while dragging (below commit threshold). */
export const SWIPE_DRAG_TINT_MIN_DX_PX = 24;

export function resolveSwipeThresholds(
  thresholds?: SwipeThresholds,
): Required<SwipeThresholds> {
  return {
    commitMinDx: thresholds?.commitMinDx ?? SWIPE_COMMIT_MIN_DX_PX,
    dragClampPx: thresholds?.dragClampPx ?? SWIPE_DRAG_CLAMP_PX,
    dragRevealMinDx: thresholds?.dragRevealMinDx ?? SWIPE_DRAG_TINT_MIN_DX_PX,
    horizontalIntentMinDx:
      thresholds?.horizontalIntentMinDx ?? SWIPE_HORIZONTAL_INTENT_MIN_DX,
  };
}

export function clampSwipeDragDx(
  dx: number,
  dragClampPx: number = SWIPE_DRAG_CLAMP_PX,
): number {
  return Math.round(Math.max(-dragClampPx, Math.min(dragClampPx, dx)));
}

export function leftDragPxFromDx(dragDx: number | null): number | null {
  if (dragDx == null || dragDx >= 0) return null;
  return -dragDx;
}

export function rightDragPxFromDx(dragDx: number | null): number | null {
  if (dragDx == null || dragDx <= 0) return null;
  return dragDx;
}

export function dragDistanceForDirection(
  dragDx: number | null,
  direction: SwipeDirection,
): number | null {
  if (direction === "left") {
    return leftDragPxFromDx(dragDx);
  }
  return rightDragPxFromDx(dragDx);
}

export function resolveSwipeDirection(dx: number): SwipeDirection {
  return dx < 0 ? "left" : "right";
}

export function isSwipeDirectionAllowed(
  direction: SwipeDirection,
  allowedDirections: readonly SwipeDirection[],
): boolean {
  return allowedDirections.includes(direction);
}

/** True once movement leaves the dead zone (either axis). */
export function swipeMovementExceedsDeadZone(dx: number, dy: number): boolean {
  return Math.abs(dx) >= SWIPE_MOVE_DEAD_ZONE_PX || Math.abs(dy) >= SWIPE_MOVE_DEAD_ZONE_PX;
}

/** Whether release should commit the swipe (pointer up, relative to start). */
export function shouldCommitSwipe(
  dx: number,
  dy: number,
  commitMinDx: number = SWIPE_COMMIT_MIN_DX_PX,
): boolean {
  if (Math.abs(dx) < commitMinDx) return false;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_COMMIT_DOMINANCE_RATIO) return false;
  return true;
}

/** Whether to show drag tint / reveal at current signed drag offset. */
export function shouldShowSwipeDragReveal(
  dragDx: number | null,
  dragRevealMinDx: number = SWIPE_DRAG_TINT_MIN_DX_PX,
): boolean {
  if (dragDx == null) return false;
  return Math.abs(dragDx) >= dragRevealMinDx;
}

/**
 * True when the finger is clearly moving horizontally (track drag).
 * Uses a slightly lower min |dx| than the dead zone so ties and shallow diagonals can still lock horizontal.
 */
export function horizontalSwipeIntent(
  dx: number,
  dy: number,
  minAbsDx: number = SWIPE_HORIZONTAL_INTENT_MIN_DX,
): boolean {
  return Math.abs(dx) >= minAbsDx && Math.abs(dx) >= Math.abs(dy);
}

export function leftSwipeIntent(
  dx: number,
  dy: number,
  minAbsDx: number = SWIPE_HORIZONTAL_INTENT_MIN_DX,
): boolean {
  return dx <= -minAbsDx && Math.abs(dx) >= Math.abs(dy);
}

export function rightSwipeIntent(
  dx: number,
  dy: number,
  minAbsDx: number = SWIPE_HORIZONTAL_INTENT_MIN_DX,
): boolean {
  return dx >= minAbsDx && Math.abs(dx) >= Math.abs(dy);
}

export function horizontalIntentForAllowedDirections(
  dx: number,
  dy: number,
  allowedDirections: readonly SwipeDirection[],
  minAbsDx: number = SWIPE_HORIZONTAL_INTENT_MIN_DX,
): boolean {
  if (allowedDirections.length === 1 && allowedDirections[0] === "left") {
    return leftSwipeIntent(dx, dy, minAbsDx);
  }
  if (allowedDirections.length === 1 && allowedDirections[0] === "right") {
    return rightSwipeIntent(dx, dy, minAbsDx);
  }
  return horizontalSwipeIntent(dx, dy, minAbsDx);
}

/**
 * True when movement is clearly a vertical scroll, not a horizontal row swipe.
 * Stricter than “not horizontal” so we keep tracking while the gesture is still ambiguous.
 */
export function verticalSwipeIntent(dx: number, dy: number): boolean {
  return (
    Math.abs(dy) >= SWIPE_MOVE_DEAD_ZONE_PX &&
    Math.abs(dy) > Math.abs(dx) * SWIPE_VERTICAL_INTENT_DOMINANCE_RATIO
  );
}

/** Skip starting a row swipe on real controls (not `a`: row links may still start swipe). */
export function isDefaultSwipeExcludedTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    ? target.closest("button, input, textarea, select, label, [contenteditable='true']") !==
        null
    : false;
}
