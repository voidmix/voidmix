import type { ComponentPropsWithoutRef } from "react";

export interface BrandMarkProps extends ComponentPropsWithoutRef<"span"> {
  label?: string;
}

export function BrandMark({ label = "Voidmix", className, ...props }: BrandMarkProps) {
  return (
    <span className={["vm-brand", className].filter(Boolean).join(" ")} {...props}>
      <svg aria-hidden="true" className="vm-brand__symbol" viewBox="0 0 32 32">
        <path d="M2.5 3.5h27l-5.2 25H7.7l-5.2-25Z" fill="currentColor" />
        <path
          d="M8.7 9.2h4.2l3.1 9 3.1-9h4.2l-5.2 14.3h-4.2L8.7 9.2Z"
          fill="var(--vm-brand-cut, #0b0d0c)"
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}
