import type { ComponentPropsWithoutRef } from "react";

import markUrl from "./assets/voidmix-mark.png?url";

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
      <img
        alt=""
        aria-hidden="true"
        className="size-7 shrink-0 object-contain"
        data-slot="logo-mark"
        src={markUrl}
      />
      <span>{label}</span>
    </span>
  );
}
