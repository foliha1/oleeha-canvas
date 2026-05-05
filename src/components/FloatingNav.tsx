import { useContext, useEffect, useRef, useState } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";

const SPEED = 110;
const LINK_INSET = -2;
const WORDMARK_INSET = 0;

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

function capsuleFromRect(left: number, top: number, right: number, bottom: number) {
  const h = bottom - top;
  const radius = h / 2;
  const cy = (top + bottom) / 2;
  return {
    ax: left + radius, ay: cy,
    bx: right - radius, by: cy,
    radius,
  };
}

function segSegClosestPoints(
  a1x: number, a1y: number, a2x: number, a2y: number,
  b1x: number, b1y: number, b2x: number, b2y: number
) {
  const dax = a2x - a1x, day = a2y - a1y;
  const dbx = b2x - b1x, dby = b2y - b1y;
  const dx = a1x - b1x, dy = a1y - b1y;
  const a = dax * dax + day * day;
  const e = dbx * dbx + dby * dby;
  const f = dbx * dx + dby * dy;
  let s: number, t: number;
  if (a <= 1e-8 && e <= 1e-8) { s = 0; t = 0; }
  else if (a <= 1e-8) { s = 0; t = Math.max(0, Math.min(1, f / e)); }
  else {
    const c = dax * dx + day * dy;
    if (e <= 1e-8) { t = 0; s = Math.max(0, Math.min(1, -c / a)); }
    else {
      const b = dax * dbx + day * dby;
      const denom = a * e - b * b;
      s = denom !== 0 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); }
      else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
    }
  }
  return {
    p1x: a1x + dax * s, p1y: a1y + day * s,
    p2x: b1x + dbx * t, p2y: b1y + dby * t,
  };
}

function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby || 1;
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return { cx, cy };
}

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
            const wmCap = capsuleFromRect(
              centerRect.left + WORDMARK_INSET,
              centerRect.top + WORDMARK_INSET,
              centerRect.right - WORDMARK_INSET,
              centerRect.bottom - WORDMARK_INSET
            );
            const pillCap = capsuleFromRect(
              o.x + LINK_INSET, o.y + LINK_INSET,
              o.x + o.w - LINK_INSET, o.y + o.h - LINK_INSET
            );
            const cp = segSegClosestPoints(
              pillCap.ax, pillCap.ay, pillCap.bx, pillCap.by,
              wmCap.ax, wmCap.ay, wmCap.bx, wmCap.by
            );
            const ddx = cp.p1x - cp.p2x;
            const ddy = cp.p1y - cp.p2y;
            const dd = Math.hypot(ddx, ddy) || 1e-4;
            const minD = pillCap.radius + wmCap.radius;
            if (dd < minD) {
              onCenterHitRef.current?.();
              const nx = ddx / dd;
              const ny = ddy / dd;
              const overlap = minD - dd;
              o.x += nx * overlap;
              o.y += ny * overlap;
              const vAlong = o.vx * nx + o.vy * ny;
              if (vAlong < 0) {
                o.vx -= 2 * vAlong * nx;
                o.vy -= 2 * vAlong * ny;
              }
            }
          }
          if (hoveredRect && o.id !== hovered) {
            const capO = capsuleFromRect(
              o.x + LINK_INSET, o.y + LINK_INSET,
              o.x + o.w - LINK_INSET, o.y + o.h - LINK_INSET
            );
            const capH = capsuleFromRect(
              hoveredRect.left + LINK_INSET, hoveredRect.top + LINK_INSET,
              hoveredRect.right - LINK_INSET, hoveredRect.bottom - LINK_INSET
            );
            const cp = segSegClosestPoints(
              capO.ax, capO.ay, capO.bx, capO.by,
              capH.ax, capH.ay, capH.bx, capH.by
            );
            const ddx = cp.p1x - cp.p2x;
            const ddy = cp.p1y - cp.p2y;
            const dd = Math.hypot(ddx, ddy) || 1e-4;
            const minD = capO.radius + capH.radius;
            if (dd < minD) {
              const nx = ddx / dd;
              const ny = ddy / dd;
              const overlap = minD - dd;
              o.x += nx * overlap;
              o.y += ny * overlap;
              const vAlong = o.vx * nx + o.vy * ny;
              if (vAlong < 0) {
                o.vx -= 2 * vAlong * nx;
                o.vy -= 2 * vAlong * ny;
              }
            }
          }
        }
        if (o.el) o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
      }

      // Elastic bounce between floating pills (capsule-vs-capsule)
      const objs = objectsRef.current;
      for (let i = 0; i < objs.length; i++) {
        for (let j = i + 1; j < objs.length; j++) {
          const a = objs[i];
          const b = objs[j];
          const capA = capsuleFromRect(
            a.x + LINK_INSET, a.y + LINK_INSET,
            a.x + a.w - LINK_INSET, a.y + a.h - LINK_INSET
          );
          const capB = capsuleFromRect(
            b.x + LINK_INSET, b.y + LINK_INSET,
            b.x + b.w - LINK_INSET, b.y + b.h - LINK_INSET
          );
          const cp = segSegClosestPoints(
            capA.ax, capA.ay, capA.bx, capA.by,
            capB.ax, capB.ay, capB.bx, capB.by
          );
          const ddx = cp.p2x - cp.p1x;
          const ddy = cp.p2y - cp.p1y;
          const dist = Math.hypot(ddx, ddy) || 1e-4;
          const minDist = capA.radius + capB.radius;
          if (dist >= minDist) continue;

          const nx = ddx / dist;
          const ny = ddy / dist;

          const aImmovable = isPaused || a.id === hovered;
          const bImmovable = isPaused || b.id === hovered;

          const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relVel < 0) {
            if (!aImmovable) { a.vx += relVel * nx; a.vy += relVel * ny; }
            if (!bImmovable) { b.vx -= relVel * nx; b.vy -= relVel * ny; }
          }

          const overlap = minDist - dist;
          if (!aImmovable && !bImmovable) {
            const half = overlap / 2;
            a.x -= nx * half; a.y -= ny * half;
            b.x += nx * half; b.y += ny * half;
          } else if (!aImmovable) {
            a.x -= nx * overlap; a.y -= ny * overlap;
          } else if (!bImmovable) {
            b.x += nx * overlap; b.y += ny * overlap;
          }
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
              padding: "12px 28px",
              borderRadius: 9999,
              border: "4px solid #0A0A0A",
              backgroundColor: isHovered ? "#0A0A0A" : "#EDEAE0",
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
