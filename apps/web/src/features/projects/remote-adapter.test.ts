import { describe, expect, it, vi } from "vite-plus/test";

import { createProjectStudioRemoteAdapter } from "./remote-adapter";

function apiStub() {
  const session = {
    id: "session-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    agentRunId: "run-1",
    requestedBy: "user-1",
    prompt: "Plan the launch",
    context: {},
    status: "queued",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    completedAt: null,
    run: {
      sessionId: "session-1",
      runId: "run-1",
      status: "queued",
      currentStepId: null,
      progress: null,
      error: null,
      startedAt: null,
      finishedAt: null,
    },
  };
  return {
    studio: {
      snapshot: {
        get: vi.fn().mockResolvedValue({
          account: {
            id: "user-1",
            email: "user@example.com",
            displayName: "User",
            workspaceIds: ["workspace-1"],
          },
          projects: [
            {
              id: "project-1",
              workspaceId: "workspace-1",
              ownerId: "user-1",
              title: "Launch film",
              description: "A film",
              cover: null,
              thumbnail: null,
              stage: "review",
              archived: false,
              archivedAt: null,
              stageWasDefaulted: false,
              progress: 1,
              deadline: null,
              lastActivityAt: new Date("2026-09-01T00:00:00Z"),
              createdAt: new Date("2026-09-01T00:00:00Z"),
              updatedAt: new Date("2026-09-01T00:00:00Z"),
            },
          ],
          reviewAttention: [],
          recentActivity: [],
          activeSessions: [],
          nextProjectsCursor: null,
        }),
      },
    },
    library: {
      search: vi
        .fn()
        .mockResolvedValue({ assets: [], versions: [], projects: [], nextCursor: null }),
    },
    pi: {
      sessions: {
        create: vi.fn().mockResolvedValue(session),
        cancel: vi.fn().mockResolvedValue({ ...session, status: "cancelled" }),
      },
    },
    projects: {
      get: vi.fn().mockResolvedValue({
        id: "project-1",
        workspaceId: "workspace-1",
        ownerId: "user-1",
        title: "Launch film",
        description: "A film",
        cover: null,
        thumbnail: null,
        stage: "review",
        archived: false,
        archivedAt: null,
        stageWasDefaulted: false,
        progress: 1,
        deadline: null,
        lastActivityAt: new Date("2026-09-01T00:00:00Z"),
        createdAt: new Date("2026-09-01T00:00:00Z"),
        updatedAt: new Date("2026-09-01T00:00:00Z"),
        brief: null,
        tasks: [
          {
            id: "task-1",
            projectId: "project-1",
            title: "Approve cut",
            status: "done",
            createdBy: "user-1",
            updatedAt: new Date("2026-09-01T00:00:00Z"),
          },
        ],
        members: [],
        assetReferences: [],
        reviews: [],
        sessions: [],
      }),
    },
  };
}

describe("createProjectStudioRemoteAdapter", () => {
  it("maps the canonical snapshot and project tasks", async () => {
    const client = apiStub();
    const source = createProjectStudioRemoteAdapter({
      client: client as never,
      workspaceId: "workspace-1",
    });

    await source.hydrate();

    expect(source.getSnapshot().projects[0]).toMatchObject({
      id: "project-1",
      name: "Launch film",
      status: "active",
    });
    expect(source.getSnapshot().tasks[0]).toMatchObject({
      id: "task-1",
      status: "done",
    });
  });

  it("surfaces hydrate failures without replacing the live state with preview data", async () => {
    const source = createProjectStudioRemoteAdapter({
      client: {
        studio: { snapshot: { get: vi.fn().mockRejectedValue(new Error("offline")) } },
      } as never,
      workspaceId: "workspace-1",
    });

    await expect(source.hydrate()).rejects.toThrow("offline");
    expect(source.getSnapshot().projects).toHaveLength(0);
    expect(source.getPersistenceWarning()).toBe(true);
  });

  it("persists a session only when the user starts it", async () => {
    const client = apiStub();
    const source = createProjectStudioRemoteAdapter({ client: client as never });
    const draft = source.createSession("project-1", "Plan the launch");

    await expect(source.startSession?.(draft)).resolves.toMatchObject({
      id: "session-1",
      prompt: "Plan the launch",
    });
    expect(client.pi.sessions.create).toHaveBeenCalledWith({
      projectId: "project-1",
      prompt: "Plan the launch",
      context: {},
      idempotencyKey: expect.any(String),
    });
  });
});

function assetApiStub() {
  const base = apiStub();
  const asset = {
    id: "asset-1",
    workspaceId: "workspace-1",
    path: "brief.txt",
    status: "active" as const,
    headVersionId: null as string | null,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-01"),
  };
  const version = {
    id: "version-1",
    assetId: asset.id,
    workspaceId: asset.workspaceId,
    blobHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    byteSize: 5,
    contentType: "text/plain",
    createdBy: "user-1",
    createdAt: new Date("2026-09-02"),
    parentVersionId: null,
    idempotencyKey: "test",
  };
  const committedAsset = { ...asset, headVersionId: version.id };
  const reference = {
    id: "ref-1",
    projectId: "project-1",
    assetId: asset.id,
    workspaceId: asset.workspaceId,
    versionId: null,
    label: null,
    createdAt: new Date(),
  };
  return {
    ...base,
    library: {
      ...base.library,
      versions: { list: vi.fn().mockResolvedValue({ items: [version], nextCursor: null }) },
    },
    projects: {
      ...base.projects,
      assets: {
        list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
        create: vi.fn().mockResolvedValue(reference),
      },
    },
    workspace: {
      assets: {
        create: vi.fn().mockResolvedValue(asset),
        get: vi.fn().mockResolvedValue(committedAsset),
        upload: {
          create: vi.fn().mockResolvedValue({ id: "upload-1" }),
          complete: vi.fn().mockResolvedValue({
            blobHash: version.blobHash,
            byteSize: 5,
            contentType: "text/plain",
          }),
        },
        commitVersion: vi.fn().mockResolvedValue({ asset: committedAsset, version }),
      },
    },
  };
}

describe("remote asset uploads", () => {
  it("verifies file contents and publishes a committed version with its project reference", async () => {
    const client = assetApiStub();
    const source = createProjectStudioRemoteAdapter({ client: client as never });
    await source.hydrate();
    await source.uploadAsset!(
      "project-1",
      new File(["hello"], "brief.txt", { type: "text/plain" }),
    );
    expect(client.workspace.assets.upload.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "aGVsbG8=",
        byteSize: 5,
        blobHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      }),
    );
    expect(client.workspace.assets.commitVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: "asset-1",
        expectedHeadVersionId: null,
        parentVersionId: null,
      }),
    );
    expect(source.getProjectAssets("project-1")).toMatchObject([
      { asset: { path: "brief.txt", headVersionId: "version-1" }, versions: [{ id: "version-1" }] },
    ]);
    expect(source.getProjectAssets("another-project")).toEqual([]);
  });

  it("retains the asset and retries failed content upload without recreating metadata", async () => {
    const client = assetApiStub();
    client.workspace.assets.upload.complete.mockRejectedValueOnce(new Error("offline"));
    const source = createProjectStudioRemoteAdapter({ client: client as never });
    await source.hydrate();
    const file = new File(["hello"], "brief.txt", { type: "text/plain" });
    await expect(source.uploadAsset!("project-1", file)).rejects.toThrow("offline");
    expect(client.workspace.assets.commitVersion).not.toHaveBeenCalled();
    expect(source.getProjectAssets("project-1")).toEqual([]);
    await source.uploadAsset!("project-1", file);
    expect(client.workspace.assets.create).toHaveBeenCalledTimes(1);
    expect(source.getSnapshot().versions).toHaveLength(1);
  });

  it("retries a failed reference after commit without uploading or committing again", async () => {
    const client = assetApiStub();
    client.projects.assets.create.mockRejectedValueOnce(new Error("offline"));
    const source = createProjectStudioRemoteAdapter({ client: client as never });
    await source.hydrate();
    const file = new File(["hello"], "brief.txt", { type: "text/plain" });
    await expect(source.uploadAsset!("project-1", file)).rejects.toThrow("offline");
    expect(source.getSnapshot().versions).toHaveLength(1);
    await source.uploadAsset!("project-1", file);
    expect(client.workspace.assets.commitVersion).toHaveBeenCalledTimes(1);
    expect(client.workspace.assets.upload.complete).toHaveBeenCalledTimes(1);
    expect(source.getProjectAssets("project-1")).toHaveLength(1);
  });

  it("rejects files outside the current RPC size limit before creating an asset", async () => {
    const client = assetApiStub();
    const source = createProjectStudioRemoteAdapter({ client: client as never });
    await source.hydrate();
    await expect(
      source.uploadAsset!("project-1", new File([new Uint8Array(512 * 1024 + 1)], "large.bin")),
    ).rejects.toThrow("512 KB");
    expect(client.workspace.assets.create).not.toHaveBeenCalled();
  });
});
