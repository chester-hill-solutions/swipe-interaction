import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";

import {
  clampSwipeDragDx,
  horizontalIntentForAllowedDirections,
  isDefaultSwipeExcludedTarget,
  isSwipeDirectionAllowed,
  resolveSwipeDirection,
  shouldCommitSwipe,
  swipeMovementExceedsDeadZone,
  verticalSwipeIntent,
  type SwipeDirection,
} from "./gesture.js";

const SWIPE_CLICK_SUPPRESSION_MIN_HORIZONTAL_DX_PX = 14;
const SWIPE_CLICK_SUPPRESSION_MAX_AGE_MS = 350;

const DEFAULT_ALLOWED_DIRECTIONS: readonly SwipeDirection[] = ["left", "right"];

type UseHorizontalSwipeGestureParams = {
  enabled: boolean;
  allowedDirections?: readonly SwipeDirection[];
  onSwipeCommit?: (direction: SwipeDirection) => void;
  isExcludedTarget?: (target: EventTarget | null) => boolean;
};

export type HorizontalSwipeGestureResult = {
  /** Spread onto the row-level swipe surface owner. Null when swipe is disabled. */
  swipeSurfaceProps: HTMLAttributes<HTMLElement> | null;
  /** Surface capture to suppress synthetic click after horizontal swipe. */
  onClickCapture: (e: React.MouseEvent<HTMLElement>) => void;
  /** Signed drag offset: negative = left, positive = right. Null when idle. */
  dragDx: number | null;
  isDragging: boolean;
};

/**
 * Horizontal row swipe: window listeners are the single authoritative path for move/up/cancel.
 * `setPointerCapture` runs only after horizontal intent is confirmed.
 */
export function useHorizontalSwipeGesture({
  enabled,
  allowedDirections = DEFAULT_ALLOWED_DIRECTIONS,
  onSwipeCommit,
  isExcludedTarget = isDefaultSwipeExcludedTarget,
}: UseHorizontalSwipeGestureParams): HorizontalSwipeGestureResult {
  const allowedDirectionsRef = useRef(allowedDirections);
  allowedDirectionsRef.current = allowedDirections;

  const swipeActiveInputRef = useRef<"pointer" | "touch" | null>(null);
  const swipePointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const swipeTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const swipeDirectionRef = useRef<"horizontal" | "vertical" | null>(null);
  const swipeLastTrackedDxRef = useRef(0);
  const swipeHadHorizontalMovementRef = useRef(false);
  const swipeSurfaceElRef = useRef<HTMLElement | null>(null);
  const swipeWindowListenerCleanupRef = useRef<(() => void) | null>(null);
  const swipeInteractionEndedRef = useRef(false);
  const swipeSuppressFollowingClickRef = useRef(false);
  const swipeClickSuppressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSwipeCommitRef = useRef(onSwipeCommit);
  onSwipeCommitRef.current = onSwipeCommit;

  const [dragDx, setDragDx] = useState<number | null>(null);

  const clearSwipeClickSuppressionTimeout = useCallback(() => {
    const timer = swipeClickSuppressionTimeoutRef.current;
    if (!timer) return;

    clearTimeout(timer);
    swipeClickSuppressionTimeoutRef.current = null;
  }, []);

  const clearSwipeClickSuppression = useCallback(() => {
    clearSwipeClickSuppressionTimeout();
    swipeSuppressFollowingClickRef.current = false;
  }, [clearSwipeClickSuppressionTimeout]);

  const armSwipeClickSuppression = useCallback(() => {
    clearSwipeClickSuppressionTimeout();
    swipeSuppressFollowingClickRef.current = true;
    swipeClickSuppressionTimeoutRef.current = setTimeout(() => {
      swipeSuppressFollowingClickRef.current = false;
      swipeClickSuppressionTimeoutRef.current = null;
    }, SWIPE_CLICK_SUPPRESSION_MAX_AGE_MS);
  }, [clearSwipeClickSuppressionTimeout]);

  const handleClickCapture = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!swipeSuppressFollowingClickRef.current) return;

      clearSwipeClickSuppression();
      e.preventDefault();
      e.stopPropagation();
    },
    [clearSwipeClickSuppression],
  );

  const releaseSwipePointerCapture = (pointerId: number) => {
    const cap = swipeSurfaceElRef.current;
    if (!cap) return;
    try {
      if (cap.hasPointerCapture(pointerId)) {
        cap.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release/capture capability errors (WebKit / detached node).
    }
  };

  const clearSwipeWindowListeners = useCallback(() => {
    const cleanup = swipeWindowListenerCleanupRef.current;
    if (!cleanup) return;
    swipeWindowListenerCleanupRef.current = null;
    cleanup();
  }, []);

  useEffect(() => {
    return () => {
      clearSwipeWindowListeners();
      clearSwipeClickSuppressionTimeout();
    };
  }, [clearSwipeClickSuppressionTimeout, clearSwipeWindowListeners]);

  const swipeGestureHandlers = useMemo(() => {
    if (!enabled || !onSwipeCommit || allowedDirections.length === 0) {
      return null;
    }

    const clearSwipeInteractionState = (
      pointerId: number | null = swipePointerRef.current?.id ?? null,
    ) => {
      swipeInteractionEndedRef.current = true;
      clearSwipeWindowListeners();
      if (pointerId != null) {
        releaseSwipePointerCapture(pointerId);
      }
      swipeActiveInputRef.current = null;
      swipePointerRef.current = null;
      swipeTouchRef.current = null;
      swipeDirectionRef.current = null;
      swipeLastTrackedDxRef.current = 0;
      swipeHadHorizontalMovementRef.current = false;
      swipeSurfaceElRef.current = null;
      setDragDx(null);
    };

    const shouldSuppressClickAfterSwipe = (
      directionBefore: "horizontal" | "vertical" | null,
      hadHorizontalMovement: boolean,
      trackedDx: number,
    ): boolean => {
      return (
        directionBefore === "horizontal" &&
        hadHorizontalMovement &&
        Math.abs(trackedDx) >= SWIPE_CLICK_SUPPRESSION_MIN_HORIZONTAL_DX_PX
      );
    };

    const finishSwipeFromPoint = (
      input: { x: number; y: number },
      start: { x: number; y: number },
      releasePointerId: number | null,
    ) => {
      if (swipeInteractionEndedRef.current) return;

      swipeInteractionEndedRef.current = true;

      clearSwipeWindowListeners();
      if (releasePointerId != null) {
        releaseSwipePointerCapture(releasePointerId);
      }

      const directionBefore = swipeDirectionRef.current;
      const trackedDx = swipeLastTrackedDxRef.current;
      const hadHorizontalMovement = swipeHadHorizontalMovementRef.current;
      const allowed = allowedDirectionsRef.current;

      setDragDx(null);
      swipeActiveInputRef.current = null;
      swipePointerRef.current = null;
      swipeTouchRef.current = null;
      swipeDirectionRef.current = null;
      swipeLastTrackedDxRef.current = 0;
      swipeHadHorizontalMovementRef.current = false;
      swipeSurfaceElRef.current = null;

      const rawDx = input.x - start.x;
      const dx = Math.abs(trackedDx) > Math.abs(rawDx) ? trackedDx : rawDx;
      const dy = input.y - start.y;
      const direction = resolveSwipeDirection(dx);
      const commit = onSwipeCommitRef.current;

      if (
        shouldCommitSwipe(dx, dy) &&
        isSwipeDirectionAllowed(direction, allowed) &&
        commit
      ) {
        armSwipeClickSuppression();
        commit(direction);
        return;
      }

      if (shouldSuppressClickAfterSwipe(directionBefore, hadHorizontalMovement, trackedDx)) {
        armSwipeClickSuppression();
      }
    };

    const finishPointerSwipe = (event: PointerEvent) => {
      if (swipeInteractionEndedRef.current) return;

      const start = swipePointerRef.current;
      if (!start || start.id !== event.pointerId) {
        return;
      }

      finishSwipeFromPoint(
        { x: event.clientX, y: event.clientY },
        { x: start.x, y: start.y },
        event.pointerId,
      );
    };

    type SwipeTouchPoint = {
      identifier: number;
      clientX: number;
      clientY: number;
    };

    type TouchListLike = ArrayLike<SwipeTouchPoint> & {
      item?: (index: number) => SwipeTouchPoint | null;
    };

    const getTouchAtIndex = (touchList: TouchListLike, index: number): SwipeTouchPoint | null => {
      if (typeof touchList.item === "function") {
        const listedTouch = touchList.item(index);
        if (listedTouch) return listedTouch;
      }
      const touchFromIndex = touchList[index];
      return touchFromIndex ?? null;
    };

    const findTouchById = (
      touchList: TouchListLike,
      identifier: number,
    ): SwipeTouchPoint | null => {
      for (let index = 0; index < touchList.length; index += 1) {
        const touch = getTouchAtIndex(touchList, index);
        if (touch?.identifier === identifier) {
          return touch;
        }
      }
      return null;
    };

    const finishTouchSwipe = (touch: SwipeTouchPoint) => {
      if (swipeInteractionEndedRef.current) return;
      const start = swipeTouchRef.current;
      if (!start || start.id !== touch.identifier) return;

      finishSwipeFromPoint(
        { x: touch.clientX, y: touch.clientY },
        { x: start.x, y: start.y },
        null,
      );
    };

    const cancelTouchSwipe = () => {
      if (swipeInteractionEndedRef.current) return;
      const start = swipeTouchRef.current;
      if (!start) return;

      const directionBefore = swipeDirectionRef.current;
      const hadHorizontalMovement = swipeHadHorizontalMovementRef.current;
      const trackedDx = swipeLastTrackedDxRef.current;

      clearSwipeInteractionState();

      if (shouldSuppressClickAfterSwipe(directionBefore, hadHorizontalMovement, trackedDx)) {
        armSwipeClickSuppression();
      }
    };

    const cancelPointerSwipe = (event: PointerEvent) => {
      if (swipeInteractionEndedRef.current) return;

      const start = swipePointerRef.current;
      if (!start || start.id !== event.pointerId) {
        return;
      }

      const directionBefore = swipeDirectionRef.current;
      const hadHorizontalMovement = swipeHadHorizontalMovementRef.current;
      const trackedDx = swipeLastTrackedDxRef.current;

      clearSwipeInteractionState(event.pointerId);

      if (shouldSuppressClickAfterSwipe(directionBefore, hadHorizontalMovement, trackedDx)) {
        armSwipeClickSuppression();
      }
    };

    const trackDrag = (dx: number) => {
      const allowed = allowedDirectionsRef.current;
      const direction = resolveSwipeDirection(dx);
      if (dx !== 0 && !isSwipeDirectionAllowed(direction, allowed)) {
        swipeLastTrackedDxRef.current = 0;
        setDragDx(null);
        return;
      }

      const clampedDx = clampSwipeDragDx(dx);
      swipeLastTrackedDxRef.current = clampedDx;
      swipeHadHorizontalMovementRef.current = clampedDx !== 0;
      setDragDx(clampedDx === 0 ? null : clampedDx);
    };

    const onPointerDownCapture = (e: ReactPointerEvent<HTMLElement>) => {
      const pointerType = e.pointerType as string | undefined;
      if (pointerType === "touch") return;

      const isMouseLikePointer =
        pointerType == null || pointerType === "" || pointerType === "mouse";
      if (isMouseLikePointer && e.button > 0) return;
      if (!isMouseLikePointer && e.isPrimary === false) return;

      clearSwipeClickSuppression();

      if (swipeActiveInputRef.current === "touch") return;
      if (isExcludedTarget(e.target)) return;

      clearSwipeInteractionState();

      swipeActiveInputRef.current = "pointer";
      swipeInteractionEndedRef.current = false;
      swipeDirectionRef.current = null;
      swipeLastTrackedDxRef.current = 0;
      swipeHadHorizontalMovementRef.current = false;
      swipeSurfaceElRef.current = e.currentTarget;
      swipePointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      swipeTouchRef.current = null;

      const pointerId = e.pointerId;

      const onWindowPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        if (swipeInteractionEndedRef.current) return;

        const start = swipePointerRef.current;
        if (!start || start.id !== pointerId) return;

        if (swipeDirectionRef.current === "vertical") return;

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        if (swipeDirectionRef.current === null) {
          if (!swipeMovementExceedsDeadZone(dx, dy)) return;

          if (verticalSwipeIntent(dx, dy)) {
            swipeDirectionRef.current = "vertical";
            clearSwipeInteractionState(pointerId);
            return;
          }
          if (horizontalIntentForAllowedDirections(dx, dy, allowedDirectionsRef.current)) {
            swipeDirectionRef.current = "horizontal";
            const surf = swipeSurfaceElRef.current;
            if (surf) {
              try {
                surf.setPointerCapture(pointerId);
              } catch {
                // WebKit may reject; window listeners continue to drive the gesture.
              }
            }
          } else {
            return;
          }
        }

        if (swipeDirectionRef.current === "horizontal") {
          if (event.cancelable) {
            event.preventDefault();
          }
          trackDrag(dx);
        }
      };

      const onWindowPointerUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        finishPointerSwipe(event);
      };

      const onWindowPointerCancel = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        cancelPointerSwipe(event);
      };

      window.addEventListener("pointermove", onWindowPointerMove, { passive: false });
      window.addEventListener("pointerup", onWindowPointerUp);
      window.addEventListener("pointercancel", onWindowPointerCancel);
      swipeWindowListenerCleanupRef.current = () => {
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", onWindowPointerUp);
        window.removeEventListener("pointercancel", onWindowPointerCancel);
      };
    };

    const onTouchStartCapture = (e: ReactTouchEvent<HTMLElement>) => {
      clearSwipeClickSuppression();

      if (swipeActiveInputRef.current === "pointer") return;
      if (e.touches.length !== 1) return;
      if (isExcludedTarget(e.target)) return;

      const touch = getTouchAtIndex(e.changedTouches as unknown as TouchListLike, 0);
      if (!touch) return;

      clearSwipeInteractionState();

      swipeActiveInputRef.current = "touch";
      swipeInteractionEndedRef.current = false;
      swipeDirectionRef.current = null;
      swipeLastTrackedDxRef.current = 0;
      swipeHadHorizontalMovementRef.current = false;
      swipeSurfaceElRef.current = e.currentTarget;
      swipeTouchRef.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
      swipePointerRef.current = null;

      const touchId = touch.identifier;

      const onWindowTouchMove = (event: TouchEvent) => {
        if (swipeInteractionEndedRef.current) return;

        const start = swipeTouchRef.current;
        if (!start || start.id !== touchId) return;

        const activeTouch = findTouchById(event.touches as unknown as TouchListLike, touchId);
        if (!activeTouch) return;

        if (swipeDirectionRef.current === "vertical") return;

        const dx = activeTouch.clientX - start.x;
        const dy = activeTouch.clientY - start.y;

        if (swipeDirectionRef.current === null) {
          if (!swipeMovementExceedsDeadZone(dx, dy)) return;

          if (verticalSwipeIntent(dx, dy)) {
            swipeDirectionRef.current = "vertical";
            clearSwipeInteractionState();
            return;
          }
          if (horizontalIntentForAllowedDirections(dx, dy, allowedDirectionsRef.current)) {
            swipeDirectionRef.current = "horizontal";
          } else {
            return;
          }
        }

        if (swipeDirectionRef.current === "horizontal") {
          if (event.cancelable) {
            event.preventDefault();
          }
          trackDrag(dx);
        }
      };

      const onWindowTouchEnd = (event: TouchEvent) => {
        const endedTouch = findTouchById(event.changedTouches as unknown as TouchListLike, touchId);
        if (!endedTouch) return;
        finishTouchSwipe(endedTouch);
      };

      const onWindowTouchCancel = (event: TouchEvent) => {
        const canceledTouch = findTouchById(
          event.changedTouches as unknown as TouchListLike,
          touchId,
        );
        if (!canceledTouch) return;
        cancelTouchSwipe();
      };

      window.addEventListener("touchmove", onWindowTouchMove, {
        capture: true,
        passive: false,
      });
      window.addEventListener("touchend", onWindowTouchEnd);
      window.addEventListener("touchcancel", onWindowTouchCancel);
      swipeWindowListenerCleanupRef.current = () => {
        window.removeEventListener("touchmove", onWindowTouchMove, true);
        window.removeEventListener("touchend", onWindowTouchEnd);
        window.removeEventListener("touchcancel", onWindowTouchCancel);
      };
    };

    return { onPointerDownCapture, onTouchStartCapture };
  }, [
    allowedDirections,
    armSwipeClickSuppression,
    clearSwipeClickSuppression,
    clearSwipeWindowListeners,
    enabled,
    isExcludedTarget,
    onSwipeCommit,
  ]);

  const swipeSurfaceProps = useMemo((): HTMLAttributes<HTMLElement> | null => {
    if (!swipeGestureHandlers) return null;

    return {
      ...swipeGestureHandlers,
      style: { touchAction: "pan-y pinch-zoom" },
    };
  }, [swipeGestureHandlers]);

  return {
    swipeSurfaceProps,
    onClickCapture: handleClickCapture,
    dragDx,
    isDragging: dragDx != null && dragDx !== 0,
  };
}
