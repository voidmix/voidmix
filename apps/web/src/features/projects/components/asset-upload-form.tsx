import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { useId, useRef, useState, type FormEvent } from "react";
import type { ProjectStudioDataSource } from "../preview-adapter";

export function AssetUploadForm({
  projectId,
  source,
  onUploaded,
}: {
  projectId: string;
  source: ProjectStudioDataSource;
  onUploaded?: () => void;
}) {
  const t = useTranslations("workspaceUi");
  const homeT = useTranslations("home");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const upload = source.uploadAsset;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !upload || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await upload(projectId, file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setSaved(true);
      onUploaded?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("uploadError"));
    } finally {
      setBusy(false);
    }
  }

  if (!upload) return <p className="text-xs text-muted-foreground">{t("previewUploadDisabled")}</p>;

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="rounded-xl border border-dashed border-border p-4"
    >
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={inputId}>{homeT("uploadFile")}</FieldLabel>
          <FieldDescription id={`${inputId}-detail`}>
            {t("canvasDescription")} · ≤512 KB
          </FieldDescription>
          <Input
            id={inputId}
            ref={inputRef}
            type="file"
            aria-describedby={`${inputId}-detail`}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
              setSaved(false);
            }}
            disabled={busy}
          />
        </Field>
        <Button type="submit" className="w-fit" disabled={!file || busy}>
          {busy ? t("uploading") : t("save")}
        </Button>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="text-xs text-muted-foreground">
            {t("saved")}
          </p>
        ) : null}
      </FieldGroup>
    </form>
  );
}
