import { leftDragPxFromDx, type SwipeThresholds } from "./gesture.js";
import {
  useHorizontalSwipeGesture,
  type HorizontalSwipeGestureResult,
} from "./use-horizontal-swipe-gesture.js";

export type UseLeftSwipeRowParams = {
  enabled: boolean;
  onCommit?: () => void;
  isExcludedTarget?: (target: EventTarget | null) => boolean;
  thresholds?: SwipeThresholds;
  onSwipeStart?: () => void;
  onSwipeCancel?: () => void;
  onDragChange?: (dragLeftPx: number | null) => void;
};

export type LeftSwipeRowResult = {
  swipeSurfaceProps: HorizontalSwipeGestureResult["swipeSurfaceProps"];
  onClickCapture: HorizontalSwipeGestureResult["onClickCapture"];
  dragLeftPx: number | null;
  isDragging: boolean;
};

/** Convenience wrapper for the common left-only row swipe pattern. */
export function useLeftSwipeRow({
  enabled,
  onCommit,
  isExcludedTarget,
  thresholds,
  onSwipeStart,
  onSwipeCancel,
  onDragChange,
}: UseLeftSwipeRowParams): LeftSwipeRowResult {
  const result = useHorizontalSwipeGesture({
    enabled,
    allowedDirections: ["left"],
    onSwipeCommit: onCommit ? () => onCommit() : undefined,
    isExcludedTarget,
    thresholds,
    onSwipeStart: onSwipeStart
      ? (direction) => {
          if (direction === "left" || direction === null) {
            onSwipeStart();
          }
        }
      : undefined,
    onSwipeCancel,
    onDragChange: onDragChange
      ? (dragDx) => {
          onDragChange(leftDragPxFromDx(dragDx));
        }
      : undefined,
  });

  const dragLeftPx = leftDragPxFromDx(result.dragDx);

  return {
    swipeSurfaceProps: result.swipeSurfaceProps,
    onClickCapture: result.onClickCapture,
    dragLeftPx,
    isDragging: dragLeftPx != null && dragLeftPx > 0,
  };
}
