import { NODES } from "@/data/nodes";

type Props = {
  path: string[];
  onNavigate: (path: string[]) => void;
};

const ListView = ({ path, onNavigate }: Props) => {
  const currentId = path[path.length - 1];
  const parentId = path.length > 1 ? path[path.length - 2] : null;
  const node = NODES[currentId];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center" style={{ gap: 24 }}>
        {parentId ? (
          <button
            onClick={() => onNavigate(path.slice(0, -1))}
            className="cursor-pointer font-display"
            style={{
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.01em",
              color: "#0A0A0A",
              background: "transparent",
              border: 0,
              padding: 0,
            }}
          >
            ← {NODES[parentId].label}
          </button>
        ) : (
          <div style={{ height: 18 }} />
        )}

        <h2
          className="font-display"
          style={{
            fontWeight: 900,
            fontSize: 64,
            letterSpacing: "-0.03em",
            color: "#0A0A0A",
            lineHeight: 1,
            margin: 0,
            textAlign: "center",
          }}
        >
          {currentId === "root" ? (
            <img
              src="/oleeha-co-logo.svg"
              alt="oleeha & co"
              style={{ height: "clamp(40px, 7vw, 130px)", width: "auto", display: "block" }}
              draggable={false}
            />
          ) : (
            node.label
          )}
        </h2>

        <div className="flex flex-col items-center" style={{ gap: 16, marginTop: 16 }}>
          {node.children.map((childId) => (
            <button
              key={childId}
              onClick={() => onNavigate([...path, childId])}
              className="cursor-pointer font-display"
              style={{
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: "-0.01em",
                color: "transparent",
                WebkitTextStroke: "1.25px #0A0A0A",
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              {NODES[childId].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListView;
