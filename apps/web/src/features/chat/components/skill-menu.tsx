import { useLayoutEffect, useRef } from "react";

import type { ChatSkill } from "../skills";

interface SkillMenuProps {
  activeIndex: number;
  listboxId: string;
  onActivate: (index: number) => void;
  onSelect: (skill: ChatSkill) => void;
  optionId: (index: number) => string;
  /** Never empty; the composer hides the menu instead of rendering an empty list. */
  skills: readonly ChatSkill[];
}

export function SkillMenu({
  activeIndex,
  listboxId,
  onActivate,
  onSelect,
  optionId,
  skills,
}: SkillMenuProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // scrollIntoView does not exist in jsdom, and every layout number there is 0,
  // so this arithmetic is an inert no-op under test.
  useLayoutEffect(() => {
    const list = listRef.current;
    const option = list?.children[activeIndex];
    if (!list || !(option instanceof HTMLElement)) return;

    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [activeIndex]);

  return (
    <ul
      aria-label="Skills"
      className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-56 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 animate-in fade-in-0 zoom-in-95"
      id={listboxId}
      ref={listRef}
      role="listbox"
    >
      {skills.map((skill, index) => (
        <li
          aria-selected={index === activeIndex}
          className="flex cursor-default items-baseline gap-2 rounded-md px-1.5 py-1 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
          id={optionId(index)}
          key={skill.name}
          // Selecting with the pointer must never blur the textarea, because the
          // composer closes the menu on blur.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(skill)}
          onMouseEnter={() => onActivate(index)}
          role="option"
        >
          <span className="font-medium">/{skill.name}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {skill.description}
          </span>
        </li>
      ))}
    </ul>
  );
}
