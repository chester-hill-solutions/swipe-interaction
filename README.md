# swipe-interaction

Reusable horizontal row swipe gestures for touch and pointer input.

- **Pure helpers** — thresholds, intent detection, commit rules (`gesture.ts`)
- **React hook** — window-tracked pointer/touch lifecycle with click suppression (`useHorizontalSwipeGesture`)

Supports left-only or bidirectional swipes via `allowedDirections`.

## Install

```bash
npm install swipe-interaction
```

Peer dependency: React 18 or 19.

## Usage

```tsx
import {
  leftDragPxFromDx,
  shouldShowSwipeDragReveal,
  useHorizontalSwipeGesture,
} from "swipe-interaction";

const { swipeSurfaceProps, onClickCapture, dragDx } = useHorizontalSwipeGesture({
  enabled: true,
  allowedDirections: ["left"],
  onSwipeCommit: () => submitQuickAction(),
});

const dragLeftPx = leftDragPxFromDx(dragDx);
```

Spread `swipeSurfaceProps` onto the row surface and wire `onClickCapture` on the same element (or a parent) to suppress synthetic clicks after a horizontal swipe.

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
