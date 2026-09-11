import { UsersThree, ShareNetwork, FileText, UserMinus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { createApiClient, type ApiClient } from "@voidmix/client";
import { useTranslations } from "../../i18n/client";
import { ProjectStudioShell } from "../projects/components/studio-shell";
import { useProjectStudioData } from "../projects/studio-data";
import { displayProjectName } from "../projects/preview-copy";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { Button } from "@voidmix/ui/components/ui/button";
export function CollaborationPage() {
  const t = useTranslations("workspaceUi");
  const { snapshot } = useProjectStudioData();
  const [projectId, setProjectId] = useState(snapshot.projects[0]?.id ?? "");
  const [detail, setDetail] = useState<Awaited<ReturnType<ApiClient["projects"]["get"]>> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);
  const loadDetail = () => {
    if (!projectId) return;
    setLoading(true);
    void createApiClient()
      .projects.get({ projectId })
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    void createApiClient()
      .projects.get({ projectId })
      .then((v) => active && setDetail(v))
      .catch(() => active && setDetail(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId]);
  const assets = detail?.assetReferences ?? [];
  return (
    <ProjectStudioShell current="collaboration" title={t("collaborationTitle")}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">{t("collaborationTitle")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t("collaborationDescription")}
          </p>
        </div>
        <select
          aria-label={t("chooseProject")}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {snapshot.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {displayProjectName(p, t)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h2 className="text-lg font-medium">{t("sharedResults")}</h2>
          </div>
          {assets.length ? (
            <div className="grid gap-3">
              {assets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <span className="truncate text-sm">{a.label ?? a.assetId}</span>
                  <Button variant="outline" size="sm" disabled title={t("shareUnavailable")}>
                    {t("shareResult")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noSharedResults")}</p>
          )}
          <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            {t("shareUnavailable")}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-4 flex items-center gap-2">
            <UsersThree className="size-5 text-primary" />
            <h2 className="text-lg font-medium">{t("projectMembers")}</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : detail?.members?.length ? (
            <div className="grid gap-3">
              {detail.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.userId}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                      value={m.role}
                      disabled={mutating === m.userId || m.status !== "active"}
                      aria-label={`${m.userId} ${t("memberRole")}`}
                      onChange={(event) => {
                        const role = event.target.value as
                          | "owner"
                          | "editor"
                          | "commenter"
                          | "viewer";
                        setMutating(m.userId);
                        void createApiClient()
                          .projects.members.update({ projectId, userId: m.userId, role })
                          .then(loadDetail)
                          .finally(() => setMutating(null));
                      }}
                    >
                      {(["owner", "editor", "commenter", "viewer"] as const).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <Badge variant="secondary">{m.status}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("removeMember", { user: m.userId })}
                      disabled={mutating === m.userId || m.role === "owner"}
                      onClick={() => {
                        setMutating(m.userId);
                        void createApiClient()
                          .projects.members.remove({ projectId, userId: m.userId })
                          .then(loadDetail)
                          .finally(() => setMutating(null));
                      }}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noProjectMembers")}</p>
          )}
          <Button className="mt-4" variant="outline" disabled>
            <ShareNetwork className="mr-2 size-4" />
            {t("inviteMemberUnavailable")}
          </Button>
        </section>
      </div>
    </ProjectStudioShell>
  );
}
