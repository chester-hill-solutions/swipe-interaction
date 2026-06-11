# swipe-interaction

[![npm version](https://img.shields.io/npm/v/swipe-interaction.svg)](https://www.npmjs.com/package/swipe-interaction)
[![CI](https://github.com/chester-hill-solutions/swipe-interaction/actions/workflows/ci.yml/badge.svg)](https://github.com/chester-hill-solutions/swipe-interaction/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Horizontal row swipe gestures for touch and pointer input in React.

Built for list rows where a quick left or right swipe should trigger an action without fighting vertical scroll. The hook tracks gestures on `window` after intent is confirmed, clamps drag offset for visual feedback, and suppresses accidental clicks after a swipe.

## Install

```bash
npm install swipe-interaction
```

**Peer dependency:** React 18 or 19.

See the [interactive demo](https://chester-hill-solutions.github.io/swipe-interaction/) or run `npm run demo:dev` locally.

## Quick start

```tsx
import {
  leftDragPxFromDx,
  shouldShowSwipeDragReveal,
  useHorizontalSwipeGesture,
} from "swipe-interaction";

function SwipeRow({ onAction }: { onAction: () => void }) {
  const { swipeSurfaceProps, onClickCapture, dragDx } = useHorizontalSwipeGesture({
    enabled: true,
    allowedDirections: ["left"],
    onSwipeCommit: () => onAction(),
  });

  const dragLeftPx = leftDragPxFromDx(dragDx);
  const showReveal = shouldShowSwipeDragReveal(dragDx);

  return (
    <div className="relative overflow-hidden" onClickCapture={onClickCapture} {...swipeSurfaceProps}>
      <div
        aria-hidden
        className={showReveal ? "opacity-100" : "opacity-0"}
      >
        Swipe action
      </div>
      <div
        style={{
          transform:
            dragLeftPx != null ? `translateX(-${dragLeftPx}px)` : undefined,
        }}
      >
        Row content
      </div>
    </div>
  );
}
```

## How it works

```text
pointer/touch down on row
        │
        ▼
  excluded target? ──yes──► ignore (buttons, inputs, etc.)
        │ no
        ▼
  movement leaves dead zone (5px)
        │
        ├── vertical intent ──► abandon swipe, let scroll continue
        │
        └── horizontal intent ──► lock gesture, track dragDx
                    │
                    ▼
              pointer/touch up
                    │
        ├── commit threshold met ──► onSwipeCommit(direction)
        └── otherwise ──► reset (optionally suppress click)
```

### Scroll and swipe coexistence

- The hook sets `touchAction: "pan-y pinch-zoom"` on the swipe surface so vertical scrolling still works.
- Vertical movement that clearly dominates horizontal movement abandons the swipe early.
- Horizontal movement that meets the intent threshold locks the gesture and tracks drag offset.

### Pointer and touch

- **Mouse / pen:** uses `pointerdown` on the row and `pointermove` / `pointerup` on `window`. `setPointerCapture` is attempted after horizontal intent is confirmed.
- **Touch:** uses `touchstart` on the row and `touchmove` / `touchend` on `window` with `{ passive: false }` so horizontal drags can call `preventDefault` without blocking vertical scroll intent detection.

### Click suppression

After a horizontal swipe with meaningful movement, the hook suppresses the synthetic click that browsers often fire on release. Wire `onClickCapture` on the same element (or a parent) and respect `event.defaultPrevented` if you also handle row selection:

```tsx
const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
  onClickCapture(e);
  if (e.defaultPrevented) return;
  onSelect?.();
};
```

## `useHorizontalSwipeGesture`

```tsx
const result = useHorizontalSwipeGesture({
  enabled: boolean;
  allowedDirections?: readonly SwipeDirection[]; // default: ["left", "right"]
  onSwipeCommit?: (direction: SwipeDirection) => void;
  isExcludedTarget?: (target: EventTarget | null) => boolean;
});
```

| Return value | Type | Description |
| --- | --- | --- |
| `swipeSurfaceProps` | `HTMLAttributes<HTMLElement> \| null` | Spread onto the row surface. `null` when swipe is disabled or `onSwipeCommit` is omitted. Includes `onPointerDownCapture`, `onTouchStartCapture`, and `style.touchAction`. |
| `onClickCapture` | `(e: React.MouseEvent<HTMLElement>) => void` | Attach to the row (or wrapper) to suppress post-swipe clicks. |
| `dragDx` | `number \| null` | Signed drag offset while dragging. Negative = left, positive = right. `null` when idle. |
| `isDragging` | `boolean` | `true` when `dragDx` is non-zero. |

`SwipeDirection` is `"left" | "right"`.

### Options

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | — | When `false`, the hook returns `swipeSurfaceProps: null` and does not listen for gestures. |
| `allowedDirections` | `["left", "right"]` | Restrict which swipe directions can commit. Use `["left"]` for delete/archive-style actions. |
| `onSwipeCommit` | — | Called on release when commit thresholds are met and the direction is allowed. Required for gesture handling to activate. |
| `isExcludedTarget` | `isDefaultSwipeExcludedTarget` | Return `true` to skip starting a swipe from that target. Default excludes `button`, `input`, `textarea`, `select`, `label`, and `[contenteditable="true"]`. Links (`a`) are not excluded so row links can still participate in swipe affordances. |
| `thresholds` | defaults from exported constants | Override commit, clamp, reveal, and horizontal-intent thresholds. |
| `onSwipeStart` | — | Called when horizontal intent locks. |
| `onSwipeCancel` | — | Called when the gesture is abandoned or released below commit threshold. |
| `onDragChange` | — | Called whenever `dragDx` changes. |

### Wrapper hook pattern

For the common left-only row case, use `useLeftSwipeRow`:

```tsx
import { useLeftSwipeRow } from "swipe-interaction";

const { swipeSurfaceProps, onClickCapture, dragLeftPx, isDragging } = useLeftSwipeRow({
  enabled: true,
  onCommit: () => submitQuickAction(),
});
```

You can also wrap `useHorizontalSwipeGesture` directly:

```tsx
import {
  leftDragPxFromDx,
  useHorizontalSwipeGesture,
} from "swipe-interaction";

export function useLeftSwipeRow(options: {
  enabled: boolean;
  onCommit?: () => void;
}) {
  const { swipeSurfaceProps, onClickCapture, dragDx, isDragging } =
    useHorizontalSwipeGesture({
      enabled: options.enabled,
      allowedDirections: ["left"],
      onSwipeCommit: options.onCommit ? () => options.onCommit() : undefined,
    });

  return {
    swipeSurfaceProps,
    onClickCapture,
    dragLeftPx: leftDragPxFromDx(dragDx),
    isDragging,
  };
}
```

## Gesture helpers

Pure functions for thresholds, intent detection, and drag visuals. Useful in tests, Storybook, or app-specific wrappers.

### Visual feedback

| Function | Purpose |
| --- | --- |
| `leftDragPxFromDx(dragDx)` | Positive left drag distance, or `null` if not dragging left. |
| `rightDragPxFromDx(dragDx)` | Positive right drag distance, or `null` if not dragging right. |
| `dragDistanceForDirection(dragDx, direction)` | Positive drag distance for a direction, or `null`. |
| `clampSwipeDragDx(dx)` | Clamp signed drag to ±`SWIPE_DRAG_CLAMP_PX` (96px). |
| `shouldShowSwipeDragReveal(dragDx)` | Whether to show edge tint / action label (≥ 24px). |

### Intent and commit

| Function | Purpose |
| --- | --- |
| `swipeMovementExceedsDeadZone(dx, dy)` | Movement has left the 5px jitter dead zone. |
| `horizontalSwipeIntent(dx, dy)` | Clearly horizontal (both directions). |
| `leftSwipeIntent(dx, dy)` | Clearly horizontal to the left. |
| `rightSwipeIntent(dx, dy)` | Clearly horizontal to the right. |
| `horizontalIntentForAllowedDirections(dx, dy, allowed)` | Direction-aware intent check used by the hook. |
| `verticalSwipeIntent(dx, dy)` | Clearly vertical — prefer scroll over swipe. |
| `shouldCommitSwipe(dx, dy)` | Whether release should fire `onSwipeCommit`. |
| `resolveSwipeDirection(dx)` | `"left"` or `"right"` from signed delta. |
| `isSwipeDirectionAllowed(direction, allowed)` | Whether a direction is permitted. |
| `isDefaultSwipeExcludedTarget(target)` | Default interactive-element exclusion. |

### Tunable constants

All thresholds are exported if you want to align custom UI or tests with the hook behavior:

| Constant | Value | Role |
| --- | ---: | --- |
| `SWIPE_MOVE_DEAD_ZONE_PX` | 5 | Ignore micro-movement before evaluating intent. |
| `SWIPE_HORIZONTAL_INTENT_MIN_DX` | 6 | Minimum horizontal travel to lock swipe tracking. |
| `SWIPE_VERTICAL_INTENT_DOMINANCE_RATIO` | 1.8 | Vertical must exceed horizontal by this factor to abandon swipe. |
| `SWIPE_COMMIT_MIN_DX_PX` | 34 | Minimum horizontal travel to commit on release. |
| `SWIPE_COMMIT_DOMINANCE_RATIO` | 1.1 | Horizontal must dominate vertical by this factor to commit. |
| `SWIPE_DRAG_TINT_MIN_DX_PX` | 24 | Minimum drag before showing reveal UI. |
| `SWIPE_DRAG_CLAMP_PX` | 96 | Maximum visual drag offset. |

Import pure helpers without React via:

```ts
import { shouldCommitSwipe } from "swipe-interaction/gesture";
```

## When to use

- List rows with quick actions
- Mobile-first workflows where swipe is faster than opening a menu
- Rows that need drag reveal feedback before commit

## When not to use

- Carousels or pagers
- Drag-and-drop reordering
- Full-screen drawers or bottom sheets

## Troubleshooting

- **Row clicks fire after swipe:** wire `onClickCapture` and respect `event.defaultPrevented`.
- **Reveal layer looks wrong:** ensure the wrapper uses `overflow-hidden`.
- **Swipe never starts:** confirm `onSwipeCommit` is provided and `enabled` is true.
- **Buttons still swipe:** customize `isExcludedTarget` for app-specific controls.

## Migration

If you previously used `@paito/swipe-interaction`, switch to:

```bash
npm install swipe-interaction
```

and update imports from `@paito/swipe-interaction` to `swipe-interaction`.

## Full row example

A common pattern: fixed action layer behind the row, foreground content translated by `dragLeftPx`:

```tsx
import {
  leftDragPxFromDx,
  shouldShowSwipeDragReveal,
  useHorizontalSwipeGesture,
} from "swipe-interaction";

function ActionRow({
  disabled,
  label,
  onAction,
  children,
}: {
  disabled?: boolean;
  label: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const { swipeSurfaceProps, onClickCapture, dragDx, isDragging } =
    useHorizontalSwipeGesture({
      enabled: !disabled,
      allowedDirections: ["left"],
      onSwipeCommit: onAction,
    });

  const dragLeftPx = leftDragPxFromDx(dragDx);
  const revealVisible = shouldShowSwipeDragReveal(dragDx);

  return (
    <div
      className="relative overflow-hidden rounded-md"
      onClickCapture={onClickCapture}
      {...(swipeSurfaceProps ?? {})}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-end px-4"
      >
        <span className={revealVisible ? "opacity-100" : "opacity-0"}>
          {label}
        </span>
      </div>

      <div
        className={isDragging ? "transition-none" : "transition-transform duration-200"}
        style={{
          transform:
            dragLeftPx != null ? `translateX(-${dragLeftPx}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

## Accessibility

- Provide an `aria-label` or visible hint on the swipe surface when the action is not obvious.
- Swipe is a pointer/touch affordance; expose the same action through a visible control or menu for keyboard and assistive-tech users.
- Use `aria-hidden` on decorative reveal layers behind the row content.

## Development

```bash
git clone https://github.com/chester-hill-solutions/swipe-interaction.git
cd swipe-interaction
npm install
npm test
npm run typecheck
npm run build
npm run demo:dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for release and PR guidance.

## License

MIT
