import { useContext, useEffect, useRef, useState } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";

const LABELS = ["projects", "say hey", "ideas", "about"] as const;
const SPEED = 90; // px/s

type Obj = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  el: HTMLButtonElement | null;
};

function randomAngle() {
  while (true) {
    const a = Math.random() * Math.PI * 2;
    const deg = (a * 180) / Math.PI;
    const mod = deg % 90;
    if (mod > 15 && mod < 75) return a;
  }
}

const FloatingNav = () => {
  const centerRef = useContext(CenterRectContext);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const objectsRef = useRef<Obj[]>([]);
  const hoveredRef = useRef<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const setHover = (i: number | null) => {
    hoveredRef.current = i;
    setHoveredId(i);
  };

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    objectsRef.current = LABELS.map((_, i) => {
      const el = buttonsRef.current[i];
      const rect = el?.getBoundingClientRect();
      const w = rect?.width ?? 100;
      const h = rect?.height ?? 40;
      const angle = randomAngle();
      return {
        x: Math.random() * (vw - w),
        y: Math.random() * (vh - h),
        vx: Math.cos(angle) * SPEED,
        vy: Math.sin(angle) * SPEED,
        w,
        h,
        el,
      };
    });

    let raf = 0;
    let last = performance.now();

    const resolveCollision = (o: Obj, b: DOMRect | { left: number; top: number; right: number; bottom: number }) => {
      const ax1 = o.x;
      const ay1 = o.y;
      const ax2 = o.x + o.w;
      const ay2 = o.y + o.h;
      if (ax1 >= b.right || ax2 <= b.left || ay1 >= b.bottom || ay2 <= b.top) return;
      const overlapLeft = ax2 - b.left;
      const overlapRight = b.right - ax1;
      const overlapTop = ay2 - b.top;
      const overlapBottom = b.bottom - ay1;
      const minX = Math.min(overlapLeft, overlapRight);
      const minY = Math.min(overlapTop, overlapBottom);
      if (minX < minY) {
        if (overlapLeft < overlapRight) {
          o.x -= overlapLeft;
          o.vx = -Math.abs(o.vx);
        } else {
          o.x += overlapRight;
          o.vx = Math.abs(o.vx);
        }
      } else {
        if (overlapTop < overlapBottom) {
          o.y -= overlapTop;
          o.vy = -Math.abs(o.vy);
        } else {
          o.y += overlapBottom;
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

      // refresh hovered object size + build hovered obstacle rect
      let hoveredRect: { left: number; top: number; right: number; bottom: number } | null = null;
      if (hovered != null) {
        const o = objectsRef.current[hovered];
        if (o) {
          // refresh size in case scale changed layout — use untransformed measurement
          hoveredRect = {
            left: o.x,
            top: o.y,
            right: o.x + o.w,
            bottom: o.y + o.h,
          };
        }
      }

      for (let i = 0; i < objectsRef.current.length; i++) {
        const o = objectsRef.current[i];
        if (i === hovered) {
          // skip movement, preserve velocity, still update transform
          if (o.el) o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
          continue;
        }

        o.x += o.vx * dt;
        o.y += o.vy * dt;

        if (o.x <= 0) {
          o.x = 0;
          o.vx = Math.abs(o.vx);
        } else if (o.x + o.w >= VW) {
          o.x = VW - o.w;
          o.vx = -Math.abs(o.vx);
        }
        if (o.y <= 0) {
          o.y = 0;
          o.vy = Math.abs(o.vy);
        } else if (o.y + o.h >= VH) {
          o.y = VH - o.h;
          o.vy = -Math.abs(o.vy);
        }

        if (centerRect) resolveCollision(o, centerRect);
        if (hoveredRect) resolveCollision(o, hoveredRect);

        if (o.el) {
          o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const resetClock = () => {
      last = performance.now();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") resetClock();
    };
    const onResize = () => {
      const VW = window.innerWidth;
      const VH = window.innerHeight;
      for (const o of objectsRef.current) {
        o.x = Math.min(o.x, VW - o.w);
        o.y = Math.min(o.y, VH - o.h);
      }
    };

    window.addEventListener("focus", resetClock);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("focus", resetClock);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [centerRef]);

  return (
    <div className="absolute inset-0">
      {LABELS.map((label, i) => {
        const isHovered = hoveredId === i;
        return (
          <button
            key={label}
            ref={(el) => (buttonsRef.current[i] = el)}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(hoveredRef.current === i ? null : hoveredRef.current)}
            className="absolute left-0 top-0 cursor-pointer font-display"
            style={{
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: "-0.01em",
              color: "#0A0A0A",
              padding: "8px 12px",
              transform: "translate3d(-9999px, -9999px, 0)",
              background: "transparent",
              border: 0,
              transformOrigin: "center",
              transition: "scale 200ms ease-out, text-decoration-color 200ms ease-out",
              scale: isHovered ? "1.08" : "1",
              textDecoration: isHovered ? "underline" : "none",
              textDecorationThickness: "2px",
              textDecorationColor: "#0A0A0A",
              textUnderlineOffset: "6px",
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
