/**
 * @vitest-environment jsdom
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHorizontalSwipeGesture } from "./use-horizontal-swipe-gesture";

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

function GestureHarness({
  onCommit,
  allowedDirections,
}: {
  onCommit: (direction: "left" | "right") => void;
  allowedDirections?: readonly ("left" | "right")[];
}) {
  const { swipeSurfaceProps, onClickCapture } = useHorizontalSwipeGesture({
    enabled: true,
    allowedDirections,
    onSwipeCommit: onCommit,
  });

  return createElement(
    "div",
    {
      "data-testid": "row",
      onClickCapture: (e: MouseEvent) => {
        onClickCapture(e as unknown as React.MouseEvent<HTMLElement>);
      },
      ...swipeSurfaceProps,
    },
    createElement("span", null, "Swipe row"),
    createElement("button", { type: "button" }, "Inner control"),
  );
}

describe("useHorizontalSwipeGesture", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderHarness(
    onCommit: (direction: "left" | "right") => void,
    allowedDirections?: readonly ("left" | "right")[],
  ) {
    await act(async () => {
      root.render(createElement(GestureHarness, { onCommit, allowedDirections }));
    });
    return container.querySelector("[data-testid='row']") as HTMLElement;
  }

  it("commits bidirectional horizontal swipes but leaves vertical scroll intent alone", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = await renderHarness(onCommit);

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
    const row = await renderHarness(onCommit, ["left"]);

    firePointerDown(row, 100, 100, 2);
    firePointerOnWindow("pointermove", 94, 103, 2);
    firePointerOnWindow("pointermove", 65, 106, 2);
    firePointerOnWindow("pointerup", 65, 106, 2);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("left");
  });

  it("does not commit right swipe when only left is allowed", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = await renderHarness(onCommit, ["left"]);

    firePointerDown(row, 90, 100, 3);
    firePointerOnWindow("pointermove", 106, 103, 3);
    firePointerOnWindow("pointermove", 135, 106, 3);
    firePointerOnWindow("pointerup", 135, 106, 3);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("supports touch lifecycle and commits after horizontal lock", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = await renderHarness(onCommit, ["left"]);

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
    const row = await renderHarness(onCommit, ["left"]);

    fireTouchStart(row, { identifier: 2, clientX: 90, clientY: 90 });
    fireTouchMoveOnWindow({ identifier: 2, clientX: 96, clientY: 116 });
    fireTouchEndOnWindow({ identifier: 2, clientX: 96, clientY: 116 });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not start swipe from excluded interactive controls", async () => {
    const onCommit = vi.fn<(direction: "left" | "right") => void>();
    const row = await renderHarness(onCommit, ["left"]);
    const button = row.querySelector("button") as HTMLButtonElement;

    firePointerDown(button, 132, 80, 71);
    firePointerOnWindow("pointermove", 80, 82, 71);
    firePointerOnWindow("pointerup", 80, 82, 71);

    expect(onCommit).not.toHaveBeenCalled();
  });
});
