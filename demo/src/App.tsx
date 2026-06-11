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

type RowItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  meta: string;
};

const STOPS: RowItem[] = [
  { id: "1", icon: "🏠", title: "14 Oak Street", subtitle: "Not visited yet", meta: "Stop 1" },
  { id: "2", icon: "🏠", title: "22 Maple Avenue", subtitle: "Follow up tomorrow", meta: "Stop 2" },
  { id: "3", icon: "🏢", title: "801 Main Street", subtitle: "Apartment buzzer broken", meta: "Stop 3" },
  { id: "4", icon: "🏠", title: "5 Cedar Lane", subtitle: "Dog in yard", meta: "Stop 4" },
  { id: "5", icon: "🏠", title: "118 River Road", subtitle: "Requested lit drop", meta: "Stop 5" },
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

function RowContent({ item }: { item: RowItem }) {
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

function LeftSwipeStopRow({
  item,
  onCommit,
}: {
  item: RowItem;
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
        aria-label={`Swipe left on ${item.title} to mark not home`}
        onClickCapture={onClickCapture}
        {...(swipeSurfaceProps ?? {})}
      >
        <div
          aria-hidden
          className={`swipe-reveal left ${revealVisible ? "visible" : "hidden"}`}
        >
          <span aria-hidden>←</span>
          Not home
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
  item: RowItem;
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
        aria-label={`Swipe ${item.title} left to archive or right to pin`}
        onClickCapture={onClickCapture}
        {...(swipeSurfaceProps ?? {})}
      >
        <div
          aria-hidden
          className={`swipe-reveal left ${revealLeft ? "visible" : "hidden"}`}
        >
          <span aria-hidden>←</span>
          Archive
        </div>
        <div
          aria-hidden
          className={`swipe-reveal right ${revealRight ? "visible" : "hidden"}`}
        >
          Pin
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

function DisabledRow({ item }: { item: RowItem }) {
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

function InteractiveRow({
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
          className={`swipe-reveal left ${revealVisible ? "visible" : "hidden"}`}
        >
          <span aria-hidden>←</span>
          Quick complete
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
          <div className="row-copy">
            <strong>Row with a button</strong>
            <span>Swipe the row, or tap the button without swiping.</span>
          </div>
          <button
            type="button"
            className="row-button"
            onClick={() => onTap()}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}

function ScrollStressRows({ onCommit }: { onCommit: (title: string) => void }) {
  return (
    <>
      {STOPS.slice(2).map((item) => (
        <LeftSwipeStopRow key={item.id} item={item} onCommit={onCommit} />
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
          Row swipes that coexist with vertical scroll.{" "}
          <a href="https://github.com/chester-hill-solutions/swipe-interaction">View on GitHub</a>
        </p>
      </div>

      <div className="phone-shell">
        <div className="phone-screen">
          <div className="phone-status">
            <span>9:41</span>
            <span>Demo</span>
          </div>

          <header className="app-header">
            <h2>Today&apos;s route</h2>
            <p>Swipe a stop for a quick action. Scroll the list normally.</p>
          </header>

          <div className="list-scroll">
            <div className="section-label">Left swipe · useLeftSwipeRow</div>
            <LeftSwipeStopRow
              item={STOPS[0]!}
              onCommit={(title) => pushToast(`Marked not home · ${title}`)}
            />

            <div className="section-label">Both directions</div>
            <BidirectionalRow
              item={{
                id: "bi",
                icon: "⭐",
                title: "Campaign HQ",
                subtitle: "Swipe either way",
                meta: "Pinned",
              }}
              onCommit={(title, direction) =>
                pushToast(
                  direction === "left"
                    ? `Archived · ${title}`
                    : `Pinned · ${title}`,
                )
              }
            />

            <div className="section-label">Disabled</div>
            <DisabledRow item={STOPS[1]!} />

            <div className="section-label">Inner control</div>
            <InteractiveRow
              onSwipe={() => pushToast("Quick completed via swipe")}
              onTap={() => pushToast("Opened details")}
            />

            <div className="section-label">Scroll + swipe</div>
            <ScrollStressRows
              onCommit={(title) => pushToast(`Marked not home · ${title}`)}
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
            Pointer and touch supported. Buttons inside rows still receive taps.
          </div>
        </div>
      </div>
    </div>
  );
}
