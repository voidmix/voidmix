import { Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { useTranslations } from "../../i18n/client";
import { createWebApiClient } from "../../lib/api-client";

const api = createWebApiClient();
type ErrorKey = "loadFailed" | "taskFailed";
const LOAD_FAILED: ErrorKey = "loadFailed";
const TASK_FAILED: ErrorKey = "taskFailed";

export function ProjectPage({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.projects.get>> | null>(null);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof api.projects.tasks.list>>["items"]>(
    [],
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  useEffect(() => {
    void Promise.all([api.projects.get({ projectId }), api.projects.tasks.list({ projectId })])
      .then(([projectResponse, taskResponse]) => {
        setResult(projectResponse);
        setTasks(taskResponse.items);
      })
      .catch(() => setError(LOAD_FAILED));
  }, [projectId]);
  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const task = await api.projects.tasks.create({ projectId, title: taskTitle.trim() });
      setTasks((current) => [...current, task]);
      setTaskTitle("");
    } catch {
      setError(TASK_FAILED);
    }
  }
  if (error)
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm text-destructive">{t(error)}</p>
      </main>
    );
  if (!result)
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </main>
    );
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <Link className="text-sm text-muted-foreground hover:text-foreground" to="/projects">
        ← {t("title")}
      </Link>
      <header className="border-b pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{result.project.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.project.description ?? t("noDescription")}
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs">
            {result.project.stage.replace("_", " ")}
          </span>
        </div>
      </header>
      <section className="space-y-4" aria-labelledby="tasks-heading">
        <div className="flex items-center justify-between">
          <h2 id="tasks-heading" className="text-xl font-medium">
            {t("tasks")}
          </h2>
          <span className="text-sm text-muted-foreground">{tasks.length}</span>
        </div>
        <form className="flex gap-2" onSubmit={createTask}>
          <input
            className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder={t("taskPlaceholder")}
          />
          <button
            className="h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground"
            type="submit"
          >
            {t("addTask")}
          </button>
        </form>
        <ul className="divide-y rounded-lg border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between p-4 text-sm">
              <span>{task.title}</span>
              <span className="text-xs text-muted-foreground">{task.status.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
