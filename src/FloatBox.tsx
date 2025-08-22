import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

const EDGE_SIZE = 8;

function useWindowSize() {
  const [size, setSize] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });
  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

function usePointerCapture<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onMove?: (e: PointerEvent) => void,
  onUp?: (e: PointerEvent) => void
) {
  useEffect(() => {
    const handleMove = (e: PointerEvent) => onMove?.(e);
    const handleUp = (e: PointerEvent) => onUp?.(e);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [ref, onMove, onUp]);
}

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface ResizeHandleProps {
  dir: ResizeDirection;
  onPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    dir: ResizeDirection
  ) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ dir, onPointerDown }) => {
  const style: React.CSSProperties = {
    position: "absolute",
    zIndex: 20,
    ...(dir.includes("n") ? { top: 0 } : {}),
    ...(dir.includes("s") ? { bottom: 0 } : {}),
    ...(dir.includes("w") ? { left: 0 } : {}),
    ...(dir.includes("e") ? { right: 0 } : {}),
    ...(dir.length === 1
      ? {
          width: ["e", "w"].includes(dir) ? EDGE_SIZE : "100%",
          height: ["n", "s"].includes(dir) ? EDGE_SIZE : "100%",
        }
      : {
          width: EDGE_SIZE + 4,
          height: EDGE_SIZE + 4,
        }),
    cursor:
      dir === "n"
        ? "n-resize"
        : dir === "s"
        ? "s-resize"
        : dir === "e"
        ? "e-resize"
        : dir === "w"
        ? "w-resize"
        : dir === "ne"
        ? "ne-resize"
        : dir === "nw"
        ? "nw-resize"
        : dir === "se"
        ? "se-resize"
        : "sw-resize",
  };
  return <div onPointerDown={(e) => onPointerDown(e, dir)} style={style} />;
};

interface FloatBoxProps {
  title?: string;
  children?: React.ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  onClose?: () => void;
  zIndex?: number;
  onFocus?: () => void;
  className?: string;
  id?: string;
}

export const FloatBox: React.FC<FloatBoxProps> = ({
  title = "Floating Window",
  children,
  initialPosition = { x: 120, y: 120 },
  initialSize = { width: 420, height: 300 },
  minSize = { width: 320, height: 160 },
  onClose,
  zIndex = 100,
  onFocus,
  id,
}) => {
  const { w: vw, h: vh } = useWindowSize();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMin, setIsMin] = useState(false);
  const [isMax, setIsMax] = useState(false);
  const [pos, setPos] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [prevState, setPrevState] = useState<null | {
    pos: { x: number; y: number };
    size: { width: number; height: number };
  }>(null);

  useEffect(() => {
    setPos((p) => ({
      x: clamp(p.x, 0, Math.max(0, vw - size.width)),
      y: clamp(p.y, 0, Math.max(0, vh - (isMin ? 40 : size.height))),
    }));
  }, [vw, vh, size.width, size.height, isMin]);

  const handleActivate = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      setIsActive(true);
      onFocus?.();
    },
    [onFocus]
  );

  useEffect(() => {
    const blur = () => setIsActive(false);
    window.addEventListener("pointerdown", blur);
    return () => window.removeEventListener("pointerdown", blur);
  }, []);

  const dragState = useRef<any>(null);

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMax) return;
    handleActivate(e);
    dragState.current = {
      kind: "drag",
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
  };

  const onHandleDown = (
    e: React.PointerEvent<HTMLDivElement>,
    dir: ResizeDirection
  ) => {
    handleActivate(e);
    dragState.current = {
      kind: "resize",
      dir,
      startX: e.clientX,
      startY: e.clientY,
      base: { ...size },
      basePos: { ...pos },
    };
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const s = dragState.current;
      if (!s) return;
      if (s.kind === "drag") {
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        const nx = clamp(s.baseX + dx, 0, Math.max(0, vw - size.width));
        const ny = clamp(s.baseY + dy, 0, Math.max(0, vh - size.height));
        setPos({ x: nx, y: ny });
      } else if (s.kind === "resize") {
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        let { width, height } = s.base;
        let { x, y } = s.basePos;
        const dir = s.dir as ResizeDirection;

        if (dir.includes("e"))
          width = clamp(s.base.width + dx, minSize.width, vw - x);
        if (dir.includes("s"))
          height = clamp(s.base.height + dy, minSize.height, vh - y);
        if (dir.includes("w")) {
          const newW = clamp(
            s.base.width - dx,
            minSize.width,
            s.base.width + x
          );
          const movedX = x + (s.base.width - newW);
          x = clamp(movedX, 0, s.basePos.x + s.base.width - minSize.width);
          width = clamp(newW, minSize.width, s.basePos.x + s.base.width);
        }
        if (dir.includes("n")) {
          const newH = clamp(
            s.base.height - dy,
            minSize.height,
            s.base.height + y
          );
          const movedY = y + (s.base.height - newH);
          y = clamp(movedY, 0, s.basePos.y + s.base.height - minSize.height);
          height = clamp(newH, minSize.height, s.basePos.y + s.base.height);
        }
        setPos({ x, y });
        setSize({ width, height });
      }
    },
    [vw, vh, size.width, size.height, minSize.width, minSize.height]
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  usePointerCapture(rootRef, onPointerMove, onPointerUp);

  const toggleMax = () => {
    if (!isMax) {
      setPrevState({ pos, size });
      setIsMax(true);
    } else {
      if (prevState) {
        setPos(prevState.pos);
        setSize(prevState.size);
      }
      setIsMax(false);
    }
  };

  const windowStyle = useMemo(() => {
    return {
      position: "absolute",
      zIndex,
      width: isMax ? vw : size.width,
      height: isMin ? 40 : isMax ? vh : size.height,
      left: isMax ? 0 : pos.x,
      top: isMax ? 0 : pos.y,
      background: "white",
      border: "1px solid #ccc",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    } as React.CSSProperties;
  }, [isMin, isMax, pos.x, pos.y, size.width, size.height, vw, vh, zIndex]);

  return (
    <div
      ref={rootRef}
      id={id}
      style={windowStyle}
      onPointerDown={handleActivate}
    >
      {/* Title Bar */}
      <div
        onPointerDown={onTitleDown}
        style={{
          height: 40,
          background: "#f0f0f0",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div style={{ flex: 1, fontWeight: 500 }}>{title}</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setIsMin((m) => !m)}>_</button>
          <button onClick={toggleMax}>{isMax ? "🗗" : "🗖"}</button>
          <button onClick={onClose}>×</button>
        </div>
      </div>

      {!isMin && (
        <div style={{ flex: 1, overflow: "auto", padding: 10 }}>{children}</div>
      )}

      {!isMax &&
        !isMin &&
        (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeDirection[]).map(
          (dir) => (
            <ResizeHandle key={dir} dir={dir} onPointerDown={onHandleDown} />
          )
        )}
    </div>
  );
};
