import type { ComponentProps, ReactNode } from "react";
import { Field, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";

export function AuthInput({
  label,
  id,
  ...props
}: ComponentProps<typeof Input> & { id: string; label: ReactNode }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input className="h-9" required id={id} {...props} />
    </Field>
  );
}
