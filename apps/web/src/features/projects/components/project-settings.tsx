import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@voidmix/ui/components/ui/dialog";
import { useState } from "react";
import { projectViewSchema, type ProjectView } from "../types";
import { studioFieldClass, studioInputClass } from "../studio-styles";

export function ProjectSettings({
  project,
  onSave,
}: {
  project: ProjectView;
  onSave: (project: ProjectView) => void;
}) {
  const t = useTranslations("workspaceUi");
  const [draft, setDraft] = useState(project);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="grid max-w-xl gap-9">
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.name.trim()) onSave({ ...draft, name: draft.name.trim() });
        }}
      >
        <label className={studioFieldClass}>
          {t("name")}
          <input
            className={studioInputClass}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            maxLength={120}
            required
          />
        </label>
        <label className={studioFieldClass}>
          {t("description")}
          <textarea
            className={studioInputClass}
            rows={4}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            maxLength={2000}
          />
        </label>
        <label className={studioFieldClass}>
          {t("milestone")}
          <input
            className={studioInputClass}
            value={draft.milestone}
            onChange={(event) => setDraft({ ...draft, milestone: event.target.value })}
            maxLength={200}
          />
        </label>
        <label className={studioFieldClass}>
          {t("status")}
          <select
            className={studioInputClass}
            value={draft.status}
            onChange={(event) =>
              setDraft({
                ...draft,
                status: projectViewSchema.shape.status.parse(event.target.value),
              })
            }
          >
            {["active", "paused", "completed"].map((status) => (
              <option key={status} value={status}>
                {t(status)}
              </option>
            ))}
            {draft.status === "archived" ? <option value="archived">{t("archived")}</option> : null}
          </select>
        </label>
        <Button type="submit" className="w-fit" disabled={!draft.name.trim()} variant="primary">
          {t("save")}
        </Button>
      </form>
      <section className="border-t border-border pt-6">
        <h2 className="text-sm font-medium">{t("permissions")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("permissionsDetail")}</p>
      </section>
      <section className="border-t border-border pt-6">
        <h2 className="text-sm font-medium">{t("archive")}</h2>
        <p className="my-3 text-sm leading-6 text-muted-foreground">{t("archiveDetail")}</p>
        <Button
          variant="secondary"
          onClick={() =>
            project.status === "archived"
              ? onSave({ ...project, status: "active" })
              : setConfirm(true)
          }
        >
          {t(project.status === "archived" ? "restore" : "archive")}
        </Button>
      </section>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t("archiveConfirm")}</DialogTitle>
          <DialogDescription>{t("archiveDetail")}</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onSave({ ...project, status: "archived" });
                setConfirm(false);
              }}
            >
              {t("archive")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
