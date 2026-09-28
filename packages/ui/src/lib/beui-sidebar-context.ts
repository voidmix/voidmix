import { createContext, useContext } from "react";

export const BeuiSidebarContext = createContext<{
  layoutId: string;
  highlighted: string | null;
  highlight: (id: string | null) => void;
} | null>(null);

export function useBeuiSidebar() {
  const context = useContext(BeuiSidebarContext);
  if (!context) throw new Error("BeuiSidebarItem requires BeuiSidebarNavigation");
  return context;
}
