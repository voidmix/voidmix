import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import type { ComponentPropsWithoutRef } from "react";

export interface AvatarProps extends ComponentPropsWithoutRef<"span"> {
  name: string;
  imageUrl?: string;
  size?: "small" | "medium" | "large";
}

export function Avatar({ name, imageUrl, size = "medium", className, ...props }: AvatarProps) {
  const { style, ...restProps } = props;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  return (
    <BaseAvatar.Root
      aria-label={name}
      className={["vm-avatar", `vm-avatar--${size}`, className].filter(Boolean).join(" ")}
      data-slot="avatar"
      role="img"
      {...restProps}
      {...(style === undefined ? {} : { style })}
    >
      {imageUrl ? <BaseAvatar.Image alt="" data-slot="avatar-image" src={imageUrl} /> : null}
      <BaseAvatar.Fallback data-slot="avatar-fallback">{initials}</BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
