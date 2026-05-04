import { forwardRef, CSSProperties, useEffect, useState } from "react";

type Props = {
  label: string;
  style?: CSSProperties;
  className?: string;
  flashSignal?: number;
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

const Wordmark = forwardRef<HTMLHeadingElement, Props>(({ label, style, className, flashSignal = 0 }, ref) => {
  const isRoot = label === "oleeha&co";
  const [color, setColor] = useState("#0A0A0A");
  const [transitionEnabled, setTransitionEnabled] = useState(false);

  useEffect(() => {
    if (!isRoot || flashSignal === 0) return;
    setTransitionEnabled(false);
    const hue = Math.floor(Math.random() * 360);
    setColor(`hsl(${hue}, 75%, 50%)`);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setTransitionEnabled(true);
        setColor("#0A0A0A");
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      if (r2) cancelAnimationFrame(r2);
    };
  }, [flashSignal, isRoot]);

  useEffect(() => {
    if (!isRoot) {
      setColor("#0A0A0A");
      setTransitionEnabled(false);
    }
  }, [isRoot]);

  return (
    <h1
      ref={ref}
      className={`font-display ${className ?? ""}`}
      style={{ ...(isRoot ? IMG_STYLE : TEXT_STYLE), ...style }}
    >
      {isRoot ? (
        <div
          aria-label="oleeha & co"
          role="img"
          style={{
            height: "clamp(40px, 7vw, 130px)",
            aspectRatio: "1968 / 318",
            backgroundColor: color,
            WebkitMaskImage: "url(/oleeha-co-logo.svg)",
            maskImage: "url(/oleeha-co-logo.svg)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            transition: transitionEnabled ? "background-color 5000ms ease-out" : "none",
          }}
        />
      ) : (
        <span>{label}</span>
      )}
    </h1>
  );
});

Wordmark.displayName = "Wordmark";
export default Wordmark;
