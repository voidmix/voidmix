import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldLabel } from "@voidmix/ui/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@voidmix/ui/components/ui/input-group";
import { useState, type ComponentProps, type ReactNode } from "react";
import { useTranslations } from "../../i18n/client";

interface PasswordFieldProps extends Omit<ComponentProps<typeof InputGroupInput>, "id" | "type"> {
  action?: ReactNode;
  id: string;
  label: string;
}

export function PasswordField({ action, id, label, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("auth");

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {action}
      </div>
      <InputGroup className="h-9">
        <InputGroupInput id={id} type={visible ? "text" : "password"} {...props} />
        <InputGroupAddon align="inline-end">
          <Button
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            className="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setVisible((current) => !current)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {visible ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
