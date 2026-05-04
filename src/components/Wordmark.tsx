import { forwardRef, CSSProperties } from "react";

type Props = {
  label: string;
  style?: CSSProperties;
  className?: string;
};

const TEXT_STYLE: CSSProperties = {
  fontWeight: 900,
  fontSize: "clamp(48px, 9vw, 160px)",
  letterSpacing: "-0.03em",
  color: "#0A0A0A",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const IMG_STYLE: CSSProperties = {
  fontWeight: 900,
  fontSize: "clamp(48px, 9vw, 160px)",
  letterSpacing: "-0.03em",
  color: "#0A0A0A",
};

const Wordmark = forwardRef<HTMLHeadingElement, Props>(({ label, style, className }, ref) => {
  const isRoot = label === "oleeha&co";
  return (
    <h1
      ref={ref}
      className={`font-display ${className ?? ""}`}
      style={{ ...(isRoot ? IMG_STYLE : TEXT_STYLE), ...style }}
    >
      {isRoot ? (
        <img
          src="/oleeha-co-logo.svg"
          alt="oleeha & co"
          style={{ height: "clamp(40px, 7vw, 130px)", width: "auto", display: "block" }}
          draggable={false}
        />
      ) : (
        <span>{label}</span>
      )}
    </h1>
  );
});

Wordmark.displayName = "Wordmark";
export default Wordmark;
