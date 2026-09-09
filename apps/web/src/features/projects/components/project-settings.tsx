import { useTranslations } from "../../../i18n/client";
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
import {
  displayProjectDescription,
  displayProjectMilestone,
  displayProjectName,
  withoutChangedProjectPreviewCopy,
} from "../preview-copy";

export function ProjectSettings({
  project,
  onSave,
}: {
  project: ProjectView;
  onSave: (project: ProjectView) => void;
}) {
  const t = useTranslations("workspaceUi");
  const [draft, setDraft] = useState(project);
  const [dirty, setDirty] = useState({ name: false, description: false, milestone: false });
  const [confirm, setConfirm] = useState(false);

  function saveDraft() {
    const next: ProjectView = {
      ...project,
      ...(dirty.name ? { name: draft.name.trim() } : {}),
      ...(dirty.description ? { description: draft.description } : {}),
      ...(dirty.milestone ? { milestone: draft.milestone } : {}),
      status: draft.status,
    };
    if (!next.name.trim()) return;
    onSave(withoutChangedProjectPreviewCopy(project, next));
  }

  return (
    <div className="grid max-w-xl gap-9">
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          saveDraft();
        }}
      >
        <label className={studioFieldClass}>
          {t("name")}
          <input
            className={studioInputClass}
            value={dirty.name ? draft.name : displayProjectName(project, t)}
            onChange={(event) => {
              setDirty((value) => ({ ...value, name: true }));
              setDraft({ ...draft, name: event.target.value });
            }}
            maxLength={120}
            required
          />
        </label>
        <label className={studioFieldClass}>
          {t("description")}
          <textarea
            className={studioInputClass}
            rows={4}
            value={dirty.description ? draft.description : displayProjectDescription(project, t)}
            onChange={(event) => {
              setDirty((value) => ({ ...value, description: true }));
              setDraft({ ...draft, description: event.target.value });
            }}
            maxLength={2000}
          />
        </label>
        <label className={studioFieldClass}>
          {t("milestone")}
          <input
            className={studioInputClass}
            value={dirty.milestone ? draft.milestone : displayProjectMilestone(project, t)}
            onChange={(event) => {
              setDirty((value) => ({ ...value, milestone: true }));
              setDraft({ ...draft, milestone: event.target.value });
            }}
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
            {(["active", "paused", "completed"] as const).map((status) => (
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
