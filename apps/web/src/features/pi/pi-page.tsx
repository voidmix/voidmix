import { Link } from "@tanstack/react-router";
import { useTranslations } from "../../i18n/client";
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
import { ProjectStudioShell } from "../projects/components/studio-shell";
import { useProjectStudioData } from "../projects/studio-data";
import { studioLabelClass } from "../projects/studio-styles";
import { displayProjectName, displayTaskTitle } from "../projects/preview-copy";
import { RunTimeline } from "./run-timeline";
import { runPreview } from "./preview-runner";

export function PiPage({ projectId, sessionId }: { projectId: string; sessionId: string }) {
  const t = useTranslations("workspaceUi");
  const { source, snapshot } = useProjectStudioData();
  const session = snapshot.sessions.find(
    (item) => item.id === sessionId && item.projectId === projectId,
  );
  const project = snapshot.projects.find((item) => item.id === projectId);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [temperature, setTemperature] = useState("0.2");
  const [controlBusy, setControlBusy] = useState(false);
  const [controlError, setControlError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const confirmInvoker = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [sessionId],
  );
  if (!project || !session)
    return (
      <ProjectStudioShell>
        <EmptyState
          title={t("missingSession")}
          description={t("missingSessionDetail")}
          action={<Link to="/projects">{t("back")}</Link>}
        />
      </ProjectStudioShell>
    );
  const projectName = displayProjectName(project, t);
  const task = snapshot.tasks.find(
    (item) => item.id === session.taskId && item.projectId === projectId,
  );
  function start() {
    if (!session || !project || controller.current) return;
    setConfirm(false);
    const current = new AbortController();
    controller.current = current;
    const input = { ...session, prompt: draft.trim() || session.prompt };
    const run = source.startSession
      ? source.startSession(input).then(() => undefined)
      : runPreview(source, input, current.signal);
    void run.finally(() => {
      if (controller.current === current) controller.current = null;
    });
    setTimeout(() => document.querySelector<HTMLElement>("[data-pi-stop]")?.focus(), 0);
  }
  function closeConfirm() {
    setConfirm(false);
    queueMicrotask(() => confirmInvoker.current?.isConnected && confirmInvoker.current.focus());
  }
  return (
    <ProjectStudioShell
      title={`${projectName} / ${t("pi")}`}
      projectSearch={{ tab: "pi", filter: "all" }}
    >
      <Link
        to="/projects/$projectId"
        params={{ projectId }}
        search={{ tab: "pi", filter: "all" }}
        className="mb-6 inline-block text-xs text-muted-foreground"
      >
        ← {projectName}
      </Link>
      <PageHeader
        title={`${t("pi")} / ${t("session")}`}
        description={projectName}
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
      <section className="my-7 rounded-lg bg-muted px-[22px] py-5">
        <h2 className="text-sm font-medium">{t("capabilities")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("capabilitiesDetail")}</p>
      </section>
      {session.prompt ? (
        <div className="max-w-[700px] py-[18px]">
          <span className={studioLabelClass}>{t("goal")}</span>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">
            {session.prompt}
          </p>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div>{session.status !== "idle" ? <RunTimeline session={session} /> : null}</div>
        <aside
          className="h-fit rounded-xl border border-border bg-card p-4"
          aria-label={t("agentRoles")}
        >
          <h2 className="text-sm font-semibold">{t("agentRoles")}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {["rolePm", "roleDev", "roleQa", "roleDesigner"].map((role, i) => (
              <div
                key={role}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
              >
                <span
                  className={`size-2 rounded-full ${["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-fuchsia-500"][i]}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-xs">{t(role as never)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t(
                    session.status === "running" && i < session.steps.length
                      ? "completed"
                      : "ready",
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            {t("device")}: <span className="text-foreground">{t("localPreview")}</span>
          </div>
        </aside>
      </div>
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("runDetails")}</h2>
          <span className="text-xs text-muted-foreground">{t(session.status)}</span>
        </div>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            {t("device")}
            <p className="mt-1 text-foreground">{t("localPreview")}</p>
          </div>
          <div>
            {t("outputs")}
            <p className="mt-1 text-foreground">
              {task ? displayTaskTitle(task, t) : t("noOutputs")}
            </p>
          </div>
        </div>
      </section>
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
        <div className="flex flex-wrap gap-2">
          <Button data-pi-stop onClick={() => controller.current?.abort()} variant="secondary">
            {t("stop")}
          </Button>
          {source.pauseSession ? (
            <Button
              variant="ghost"
              disabled={controlBusy}
              onClick={() => {
                setControlBusy(true);
                setControlError(false);
                void source
                  .pauseSession?.(session.id)
                  .catch(() => setControlError(true))
                  .finally(() => setControlBusy(false));
              }}
            >
              {t("pause")}
            </Button>
          ) : null}
        </div>
      ) : task ? (
        <section className="rounded-lg border border-border bg-card p-[22px]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{t("runResult")}</h2>
            <StatusBadge label={t("completed")} tone="complete" />
          </div>
          <p className="my-4 text-sm leading-7 [overflow-wrap:anywhere]">
            {displayTaskTitle(task, t)}
          </p>
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
            onSubmit={() => {
              confirmInvoker.current =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;
              setConfirm(true);
            }}
            label={t("ask")}
            placeholder={t("placeholder")}
            submitLabel={t(session.status === "failed" ? "retry" : "run")}
            context={
              <span>
                {projectName} · {t("preview")}
              </span>
            }
          />
        </div>
      )}
      {source.updateSessionParameters ? (
        <section
          className="mt-6 rounded-xl border border-border bg-card p-4"
          aria-labelledby="pi-parameters-title"
        >
          <h2 id="pi-parameters-title" className="text-sm font-semibold">
            {t("parameters")}
          </h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted-foreground">
              {t("temperature")}
              <input
                aria-label={t("temperature")}
                className="mt-1 block h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
              />
            </label>
            <Button
              variant="secondary"
              disabled={
                controlBusy || session.status === "completed" || session.status === "cancelled"
              }
              onClick={() => {
                setControlBusy(true);
                setControlError(false);
                void source
                  .updateSessionParameters?.(session.id, { temperature: Number(temperature) })
                  .catch(() => setControlError(true))
                  .finally(() => setControlBusy(false));
              }}
            >
              {t("applyParameters")}
            </Button>
            {source.resumeSession && session.status === "idle" ? (
              <Button
                variant="ghost"
                disabled={controlBusy}
                onClick={() => {
                  setControlBusy(true);
                  setControlError(false);
                  void source
                    .resumeSession?.(session.id)
                    .catch(() => setControlError(true))
                    .finally(() => setControlBusy(false));
                }}
              >
                {t("resume")}
              </Button>
            ) : null}
          </div>
          {controlError ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {t("controlUnavailable")}
            </p>
          ) : null}
        </section>
      ) : null}
      <p className="mt-5 text-xs leading-6 text-muted-foreground">{t("previewNote")}</p>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t("confirm")}</DialogTitle>
          <DialogDescription>{t("confirmDetail")}</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeConfirm}>
              {t("cancel")}
            </Button>
            <Button variant="primary" onClick={start}>
              {t("confirmRun")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProjectStudioShell>
  );
}
