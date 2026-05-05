import { useContext, useEffect, useRef, useState } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";

const SPEED = 55;
const LINK_INSET = 10;
const WORDMARK_INSET = 14;

type Obj = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  el: HTMLButtonElement | null;
};

function randomAngle() {
  // 20°–70° from each axis, random quadrant
  const baseDeg = 20 + Math.random() * 50;
  const quadrant = Math.floor(Math.random() * 4);
  const deg = baseDeg + quadrant * 90;
  return (deg * Math.PI) / 180;
}

/**
 * Spawn a position around the center, varying quadrant and distance so
 * objects never start clumped in a corner.
 */
function spawnPosition(index: number, total: number, w: number, h: number, vw: number, vh: number) {
  const cx = vw / 2;
  const cy = vh / 2;
  const quadrant = index % 4;
  const qx = quadrant % 2 === 0 ? -1 : 1;
  const qy = quadrant < 2 ? -1 : 1;
  const maxR = Math.min(vw, vh) / 2 - 80;
  const minR = Math.min(vw, vh) / 6;
  const r = minR + Math.random() * Math.max(1, maxR - minR);
  const angle = (Math.random() * Math.PI) / 2; // within quadrant
  const x = cx + qx * Math.abs(Math.cos(angle)) * r - w / 2;
  const y = cy + qy * Math.abs(Math.sin(angle)) * r - h / 2;
  return {
    x: Math.max(0, Math.min(vw - w, x)),
    y: Math.max(0, Math.min(vh - h, y)),
  };
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Props = {
  items: { id: string; label: string }[];
  onItemClick: (id: string, rect: DOMRect) => void;
  /** Item id currently flying to center — render as invisible placeholder. */
  hiddenId?: string | null;
  /** Opacity of the whole layer (used for enter/leave fades). */
  opacity?: number;
  /** Pause all motion (used while leaving so positions don't drift). */
  paused?: boolean;
  /** Called when a floating object collides with the center wordmark. */
  onCenterHit?: () => void;
};

const FloatingNav = ({ items, onItemClick, hiddenId, opacity = 1, paused = false, onCenterHit }: Props) => {
  const centerRef = useContext(CenterRectContext);
  const buttonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const objectsRef = useRef<Obj[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onCenterHitRef = useRef(onCenterHit);
  onCenterHitRef.current = onCenterHit;

  const setHover = (id: string | null) => {
    hoveredRef.current = id;
    setHoveredId(id);
  };

  // Initialize objects whenever items list identity changes.
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    objectsRef.current = items.map(({ id }, i) => {
      const el = buttonsRef.current[id];
      const rect = el?.getBoundingClientRect();
      const w = rect?.width ?? 100;
      const h = rect?.height ?? 40;
      const angle = randomAngle();
      const { x, y } = spawnPosition(i, items.length, w, h, vw, vh);
      return {
        id,
        x,
        y,
        vx: Math.cos(angle) * SPEED,
        vy: Math.sin(angle) * SPEED,
        w,
        h,
        el,
      };
    });

    let raf = 0;
    let last = performance.now();

    const resolve = (
      o: Obj,
      b: { left: number; top: number; right: number; bottom: number },
      onHit?: () => void
    ) => {
      const ax2 = o.x + o.w;
      const ay2 = o.y + o.h;
      if (o.x >= b.right || ax2 <= b.left || o.y >= b.bottom || ay2 <= b.top) return;
      onHit?.();
      const oL = ax2 - b.left;
      const oR = b.right - o.x;
      const oT = ay2 - b.top;
      const oB = b.bottom - o.y;
      const minX = Math.min(oL, oR);
      const minY = Math.min(oT, oB);
      if (minX < minY) {
        if (oL < oR) {
          o.x -= oL;
          o.vx = -Math.abs(o.vx);
        } else {
          o.x += oR;
          o.vx = Math.abs(o.vx);
        }
      } else {
        if (oT < oB) {
          o.y -= oT;
          o.vy = -Math.abs(o.vy);
        } else {
          o.y += oB;
          o.vy = Math.abs(o.vy);
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const VW = window.innerWidth;
      const VH = window.innerHeight;
      const centerRect = centerRef?.current?.getBoundingClientRect() ?? null;
      const hovered = hoveredRef.current;
      const isPaused = pausedRef.current;

      let hoveredRect: { left: number; top: number; right: number; bottom: number } | null = null;
      if (hovered) {
        const o = objectsRef.current.find((x) => x.id === hovered);
        if (o) hoveredRect = { left: o.x, top: o.y, right: o.x + o.w, bottom: o.y + o.h };
      }

      for (const o of objectsRef.current) {
        const skipMotion = isPaused || o.id === hovered;
        if (!skipMotion) {
          o.x += o.vx * dt;
          o.y += o.vy * dt;

          // Inset collision rect — bounce closer to the visible glyphs.
          const insetL = o.x + LINK_INSET;
          const insetT = o.y + LINK_INSET;
          const insetR = o.x + o.w - LINK_INSET;
          const insetB = o.y + o.h - LINK_INSET;

          if (insetL <= 0) { o.x = -LINK_INSET; o.vx = Math.abs(o.vx); }
          else if (insetR >= VW) { o.x = VW - o.w + LINK_INSET; o.vx = -Math.abs(o.vx); }
          if (insetT <= 0) { o.y = -LINK_INSET; o.vy = Math.abs(o.vy); }
          else if (insetB >= VH) { o.y = VH - o.h + LINK_INSET; o.vy = -Math.abs(o.vy); }

          if (centerRect) {
            resolve(o, {
              left: centerRect.left + WORDMARK_INSET,
              top: centerRect.top + WORDMARK_INSET,
              right: centerRect.right - WORDMARK_INSET,
              bottom: centerRect.bottom - WORDMARK_INSET,
            }, () => onCenterHitRef.current?.());
          }
          if (hoveredRect && o.id !== hovered) resolve(o, hoveredRect);
        }
        if (o.el) o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
      }

      // Elastic bounce between floating links (using inset collision rects)
      const objs = objectsRef.current;
      for (let i = 0; i < objs.length; i++) {
        for (let j = i + 1; j < objs.length; j++) {
          const a = objs[i];
          const b = objs[j];
          const aL = a.x + LINK_INSET;
          const aT = a.y + LINK_INSET;
          const aR = a.x + a.w - LINK_INSET;
          const aB = a.y + a.h - LINK_INSET;
          const bL = b.x + LINK_INSET;
          const bT = b.y + LINK_INSET;
          const bR = b.x + b.w - LINK_INSET;
          const bB = b.y + b.h - LINK_INSET;
          if (aL >= bR || aR <= bL || aT >= bB || aB <= bT) continue;

          const acx = (aL + aR) / 2;
          const acy = (aT + aB) / 2;
          const bcx = (bL + bR) / 2;
          const bcy = (bT + bB) / 2;
          let nx = bcx - acx;
          let ny = bcy - acy;
          const dist = Math.hypot(nx, ny) || 0.0001;
          nx /= dist;
          ny /= dist;

          const aImmovable = isPaused || a.id === hovered;
          const bImmovable = isPaused || b.id === hovered;

          const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relVel < 0) {
            if (!aImmovable) { a.vx += relVel * nx; a.vy += relVel * ny; }
            if (!bImmovable) { b.vx -= relVel * nx; b.vy -= relVel * ny; }
          }

          // Positional correction — push apart by half the overlap along n
          const overlapX = Math.min(aR - bL, bR - aL);
          const overlapY = Math.min(aB - bT, bB - aT);
          const overlap = Math.min(overlapX, overlapY);
          const half = overlap / 2;
          if (!aImmovable) { a.x -= nx * half; a.y -= ny * half; }
          if (!bImmovable) { b.x += nx * half; b.y += ny * half; }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    if (!document.hidden) start();

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    const onResize = () => {
      const VW = window.innerWidth;
      const VH = window.innerHeight;
      for (const o of objectsRef.current) {
        const r = o.el?.getBoundingClientRect();
        if (r) { o.w = r.width; o.h = r.height; }
        o.x = Math.max(0, Math.min(o.x, VW - o.w));
        o.y = Math.max(0, Math.min(o.y, VH - o.h));
      }
      // Force fresh center rect read on next tick (centerRef getBoundingClientRect is read each frame).
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, [items, centerRef]);

  return (
    <div
      className="absolute inset-0"
      style={{ opacity, transition: "opacity 300ms ease-out", pointerEvents: paused ? "none" : "auto" }}
    >
      {items.map(({ id, label }) => {
        const isHovered = hoveredId === id;
        const isHidden = hiddenId === id;
        return (
          <button
            key={id}
            ref={(el) => { buttonsRef.current[id] = el; }}
            aria-label={`Open ${label}`}
            onPointerEnter={() => setHover(id)}
            onPointerLeave={() => { if (hoveredRef.current === id) setHover(null); }}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              onItemClick(id, rect);
            }}
            className="absolute left-0 top-0 font-display"
            style={{
              fontFamily: '"PP Mueum", serif',
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "0em",
              textTransform: "uppercase",
              lineHeight: 1,
              padding: "16px 28px",
              borderRadius: 9999,
              border: "4px solid #0A0A0A",
              backgroundColor: isHovered ? "#0A0A0A" : "transparent",
              color: isHovered ? "#EDEAE0" : "#0A0A0A",
              boxSizing: "border-box",
              transition: "background-color 150ms ease-out, color 150ms ease-out, opacity 200ms ease-out",
              cursor: "pointer",
              opacity: isHidden ? 0 : 1,
              transform: "translate3d(-9999px, -9999px, 0)",
              transformOrigin: "center",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default FloatingNav;
