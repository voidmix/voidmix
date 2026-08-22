import type { ComponentPropsWithoutRef } from "react";

export interface LogoProps extends ComponentPropsWithoutRef<"span"> {
  label?: string;
}

export function Logo({ label = "Voidmix", className, ...props }: LogoProps) {
  return (
    <span
      className={["inline-flex items-center gap-2 font-semibold tracking-tight", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="logo"
      {...props}
    >
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <path d="M2.5 3.5h27l-5.2 25H7.7l-5.2-25Z" fill="currentColor" />
        <path d="M8.7 9.2h4.2l3.1 9 3.1-9h4.2l-5.2 14.3h-4.2L8.7 9.2Z" fill="var(--background)" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
