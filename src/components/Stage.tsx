import { useEffect, useMemo, useRef, useState } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";
import { NODES, ROOT_TEXT_LINKS } from "@/data/nodes";
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
    const href = NODES[id]?.href;
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
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

  const handleListNavigate = (next: string[]) => {
    const href = NODES[next[next.length - 1]]?.href;
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    setPath(next);
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

            {path.length === 1 && path[0] === "root" && (
              <div
                className="absolute left-1/2 top-1/2 flex justify-center"
                style={{
                  transform: "translate(-50%, calc(50% + 120px))",
                  gap: 24,
                  opacity: phase === "leaving" ? 0 : 1,
                  transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
                  zIndex: 0,
                }}
              >
                {ROOT_TEXT_LINKS.map((id) => (
                  <button
                    key={id}
                    onClick={() => handleClick(id)}
                    className="cursor-pointer no-underline hover:underline"
                    style={{
                      fontFamily: '"PP Montreal Text", sans-serif',
                      fontSize: 16,
                      color: "#0A0A0A",
                      background: "transparent",
                      border: 0,
                      padding: 0,
                    }}
                  >
                    {NODES[id].label}
                  </button>
                ))}
              </div>
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
          <ListView path={path} onNavigate={handleListNavigate} />
        )}
      </div>
    </CenterRectContext.Provider>
  );
};

export default Stage;
