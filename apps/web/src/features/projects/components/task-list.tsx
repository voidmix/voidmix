import { useTranslations } from "../../../i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { EmptyState } from "@voidmix/ui/empty-state";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useState } from "react";
import { taskStatusSchema, type TaskView } from "../types";
import { studioFieldClass, studioInputClass } from "../studio-styles";
import { displayTaskOwner, displayTaskTitle, withoutChangedTaskPreviewCopy } from "../preview-copy";

export function TaskList({
  tasks,
  onUpdate,
  onAdd,
}: {
  tasks: TaskView[];
  onUpdate: (task: TaskView) => void;
  onAdd: (title: string) => void;
}) {
  const t = useTranslations("workspaceUi");
  const [title, setTitle] = useState("");
  return (
    <div>
      <form
        className="mb-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) {
            onAdd(title);
            setTitle("");
          }
        }}
      >
        <input
          className={`${studioInputClass} min-w-0 flex-1`}
          aria-label={t("taskTitle")}
          placeholder={t("taskTitle")}
          maxLength={300}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" disabled={!title.trim()} variant="secondary">
          {t("newTask")}
        </Button>
      </form>
      {!tasks.length ? (
        <EmptyState title={t("noTasks")} description={t("noTasksDetail")} />
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} onUpdate={onUpdate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task, onUpdate }: { task: TaskView; onUpdate: (task: TaskView) => void }) {
  const t = useTranslations("workspaceUi");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const [dirty, setDirty] = useState({ title: false, owner: false });

  function openEditor() {
    setDraft(task);
    setDirty({ title: false, owner: false });
    setEditing((value) => !value);
  }

  function saveDraft() {
    const next: TaskView = {
      ...task,
      ...(dirty.title ? { title: draft.title.trim() } : {}),
      ...(dirty.owner ? { owner: draft.owner.trim() } : {}),
      status: draft.status,
      priority: draft.priority,
    };
    if (!next.title || !next.owner) return;
    onUpdate(withoutChangedTaskPreviewCopy(task, next));
    setEditing(false);
  }

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-border transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          aria-label={`${task.status === "done" ? t("restore") : t("done")}: ${displayTaskTitle(task, t)}`}
          onClick={() => {
            const status = task.status === "done" ? "todo" : "done";
            setDraft((current) => ({ ...current, status }));
            onUpdate({ ...task, status });
          }}
        >
          {task.status === "done" ? "✓" : "○"}
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={openEditor}
          aria-expanded={editing}
        >
          <span
            className={`block truncate text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}
          >
            {displayTaskTitle(task, t)}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {displayTaskOwner(task, t)} · {t(task.priority)}
          </span>
        </button>
        <StatusBadge
          label={t(task.status)}
          tone={
            task.status === "blocked" ? "blocked" : task.status === "done" ? "complete" : "neutral"
          }
        />
      </div>
      {editing ? (
        <form
          className="mt-3.5 grid grid-cols-2 gap-4 rounded-lg bg-muted p-5 max-[520px]:grid-cols-1"
          onSubmit={(event) => {
            event.preventDefault();
            saveDraft();
          }}
        >
          <label className={studioFieldClass}>
            {t("taskTitle")}
            <input
              className={studioInputClass}
              value={dirty.title ? draft.title : displayTaskTitle(task, t)}
              maxLength={300}
              required
              onChange={(event) => {
                setDirty((value) => ({ ...value, title: true }));
                setDraft({ ...draft, title: event.target.value });
              }}
            />
          </label>
          <label className={studioFieldClass}>
            {t("owner")}
            <input
              className={studioInputClass}
              value={dirty.owner ? draft.owner : displayTaskOwner(task, t)}
              maxLength={80}
              required
              onChange={(event) => {
                setDirty((value) => ({ ...value, owner: true }));
                setDraft({ ...draft, owner: event.target.value });
              }}
            />
          </label>
          <label className={studioFieldClass}>
            {t("status")}
            <select
              className={studioInputClass}
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: taskStatusSchema.parse(event.target.value) })
              }
            >
              {taskStatusSchema.options.map((status) => (
                <option key={status} value={status}>
                  {t(status)}
                </option>
              ))}
            </select>
          </label>
          <label className={studioFieldClass}>
            {t("priority")}
            <select
              className={studioInputClass}
              value={draft.priority}
              onChange={(event) =>
                setDraft({ ...draft, priority: event.target.value === "high" ? "high" : "normal" })
              }
            >
              <option value="normal">{t("normal")}</option>
              <option value="high">{t("high")}</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={!draft.title.trim()}>
              {t("save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
