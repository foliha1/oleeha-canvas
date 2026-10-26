export type NodeData = {
  label: string;
  children: string[];
  href?: string;
};

export const NODES: Record<string, NodeData> = {
  root: { label: "oleeha&co", children: ["whoop! whoop!"] },
  "whoop! whoop!": { label: "whoop! whoop!", children: [], href: "https://whoop-whoop.com" },
  "say hey": { label: "say hey", children: [] },
  about: { label: "about", children: [] },
};

export const ROOT_TEXT_LINKS = ["about", "say hey"];
