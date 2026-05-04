import { useEffect, useMemo, useRef, useState } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";
import { NODES } from "@/data/nodes";
import FloatingNav from "./FloatingNav";
import Wordmark from "./Wordmark";

const TRANSITION_MS = 500;

type FlyingItem = {
  id: string;
  label: string;
  fromRect: DOMRect;
};

const Stage = () => {
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const flyingRef = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<string[]>(["root"]);
  const [flying, setFlying] = useState<FlyingItem | null>(null);
  const [phase, setPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const [pendingPath, setPendingPath] = useState<string[] | null>(null);

  const currentId = path[path.length - 1];
  const parentId = path.length > 1 ? path[path.length - 2] : null;
  const currentNode = NODES[currentId];

  const items = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (parentId) list.push({ id: `__parent__${parentId}`, label: NODES[parentId].label });
    for (const childId of currentNode.children) {
      list.push({ id: childId, label: NODES[childId].label });
    }
    return list;
  }, [currentId, parentId, currentNode.children]);

  // Run "leaving" animation: fly clicked item to center, fade out floats, crossfade wordmark.
  useEffect(() => {
    if (phase !== "leaving" || !flying || !pendingPath) return;
    const el = flyingRef.current;
    const wm = wordmarkRef.current;
    if (!el || !wm) return;

    const startRect = flying.fromRect;
    const targetRect = wm.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2 - startRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2 - startRect.height / 2;

    el.style.transition = "none";
    el.style.transform = `translate3d(${startRect.left}px, ${startRect.top}px, 0) scale(1)`;
    el.style.opacity = "1";

    requestAnimationFrame(() => {
      el.style.transition = `transform ${TRANSITION_MS}ms ease-in-out, opacity ${TRANSITION_MS}ms ease-in-out`;
      el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(2)`;
      el.style.opacity = "0";
    });

    const t = window.setTimeout(() => {
      setPath(pendingPath);
      setPendingPath(null);
      setFlying(null);
      setPhase("entering");
    }, TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [phase, flying, pendingPath]);

  // After committing new path, fade in then return to idle.
  useEffect(() => {
    if (phase !== "entering") return;
    const t = window.setTimeout(() => setPhase("idle"), 50);
    return () => window.clearTimeout(t);
  }, [phase]);

  const handleClick = (id: string, rect: DOMRect) => {
    if (phase !== "idle") return;
    let nextPath: string[];
    let label: string;
    if (id.startsWith("__parent__")) {
      nextPath = path.slice(0, -1);
      label = NODES[nextPath[nextPath.length - 1]].label;
    } else {
      nextPath = [...path, id];
      label = NODES[id].label;
    }
    setFlying({ id, label, fromRect: rect });
    setPendingPath(nextPath);
    setPhase("leaving");
  };

  const navOpacity = phase === "leaving" ? 0 : phase === "entering" ? 0 : 1;
  // Force a fade-in by mounting "entering" with opacity 0 then bumping to 1 via key+effect.
  // Simpler: use a key to remount FloatingNav on path change so it gets opacity 0→1 from initial transition.
  const navKey = path.join("/");

  return (
    <CenterRectContext.Provider value={wordmarkRef}>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        {/* Static centered wordmark */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Wordmark
            ref={wordmarkRef}
            label={currentNode.label}
            style={{
              opacity: phase === "leaving" ? 0 : 1,
              transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
            }}
          />
        </div>

        {/* Floating nav (remounts on path change for clean enter) */}
        <FloatingNav
          key={navKey}
          items={items}
          onItemClick={handleClick}
          opacity={navOpacity}
          paused={phase !== "idle"}
        />

        {/* Flying ghost during leaving */}
        {phase === "leaving" && flying && (
          <div
            ref={flyingRef}
            className="pointer-events-none absolute left-0 top-0 font-display"
            style={{
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: "-0.01em",
              color: "#0A0A0A",
              padding: "8px 12px",
              transformOrigin: "center",
              willChange: "transform, opacity",
            }}
          >
            {flying.label}
          </div>
        )}
      </div>
    </CenterRectContext.Provider>
  );
};

export default Stage;
