import { forwardRef, CSSProperties } from "react";

type Props = {
  label: string;
  style?: CSSProperties;
  className?: string;
};

const DISPLAY_STYLE: CSSProperties = {
  fontWeight: 900,
  fontSize: "clamp(48px, 9vw, 160px)",
  letterSpacing: "-0.03em",
  color: "#0A0A0A",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const Wordmark = forwardRef<HTMLHeadingElement, Props>(({ label, style, className }, ref) => {
  const isRoot = label === "oleeha&co";
  return (
    <h1
      ref={ref}
      className={`font-display ${className ?? ""}`}
      style={{ ...DISPLAY_STYLE, ...style }}
    >
      {isRoot ? (
        <>
          <span>oleeha</span>
          <span style={{ color: "transparent", WebkitTextStroke: "2px #0A0A0A" }}>&amp;co</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </h1>
  );
});

Wordmark.displayName = "Wordmark";
export default Wordmark;
