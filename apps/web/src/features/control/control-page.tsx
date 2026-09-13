import { Clock, PaperPlaneTilt, PlugsConnected, Plus, Pause, Play } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ProjectStudioShell } from "../projects/components/studio-shell";
import { useTranslations } from "../../i18n/client";
import { createWebApiClient } from "../../lib/api-client";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { studioInputClass } from "../projects/studio-styles";
type ScheduledTaskDto = {
  id: string;
  status: "active" | "paused";
  executionStatus: "configured" | "unavailable";
  name: string;
  instruction: string;
  schedule: string;
};

export function ControlPage() {
  const t = useTranslations("workspaceUi");
  const [instruction, setInstruction] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "queued" | "unavailable">("idle");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ScheduledTaskDto[]>([]);
  const [taskName, setTaskName] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");
  const [taskSchedule, setTaskSchedule] = useState("@daily");
  const [taskState, setTaskState] = useState<"idle" | "loading" | "saving" | "unavailable">(
    "loading",
  );

  const loadTasks = async () => {
    try {
      const c = createWebApiClient();
      const snapshot = await c.studio.snapshot.get({});
      const id = snapshot.account.workspaceIds[0];
      setWorkspaceId(id ?? null);
      if (!id) {
        setTaskState("unavailable");
        return;
      }
      const result = await c.scheduled.tasks.list({ workspaceId: id, limit: 50 });
      setTasks(result.items);
      setTaskState("idle");
    } catch {
      setTaskState("unavailable");
    }
  };
  useEffect(() => {
    void loadTasks();
  }, []);

  const send = async () => {
    if (!instruction.trim()) return;
    setState("sending");
    try {
      const c = createWebApiClient();
      const id = workspaceId ?? (await c.studio.snapshot.get({})).account.workspaceIds[0];
      if (!id) {
        setState("unavailable");
        return;
      }
      await c.remote.commands.create({
        workspaceId: id,
        instruction: instruction.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      setState("queued");
      setInstruction("");
    } catch {
      setState("unavailable");
    }
  };

  const createTask = async () => {
    if (!workspaceId || !taskName.trim() || !taskInstruction.trim()) return;
    setTaskState("saving");
    try {
      const created = await createWebApiClient().scheduled.tasks.create({
        workspaceId,
        name: taskName.trim(),
        instruction: taskInstruction.trim(),
        schedule: taskSchedule,
      });
      setTasks((current) => [created, ...current]);
      setTaskName("");
      setTaskInstruction("");
      setTaskSchedule("@daily");
      setTaskState("idle");
    } catch {
      setTaskState("unavailable");
    }
  };

  const toggleTask = async (task: ScheduledTaskDto) => {
    setTaskState("saving");
    try {
      const updated = await createWebApiClient().scheduled.tasks.update({
        taskId: task.id,
        status: task.status === "active" ? "paused" : "active",
      });
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setTaskState("idle");
    } catch {
      setTaskState("unavailable");
    }
  };

  return (
    <ProjectStudioShell current="control" title={t("controlTitle")}>
      <PageHeader title={t("controlTitle")} description={t("controlDescription")} />
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <PaperPlaneTilt className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{t("remoteCommandTitle")}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("remoteCommandDescription")}</p>
          <textarea
            className={`${studioInputClass} mt-5 min-h-32 w-full resize-y`}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={t("remoteCommandPlaceholder")}
            aria-label={t("remoteCommandPlaceholder")}
          />
          <Button
            className="mt-4"
            variant="primary"
            disabled={!instruction.trim() || state === "sending"}
            onClick={send}
          >
            {state === "sending" ? t("remoteSending") : t("sendCommand")}
          </Button>
          {state === "queued" && (
            <p className="mt-3 text-sm text-emerald-600">{t("remoteQueued")}</p>
          )}
          {state === "unavailable" && (
            <p className="mt-3 text-sm text-amber-600">{t("remoteUnavailable")}</p>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <PlugsConnected className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{t("deviceStatusTitle")}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("deviceStatusDescription")}</p>
          <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("deviceStatusUnavailable")}
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Clock className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{t("scheduledTasksTitle")}</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("scheduledTasksDescription")}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1.4fr_180px_auto]">
          <input
            className={studioInputClass}
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder={t("scheduledTaskName")}
            aria-label={t("scheduledTaskName")}
          />
          <input
            className={studioInputClass}
            value={taskInstruction}
            onChange={(e) => setTaskInstruction(e.target.value)}
            placeholder={t("scheduledTaskInstruction")}
            aria-label={t("scheduledTaskInstruction")}
          />
          <input
            className={studioInputClass}
            value={taskSchedule}
            onChange={(e) => setTaskSchedule(e.target.value)}
            placeholder={t("scheduledTaskSchedule")}
            aria-label={t("scheduledTaskSchedule")}
          />
          <Button
            variant="primary"
            onClick={createTask}
            disabled={
              taskState === "saving" || !workspaceId || !taskName.trim() || !taskInstruction.trim()
            }
          >
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {t("scheduledTaskCreate")}
          </Button>
        </div>
        {!workspaceId || taskState === "unavailable" ? (
          <p className="mt-4 text-sm text-amber-600">{t("scheduledTasksUnavailable")}</p>
        ) : tasks.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("scheduledTasksEmpty")}</p>
        ) : (
          <ul
            className="mt-5 divide-y divide-border rounded-xl border border-border"
            aria-label={t("scheduledTasksTitle")}
          >
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{task.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.schedule} · {task.instruction}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.executionStatus === "unavailable"
                      ? t("scheduledExecutionUnavailable")
                      : t("scheduledExecutionConfigured")}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void toggleTask(task)}
                  disabled={taskState === "saving"}
                >
                  {task.status === "active" ? (
                    <>
                      <Pause className="mr-1 size-4" aria-hidden="true" />
                      {t("scheduledTaskPause")}
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 size-4" aria-hidden="true" />
                      {t("scheduledTaskResume")}
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ProjectStudioShell>
  );
}
