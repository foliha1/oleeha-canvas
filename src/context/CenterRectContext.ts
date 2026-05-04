import { createContext, RefObject } from "react";

export const CenterRectContext = createContext<RefObject<HTMLElement> | null>(null);
