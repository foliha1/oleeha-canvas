import { useEffect, useMemo, useRef, useState } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";
import { NODES } from "@/data/nodes";
import FloatingNav from "./FloatingNav";
import ListView from "./ListView";
import ViewToggle from "./ViewToggle";
import Wordmark from "./Wordmark";

type Mode = "interactive" | "list";

const TRANSITION_MS = 350;

const Stage = () => {
  const wordmarkRef = useRef<HTMLElement>(null);
  const [path, setPath] = useState<string[]>(["root"]);
  const [phase, setPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const [nextPathState, setNextPathState] = useState<string[] | null>(null);
  const [hitCount, setHitCount] = useState(0);
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "list"
      : "interactive"
  );

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

  // Crossfade: after fade-out, swap path and switch to entering.
  useEffect(() => {
    if (phase !== "leaving" || !nextPathState) return;
    const t = window.setTimeout(() => {
      setPath(nextPathState);
      setNextPathState(null);
      setPhase("entering");
    }, TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [phase, nextPathState]);

  // After committing new path, fade in then return to idle.
  useEffect(() => {
    if (phase !== "entering") return;
    const t = window.setTimeout(() => setPhase("idle"), 50);
    return () => window.clearTimeout(t);
  }, [phase]);

  const handleClick = (id: string) => {
    if (phase !== "idle") return;
    let nextPath: string[];
    if (id.startsWith("__parent__")) {
      nextPath = path.slice(0, -1);
    } else {
      nextPath = [...path, id];
    }
    setNextPathState(nextPath);
    setPhase("leaving");
  };

  const navKey = `${mode}/${path.join("/")}`;

  return (
    <CenterRectContext.Provider value={wordmarkRef}>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        <ViewToggle mode={mode} onChange={setMode} />

        {mode === "interactive" ? (
          <>
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Wordmark
                ref={wordmarkRef}
                label={currentNode.label}
                flashSignal={hitCount}
                style={{
                  opacity: phase === "leaving" ? 0 : 1,
                  transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
                }}
              />
            </div>

            {path.length === 1 && path[0] === "root" && (
              <p
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2"
                style={{
                  transform: "translate(-50%, calc(50% + 60px))",
                  fontFamily: '"PP Mueum", serif',
                  fontWeight: 400,
                  fontStyle: "normal",
                  fontSize: "clamp(22px, 2.4vw, 38px)",
                  letterSpacing: "-0.04em",
                  color: "#807F79",
                  margin: 0,
                  textAlign: "center",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  opacity: phase === "leaving" ? 0 : 1,
                  transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
                  zIndex: 0,
                }}
              >
                More joy. Less everything else.
              </p>
            )}

            <FloatingNav
              key={navKey}
              items={items}
              onItemClick={handleClick}
              opacity={phase === "leaving" ? 0 : 1}
              paused={phase !== "idle"}
              onCenterHit={() => setHitCount((c) => c + 1)}
            />
          </>
        ) : (
          <ListView path={path} onNavigate={setPath} />
        )}
      </div>
    </CenterRectContext.Provider>
  );
};

export default Stage;
