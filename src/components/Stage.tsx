import { useRef } from "react";
import { CenterRectContext } from "@/context/CenterRectContext";

const Stage = () => {
  const wordmarkRef = useRef<HTMLHeadingElement>(null);

  return (
    <CenterRectContext.Provider value={wordmarkRef}>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <h1
            ref={wordmarkRef}
            className="whitespace-nowrap font-display leading-none"
            style={{
              fontWeight: 900,
              fontSize: "clamp(48px, 9vw, 160px)",
              letterSpacing: "-0.03em",
              color: "#0A0A0A",
            }}
          >
            <span>oleeha</span>
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #0A0A0A",
              }}
            >
              &amp;co
            </span>
          </h1>
        </div>
      </div>
    </CenterRectContext.Provider>
  );
};

export default Stage;
