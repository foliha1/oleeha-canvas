type Mode = "interactive" | "list";

type Props = {
  mode: Mode;
  onChange: (m: Mode) => void;
};

const ViewToggle = ({ mode, onChange }: Props) => {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="fixed z-50 flex items-center justify-between"
      style={{
        top: 24,
        right: 24,
        width: 80,
        height: 32,
        background: "#EDEAE0",
        border: "1px solid #0A0A0A",
        borderRadius: 9999,
        padding: 2,
      }}
    >
      <button
        type="button"
        aria-label="Interactive view"
        aria-pressed={mode === "interactive"}
        onClick={() => onChange("interactive")}
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: 26,
          height: 26,
          borderRadius: 9999,
          background: mode === "interactive" ? "#0A0A0A" : "transparent",
          border: 0,
          padding: 0,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          {mode === "interactive" ? (
            <circle cx="5" cy="5" r="4" fill="#EDEAE0" />
          ) : (
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="#0A0A0A" strokeWidth="1" />
          )}
        </svg>
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={mode === "list"}
        onClick={() => onChange("list")}
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: 26,
          height: 26,
          borderRadius: 9999,
          background: mode === "list" ? "#0A0A0A" : "transparent",
          border: 0,
          padding: 0,
        }}
      >
        <svg width="14" height="10" viewBox="0 0 14 10">
          {[1.5, 5, 8.5].map((y) => (
            <line
              key={y}
              x1="1"
              x2="13"
              y1={y}
              y2={y}
              stroke={mode === "list" ? "#EDEAE0" : "#0A0A0A"}
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </button>
    </div>
  );
};

export default ViewToggle;
