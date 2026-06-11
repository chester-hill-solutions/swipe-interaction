/**
 * @vitest-environment jsdom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHorizontalSwipeGesture } from "./use-horizontal-swipe-gesture.js";

function firePointerDown(
  target: Element,
  clientX: number,
  clientY: number,
  pointerId = 1,
) {
  target.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId,
      isPrimary: true,
      button: 0,
      buttons: 1,
    }),
  );
}

function firePointerOnWindow(
  type: string,
  clientX: number,
  clientY: number,
  pointerId = 1,
) {
  window.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId,
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
    }),
  );
}

function fireTouchStart(target: Element, touch: { identifier: number; clientX: number; clientY: number }) {
  target.dispatchEvent(
    new TouchEvent("touchstart", {
      bubbles: true,
      cancelable: true,
      touches: [touch as Touch],
      changedTouches: [touch as Touch],
    }),
  );
}

function fireTouchMoveOnWindow(touch: { identifier: number; clientX: number; clientY: number }) {
  window.dispatchEvent(
    new TouchEvent("touchmove", {
      bubbles: true,
      cancelable: true,
      touches: [touch as Touch],
      changedTouches: [touch as Touch],
    }),
  );
}

function fireTouchEndOnWindow(touch: { identifier: number; clientX: number; clientY: number }) {
  window.dispatchEvent(
    new TouchEvent("touchend", {
      bubbles: true,
      cancelable: true,
      touches: [],
      changedTouches: [touch as Touch],
    }),
  );
}

type HarnessOptions = {
  enabled?: boolean;
  allowedDirections?: readonly ("left" | "right")[];
  onSwipeCommit?: (direction: "left" | "right") => void;
  isExcludedTarget?: (target: EventTarget | null) => boolean;
  thresholds?: {
    commitMinDx?: number;
    dragClampPx?: number;
  };
  onSwipeStart?: (direction: "left" | "right" | null) => void;
  onSwipeCancel?: () => void;
  onDragChange?: (dragDx: number | null) => void;
};

function GestureHarness({
  enabled = true,
  allowedDirections,
  onSwipeCommit,
  isExcludedTarget,
  thresholds,
  onSwipeStart,
  onSwipeCancel,
  onDragChange,
}: HarnessOptions) {
  const { swipeSurfaceProps, onClickCapture, dragDx } = useHorizontalSwipeGesture({
    enabled,
    allowedDirections,
    onSwipeCommit,
    isExcludedTarget,
    thresholds,
    onSwipeStart,
    onSwipeCancel,
    onDragChange,
  });

  return createElement(
    "div",
    {
      "data-testid": "row",
      "data-drag-dx": dragDx == null ? "" : String(dragDx),
      onClickCapture: (e: MouseEvent) => {
        onClickCapture(e as unknown as React.MouseEvent<HTMLElement>);
      },
      onClick: () => {
        (window as unknown as { rowClicked?: boolean }).rowClicked = true;
      },
      ...swipeSurfaceProps,
    },
    createElement("span", null, "Swipe row"),
    createElement("button", { type: "button", "data-testid": "inner-btn" }, "Inner control"),
    createElement("div", { "data-testid": "custom-target" }, "Custom"),
  );
}

describe("useHorizontalSwipeGesture", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (window as unknown as { rowClicked?: boolean }).rowClicked = false;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderHarness(options: HarnessOptions = {}) {
    const hasExplicitCommit = Object.prototype.hasOwnProperty.call(options, "onSwipeCommit");
    const onCommit = hasExplicitCommit
      ? options.onSwipeCommit
      : vi.fn<(direction: "left" | "right") => void>();

    await act(async () => {
      root.render(
        createElement(GestureHarness, {
          ...options,
          onSwipeCommit: onCommit,
        }),
      );
    });

    return {
      row: container.querySelector("[data-testid='row']") as HTMLElement,
      onCommit,
    };
  }

  it("commits bidirectional horizontal swipes but leaves vertical scroll intent alone", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit })).row;

    firePointerDown(row, 100, 100, 1);
    firePointerOnWindow("pointermove", 106, 116, 1);
    firePointerOnWindow("pointerup", 106, 120, 1);
    expect(onCommit).not.toHaveBeenCalled();

    firePointerDown(row, 100, 100, 2);
    firePointerOnWindow("pointermove", 106, 103, 2);
    firePointerOnWindow("pointermove", 135, 106, 2);
    firePointerOnWindow("pointerup", 135, 106, 2);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("right");
  });

  it("commits left swipe when only left is allowed", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit, allowedDirections: ["left"] })).row;

    firePointerDown(row, 100, 100, 2);
    firePointerOnWindow("pointermove", 94, 103, 2);
    firePointerOnWindow("pointermove", 65, 106, 2);
    firePointerOnWindow("pointerup", 65, 106, 2);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("left");
  });

  it("does not commit right swipe when only left is allowed", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit, allowedDirections: ["left"] })).row;

    firePointerDown(row, 90, 100, 3);
    firePointerOnWindow("pointermove", 106, 103, 3);
    firePointerOnWindow("pointermove", 135, 106, 3);
    firePointerOnWindow("pointerup", 135, 106, 3);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("supports touch lifecycle and commits after horizontal lock", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit, allowedDirections: ["left"] })).row;

    fireTouchStart(row, { identifier: 1, clientX: 100, clientY: 100 });
    fireTouchMoveOnWindow({ identifier: 1, clientX: 97, clientY: 101 });
    expect(onCommit).not.toHaveBeenCalled();

    fireTouchMoveOnWindow({ identifier: 1, clientX: 62, clientY: 104 });
    fireTouchEndOnWindow({ identifier: 1, clientX: 62, clientY: 104 });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("left");
  });

  it("keeps vertical touch scroll intent from committing swipe", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit, allowedDirections: ["left"] })).row;

    fireTouchStart(row, { identifier: 2, clientX: 90, clientY: 90 });
    fireTouchMoveOnWindow({ identifier: 2, clientX: 96, clientY: 116 });
    fireTouchEndOnWindow({ identifier: 2, clientX: 96, clientY: 116 });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not start swipe from excluded interactive controls", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit, allowedDirections: ["left"] })).row;
    const button = row.querySelector("button") as HTMLButtonElement;

    firePointerDown(button, 132, 80, 71);
    firePointerOnWindow("pointermove", 80, 82, 71);
    firePointerOnWindow("pointerup", 80, 82, 71);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("returns null swipeSurfaceProps when disabled or onSwipeCommit is omitted", async () => {
    await renderHarness({ enabled: false });
    expect(container.querySelector("[data-testid='row']")?.getAttribute("style")).toBeNull();

    await renderHarness({ enabled: true, onSwipeCommit: undefined });
    expect(container.querySelector("[data-testid='row']")?.getAttribute("style")).toBeNull();
  });

  it("respects custom isExcludedTarget", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (
      await renderHarness({
        onSwipeCommit: onCommit,
        allowedDirections: ["left"],
        isExcludedTarget: (target) =>
          target instanceof Element &&
          target.closest("[data-testid='custom-target']") !== null,
      })
    ).row;
    const customTarget = row.querySelector("[data-testid='custom-target']") as HTMLElement;

    firePointerDown(customTarget, 100, 100, 8);
    firePointerOnWindow("pointermove", 60, 103, 8);
    firePointerOnWindow("pointerup", 60, 103, 8);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("suppresses click after partial horizontal drag without commit", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = (await renderHarness({ onSwipeCommit: onCommit, allowedDirections: ["left"] })).row;

    firePointerDown(row, 100, 100, 9);
    firePointerOnWindow("pointermove", 84, 103, 9);
    firePointerOnWindow("pointerup", 84, 103, 9);
    expect(onCommit).not.toHaveBeenCalled();

    row.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    expect((window as unknown as { rowClicked?: boolean }).rowClicked).toBe(false);
  });

  it("clamps drag offset during move", async () => {
    const onDragChange = vi.fn<(dragDx: number | null) => void>();
    const row = (
      await renderHarness({
        allowedDirections: ["left"],
        onDragChange,
      })
    ).row;

    firePointerDown(row, 200, 100, 10);
    firePointerOnWindow("pointermove", 50, 103, 10);

    expect(onDragChange).toHaveBeenCalled();
    const lastCall = onDragChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toBe(-96);
  });

  it("fires lifecycle callbacks for start, drag, and cancel", async () => {
    const onSwipeStart = vi.fn<(direction: "left" | "right" | null) => void>();
    const onSwipeCancel = vi.fn<() => void>();
    const onDragChange = vi.fn<(dragDx: number | null) => void>();
    const row = (
      await renderHarness({
        allowedDirections: ["left"],
        onSwipeStart,
        onSwipeCancel,
        onDragChange,
      })
    ).row;

    firePointerDown(row, 100, 100, 11);
    firePointerOnWindow("pointermove", 80, 103, 11);
    expect(onSwipeStart).toHaveBeenCalledWith("left");
    expect(onDragChange).toHaveBeenCalledWith(-20);

    firePointerOnWindow("pointerup", 90, 103, 11);
    expect(onSwipeCancel).toHaveBeenCalled();
  });
});
