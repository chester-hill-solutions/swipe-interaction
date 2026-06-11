import { useCallback, useEffect, useState } from "react";
import {
  leftDragPxFromDx,
  rightDragPxFromDx,
  shouldShowSwipeDragReveal,
  useHorizontalSwipeGesture,
  useLeftSwipeRow,
  type SwipeDirection,
} from "../../src/index.ts";

type Toast = {
  id: number;
  message: string;
};

type GroceryItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  meta: string;
};

const GROCERIES: GroceryItem[] = [
  { id: "1", icon: "🥛", title: "Whole milk", subtitle: "Dairy · 2% or whole", meta: "×1" },
  { id: "2", icon: "🍞", title: "Sourdough loaf", subtitle: "Bakery · out of stock online", meta: "×1" },
  { id: "3", icon: "🥚", title: "Free-range eggs", subtitle: "Dairy · dozen", meta: "×2" },
  { id: "4", icon: "🍎", title: "Honeycrisp apples", subtitle: "Produce · 4–6 count", meta: "×1" },
  { id: "5", icon: "🥬", title: "Baby spinach", subtitle: "Produce · 5 oz bag", meta: "×1" },
  { id: "6", icon: "🧀", title: "Sharp cheddar", subtitle: "Dairy · block", meta: "×1" },
  { id: "7", icon: "🍝", title: "Penne pasta", subtitle: "Pantry · 1 lb", meta: "×2" },
];

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  return { toasts, pushToast };
}

function RowContent({ item }: { item: GroceryItem }) {
  return (
    <>
      <div className="row-icon" aria-hidden>
        {item.icon}
      </div>
      <div className="row-copy">
        <strong>{item.title}</strong>
        <span>{item.subtitle}</span>
      </div>
      <div className="row-meta">{item.meta}</div>
    </>
  );
}

function LeftSwipeGroceryRow({
  item,
  onCommit,
}: {
  item: GroceryItem;
  onCommit: (title: string) => void;
}) {
  const { swipeSurfaceProps, onClickCapture, dragLeftPx, isDragging } = useLeftSwipeRow({
    enabled: true,
    onCommit: () => onCommit(item.title),
  });

  const revealVisible = shouldShowSwipeDragReveal(
    dragLeftPx == null ? null : -dragLeftPx,
  );

  return (
    <div className="row-wrap">
      <div
        className="swipe-row"
        aria-label={`Swipe left on ${item.title} to mark got it`}
        onClickCapture={onClickCapture}
        {...(swipeSurfaceProps ?? {})}
      >
        <div
          aria-hidden
          className={`swipe-reveal left got-it ${revealVisible ? "visible" : "hidden"}`}
        >
          <span aria-hidden>✓</span>
          Got it
        </div>
        <div
          className={`swipe-panel${isDragging ? " dragging" : ""}`}
          style={{
            transform:
              dragLeftPx != null && dragLeftPx > 0
                ? `translateX(-${dragLeftPx}px)`
                : undefined,
          }}
        >
          <RowContent item={item} />
        </div>
      </div>
    </div>
  );
}

function BidirectionalRow({
  item,
  onCommit,
}: {
  item: GroceryItem;
  onCommit: (title: string, direction: SwipeDirection) => void;
}) {
  const { swipeSurfaceProps, onClickCapture, dragDx, isDragging } =
    useHorizontalSwipeGesture({
      enabled: true,
      allowedDirections: ["left", "right"],
      onSwipeCommit: (direction) => onCommit(item.title, direction),
    });

  const leftPx = leftDragPxFromDx(dragDx);
  const rightPx = rightDragPxFromDx(dragDx);
  const revealLeft = leftPx != null && shouldShowSwipeDragReveal(dragDx);
  const revealRight = rightPx != null && shouldShowSwipeDragReveal(dragDx);
  const transform =
    leftPx != null
      ? `translateX(-${leftPx}px)`
      : rightPx != null
        ? `translateX(${rightPx}px)`
        : undefined;

  return (
    <div className="row-wrap">
      <div
        className="swipe-row"
        aria-label={`Swipe ${item.title} left to remove or right to save for later`}
        onClickCapture={onClickCapture}
        {...(swipeSurfaceProps ?? {})}
      >
        <div
          aria-hidden
          className={`swipe-reveal left remove ${revealLeft ? "visible" : "hidden"}`}
        >
          <span aria-hidden>←</span>
          Remove
        </div>
        <div
          aria-hidden
          className={`swipe-reveal right save ${revealRight ? "visible" : "hidden"}`}
        >
          Save
          <span aria-hidden>→</span>
        </div>
        <div
          className={`swipe-panel${isDragging ? " dragging" : ""}`}
          style={{ transform }}
        >
          <RowContent item={item} />
        </div>
      </div>
    </div>
  );
}

function DisabledRow({ item }: { item: GroceryItem }) {
  return (
    <div className="row-wrap">
      <div className="swipe-row is-disabled" aria-disabled="true">
        <div className="swipe-panel">
          <RowContent item={item} />
        </div>
      </div>
    </div>
  );
}

function QuantityRow({
  onSwipe,
  onTap,
}: {
  onSwipe: () => void;
  onTap: () => void;
}) {
  const { swipeSurfaceProps, onClickCapture, dragLeftPx, isDragging } = useLeftSwipeRow({
    enabled: true,
    onCommit: onSwipe,
  });
  const revealVisible = shouldShowSwipeDragReveal(
    dragLeftPx == null ? null : -dragLeftPx,
  );

  return (
    <div className="row-wrap">
      <div
        className="swipe-row"
        onClickCapture={onClickCapture}
        {...(swipeSurfaceProps ?? {})}
      >
        <div
          aria-hidden
          className={`swipe-reveal left got-it ${revealVisible ? "visible" : "hidden"}`}
        >
          <span aria-hidden>✓</span>
          Got it
        </div>
        <div
          className={`swipe-panel${isDragging ? " dragging" : ""}`}
          style={{
            transform:
              dragLeftPx != null && dragLeftPx > 0
                ? `translateX(-${dragLeftPx}px)`
                : undefined,
          }}
        >
          <div className="row-icon" aria-hidden>
            🫐
          </div>
          <div className="row-copy">
            <strong>Blueberries</strong>
            <span>Produce · pint · swipe or tap +</span>
          </div>
          <button type="button" className="row-button" onClick={onTap}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function ScrollStressRows({ onCommit }: { onCommit: (title: string) => void }) {
  return (
    <>
      {GROCERIES.slice(2).map((item) => (
        <LeftSwipeGroceryRow key={item.id} item={item} onCommit={onCommit} />
      ))}
    </>
  );
}

export function App() {
  const { toasts, pushToast } = useToast();

  return (
    <div className="page">
      <div className="page-intro">
        <h1>swipe-interaction</h1>
        <p>
          Swipe grocery rows without fighting scroll.{" "}
          <a href="https://github.com/chester-hill-solutions/swipe-interaction">View on GitHub</a>
        </p>
      </div>

      <div className="phone-shell">
        <div className="phone-screen">
          <div className="phone-status">
            <span>9:41</span>
            <span>Groceries</span>
          </div>

          <header className="app-header">
            <h2>Weekly shop</h2>
            <p>Swipe left to check off. Scroll the aisle list normally.</p>
          </header>

          <div className="list-scroll">
            <div className="section-label">Left swipe · useLeftSwipeRow</div>
            <LeftSwipeGroceryRow
              item={GROCERIES[0]!}
              onCommit={(title) => pushToast(`Checked off · ${title}`)}
            />

            <div className="section-label">Both directions</div>
            <BidirectionalRow
              item={{
                id: "coffee",
                icon: "☕",
                title: "Colombian coffee",
                subtitle: "Pantry · whole bean",
                meta: "×1",
              }}
              onCommit={(title, direction) =>
                pushToast(
                  direction === "left"
                    ? `Removed · ${title}`
                    : `Saved for later · ${title}`,
                )
              }
            />

            <div className="section-label">Unavailable</div>
            <DisabledRow item={GROCERIES[1]!} />

            <div className="section-label">Quantity button</div>
            <QuantityRow
              onSwipe={() => pushToast("Checked off · Blueberries")}
              onTap={() => pushToast("Added another pint")}
            />

            <div className="section-label">Scroll + swipe</div>
            <ScrollStressRows
              onCommit={(title) => pushToast(`Checked off · ${title}`)}
            />
          </div>

          <div className="toast-stack" aria-live="polite">
            {toasts.map((toast) => (
              <div key={toast.id} className="toast">
                {toast.message}
              </div>
            ))}
          </div>

          <div className="hint-bar">
            Swipe rows in a long list. Buttons inside rows still receive taps.
          </div>
        </div>
      </div>
    </div>
  );
}
