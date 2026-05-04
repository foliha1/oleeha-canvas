export type NodeData = {
  label: string;
  children: string[];
};

export const NODES: Record<string, NodeData> = {
  root: { label: "oleeha&co", children: ["projects", "say hey", "ideas", "about"] },
  projects: { label: "projects", children: ["whoop!", "capclub", "atelier"] },
  "say hey": { label: "say hey", children: [] },
  ideas: { label: "ideas", children: [] },
  about: { label: "about", children: [] },
  "whoop!": { label: "whoop!", children: [] },
  capclub: { label: "capclub", children: [] },
  atelier: { label: "atelier", children: [] },
};
