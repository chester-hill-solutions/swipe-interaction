import { useState } from "react";
import {
  dragDistanceForDirection,
  leftDragPxFromDx,
  rightDragPxFromDx,
  shouldShowSwipeDragReveal,
  useHorizontalSwipeGesture,
  useLeftSwipeRow,
  type SwipeDirection,
} from "../../src/index.ts";

function SwipeRow({
  title,
  subtitle,
  allowedDirections,
  disabled = false,
  onAction,
}: {
  title: string;
  subtitle: string;
  allowedDirections: readonly SwipeDirection[];
  disabled?: boolean;
  onAction: (direction: SwipeDirection) => void;
}) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { swipeSurfaceProps, onClickCapture, dragDx, isDragging } =
    useHorizontalSwipeGesture({
      enabled: !disabled,
      allowedDirections,
      onSwipeCommit: (direction) => {
        const label = direction === "left" ? "Archived" : "Pinned";
        setLastAction(label);
        onAction(direction);
      },
    });

  const leftPx = leftDragPxFromDx(dragDx);
  const rightPx = rightDragPxFromDx(dragDx);
  const revealDirection =
    leftPx != null ? "left" : rightPx != null ? "right" : allowedDirections[0];
  const revealDistance = dragDistanceForDirection(dragDx, revealDirection);
  const revealVisible = shouldShowSwipeDragReveal(dragDx);
  const transform =
    leftPx != null
      ? `translateX(-${leftPx}px)`
      : rightPx != null
        ? `translateX(${rightPx}px)`
        : undefined;

  return (
    <div
      className={`demo-row${disabled ? " disabled" : ""}`}
      onClickCapture={onClickCapture}
      {...(swipeSurfaceProps ?? {})}
    >
      <div
        aria-hidden
        className={`demo-reveal ${revealDirection}`}
        style={{ opacity: revealVisible ? 1 : 0 }}
      >
        {revealDirection === "left" ? "Archive" : "Pin"}
      </div>
      <div
        className={`demo-content${isDragging ? " dragging" : ""}`}
        style={{ transform }}
      >
        <strong>{title}</strong>
        <div>{subtitle}</div>
        {lastAction ? <div>Last action: {lastAction}</div> : null}
        {revealDistance != null ? <div>Drag: {revealDistance}px</div> : null}
      </div>
    </div>
  );
}

function LeftOnlyRow() {
  const [message, setMessage] = useState<string | null>(null);
  const { swipeSurfaceProps, onClickCapture, dragLeftPx, isDragging } = useLeftSwipeRow({
    enabled: true,
    onCommit: () => setMessage("Marked not home"),
  });

  return (
    <div className="demo-row" onClickCapture={onClickCapture} {...(swipeSurfaceProps ?? {})}>
      <div
        aria-hidden
        className="demo-reveal left"
        style={{ opacity: dragLeftPx != null && dragLeftPx >= 24 ? 1 : 0 }}
      >
        Not home
      </div>
      <div
        className={`demo-content${isDragging ? " dragging" : ""}`}
        style={{
          transform:
            dragLeftPx != null ? `translateX(-${dragLeftPx}px)` : undefined,
        }}
      >
        <strong>Left-only wrapper</strong>
        <div>Uses `useLeftSwipeRow`</div>
        {message ? <div>{message}</div> : null}
      </div>
    </div>
  );
}

export function App() {
  return (
    <div className="demo-page">
      <header className="demo-header">
        <h1>swipe-interaction demo</h1>
        <p>Try swiping rows horizontally inside a scrollable list.</p>
      </header>

      <div className="demo-scroll demo-list">
        <LeftOnlyRow />
        <SwipeRow
          title="Bidirectional row"
          subtitle="Swipe left to archive or right to pin"
          allowedDirections={["left", "right"]}
          onAction={() => undefined}
        />
        <SwipeRow
          title="Left-only row"
          subtitle="Swipe left to archive"
          allowedDirections={["left"]}
          onAction={() => undefined}
        />
        <SwipeRow
          title="Disabled row"
          subtitle="Gesture handling disabled"
          allowedDirections={["left"]}
          disabled
          onAction={() => undefined}
        />
        {Array.from({ length: 8 }, (_, index) => (
          <SwipeRow
            key={index}
            title={`Scrollable row ${index + 1}`}
            subtitle="Vertical scroll should still work"
            allowedDirections={["left"]}
            onAction={() => undefined}
          />
        ))}
      </div>
    </div>
  );
}
