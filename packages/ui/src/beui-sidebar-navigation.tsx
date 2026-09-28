// Adapted from beUI animated-sidebar and shared-layout-bg (MIT). See beui-NOTICE.md.
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { BeuiSidebarContext, useBeuiSidebar } from "./lib/beui-sidebar-context";
import { beuiTransition } from "./lib/beui-motion";

export function BeuiSidebarNavigation({ label, children }: { label: string; children: ReactNode }) {
  const layoutId = useId();
  const [highlighted, highlight] = useState<string | null>(null);
  return (
    <BeuiSidebarContext value={{ layoutId, highlighted, highlight }}>
      <nav
        aria-label={label}
        onPointerLeave={() => highlight(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) highlight(null);
        }}
      >
        <ul className="flex list-none flex-col gap-1">{children}</ul>
      </nav>
    </BeuiSidebarContext>
  );
}

export function BeuiSidebarItem({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  const { layoutId, highlighted, highlight } = useBeuiSidebar();
  const reduce = useReducedMotion();
  const selected = highlighted === id || (highlighted === null && active);
  return (
    <li
      className="beui-sidebar-item relative"
      data-active={active || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") highlight(id);
      }}
      onFocus={() => highlight(id)}
    >
      {selected ? (
        <motion.span
          aria-hidden="true"
          {...(reduce ? {} : { layoutId: `beui-nav-${layoutId}` })}
          initial={false}
          transition={reduce ? { duration: 0 } : beuiTransition}
          className="pointer-events-none absolute inset-0 rounded-lg bg-muted"
        />
      ) : null}
      {children}
    </li>
  );
}
