import { Link } from "@tanstack/react-router";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@voidmix/ui/components/ui/dialog";
import { CommandInput } from "@voidmix/ui/command-input";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { StatusBadge } from "@voidmix/ui/status-badge";
import { useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "../projects/components/workspace-shell";
import { useWorkspaceData } from "../projects/workspace-data";
import { RunTimeline } from "./run-timeline";
import { runPreview } from "./preview-runner";

export function PiPage({ projectId, sessionId }: { projectId: string; sessionId: string }) {
  const t = useTranslations("workspaceUi");
  const { source, snapshot } = useWorkspaceData();
  const session = snapshot.sessions.find(
    (item) => item.id === sessionId && item.projectId === projectId,
  );
  const project = snapshot.projects.find((item) => item.id === projectId);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [sessionId],
  );
  if (!project || !session)
    return (
      <WorkspaceShell>
        <EmptyState
          title={t("missingSession")}
          description={t("missingSessionDetail")}
          action={<Link to="/projects">{t("back")}</Link>}
        />
      </WorkspaceShell>
    );
  const task = snapshot.tasks.find(
    (item) => item.id === session.taskId && item.projectId === projectId,
  );
  function start() {
    if (!session || !project || controller.current) return;
    setConfirm(false);
    const current = new AbortController();
    controller.current = current;
    void runPreview(
      source,
      { ...session, prompt: draft.trim() || session.prompt },
      current.signal,
    ).finally(() => {
      if (controller.current === current) controller.current = null;
    });
  }
  return (
    <WorkspaceShell title={`${project.name} / Pi`}>
      <Link
        to="/projects/$projectId"
        params={{ projectId }}
        search={{ tab: "pi", filter: "all" }}
        className="mb-6 inline-block text-xs text-muted-foreground"
      >
        ← {project.name}
      </Link>
      <PageHeader
        title={`Pi / ${t("session")}`}
        description={project.name}
        action={
          <StatusBadge
            label={t(session.status)}
            tone={
              session.status === "failed"
                ? "blocked"
                : session.status === "completed"
                  ? "complete"
                  : "active"
            }
          />
        }
      />
      <section className="signal-capabilities">
        <h2 className="text-sm font-medium">{t("capabilities")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("capabilitiesDetail")}</p>
      </section>
      {session.prompt ? (
        <div className="signal-prompt">
          <span className="signal-label">{t("goal")}</span>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">
            {session.prompt}
          </p>
        </div>
      ) : null}
      {session.status !== "idle" ? <RunTimeline session={session} /> : null}
      <div role="status" className="my-4 text-sm text-muted-foreground">
        {session.status === "cancelled"
          ? t("stopped")
          : session.status === "failed"
            ? t("runError")
            : session.status === "running"
              ? t(
                  session.steps.length === 0
                    ? "understand"
                    : session.steps.length === 1
                      ? "context"
                      : "createStep",
                )
              : ""}
      </div>
      {session.status === "running" ? (
        <Button onClick={() => controller.current?.abort()} variant="secondary">
          {t("stop")}
        </Button>
      ) : task ? (
        <section className="signal-result">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{t("runResult")}</h2>
            <StatusBadge label={t("completed")} tone="complete" />
          </div>
          <p className="my-4 text-sm leading-7 [overflow-wrap:anywhere]">{task.title}</p>
          <p className="mb-4 text-xs text-muted-foreground">{t("completeStep")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/projects/$projectId"
              params={{ projectId }}
              search={{ tab: "tasks", filter: "all" }}
              className="text-sm underline"
            >
              {t("openTask")}
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                source.removeTask(task.id);
                source.updateSession({ ...session, status: "idle", steps: [], taskId: null });
              }}
            >
              {t("undo")}
            </Button>
          </div>
        </section>
      ) : (
        <div className="mt-6">
          <CommandInput
            value={draft || session.prompt}
            onChange={(value) => {
              setDraft(value);
              source.updateSession({ ...session, prompt: value });
            }}
            onSubmit={() => setConfirm(true)}
            label={t("ask")}
            placeholder={t("placeholder")}
            submitLabel={t(session.status === "failed" ? "retry" : "run")}
            context={
              <span>
                {project.name} · {t("preview")}
              </span>
            }
          />
        </div>
      )}
      <p className="mt-5 text-xs leading-6 text-muted-foreground">{t("previewNote")}</p>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t("confirm")}</DialogTitle>
          <DialogDescription>{t("confirmDetail")}</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t("cancel")}
            </Button>
            <Button variant="primary" onClick={start}>
              {t("confirmRun")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
