import { useContext, useEffect, useRef } from "react";
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
  // avoid axis-aligned angles (0, 90, 180, 270)
  while (true) {
    const a = Math.random() * Math.PI * 2;
    const deg = (a * 180) / Math.PI;
    const mod = deg % 90;
    if (mod > 15 && mod < 75) return a;
  }
}

const FloatingNav = () => {
  const centerRef = useContext(CenterRectContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const objectsRef = useRef<Obj[]>([]);

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

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const VW = window.innerWidth;
      const VH = window.innerHeight;
      const centerRect = centerRef?.current?.getBoundingClientRect();

      for (const o of objectsRef.current) {
        o.x += o.vx * dt;
        o.y += o.vy * dt;

        // Edge collisions
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

        // Center collision (AABB)
        if (centerRect) {
          const ax1 = o.x;
          const ay1 = o.y;
          const ax2 = o.x + o.w;
          const ay2 = o.y + o.h;
          const bx1 = centerRect.left;
          const by1 = centerRect.top;
          const bx2 = centerRect.right;
          const by2 = centerRect.bottom;

          if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) {
            // overlap distances on each side
            const overlapLeft = ax2 - bx1; // push left
            const overlapRight = bx2 - ax1; // push right
            const overlapTop = ay2 - by1; // push up
            const overlapBottom = by2 - ay1; // push down
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
          }
        }

        if (o.el) {
          o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const handleResize = () => {
      const VW = window.innerWidth;
      const VH = window.innerHeight;
      for (const o of objectsRef.current) {
        o.x = Math.min(o.x, VW - o.w);
        o.y = Math.min(o.y, VH - o.h);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [centerRef]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {LABELS.map((label, i) => (
        <button
          key={label}
          ref={(el) => (buttonsRef.current[i] = el)}
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
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default FloatingNav;
