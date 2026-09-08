/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ReactNode } from "react";
import messages from "../../../messages/en.json";
import { createProjectStudioPreviewAdapter, type ProjectStudioDataSource } from "./preview-adapter";
import { AssetUploadForm } from "./components/asset-upload-form";
import { LibraryPage } from "./components/library-page";

let currentSource: ProjectStudioDataSource;
vi.mock("./studio-data", () => ({
  useProjectStudioData: () => ({ source: currentSource, snapshot: currentSource.getSnapshot() }),
}));
vi.mock("./components/studio-shell", () => ({
  ProjectStudioShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@voidmix/i18n/client", () => ({
  useLocale: () => "en",
  useTranslations: (namespace: keyof typeof messages) => (key: string) =>
    (messages[namespace] as Record<string, string>)[key] ?? key,
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("asset interactions", () => {
  it("keeps a failed upload selected for retry and only confirms success after the operation resolves", async () => {
    const user = userEvent.setup();
    const source = createProjectStudioPreviewAdapter();
    source.uploadAsset = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ id: "ref-1" });
    render(<AssetUploadForm source={source} projectId="northstar" />);
    const input = screen.getByLabelText("Upload file") as HTMLInputElement;
    const file = new File(["working draft"], "brief.txt", { type: "text/plain" });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    expect(input.files?.[0]).toBe(file);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent(messages.workspaceUi.saved);
    expect(input.value).toBe("");
    expect(source.uploadAsset).toHaveBeenCalledTimes(2);
  });

  it("displays versions from live Library search and clears stale matches after a new search", async () => {
    const user = userEvent.setup();
    currentSource = createProjectStudioPreviewAdapter();
    const date = new Date("2026-09-09T00:00:00Z");
    currentSource.searchLibrary = vi
      .fn()
      .mockResolvedValueOnce({
        assets: [
          {
            id: "asset-1",
            workspaceId: "workspace-1",
            path: "remote-cut.png",
            status: "active",
            headVersionId: "v1",
            createdAt: date,
            updatedAt: date,
          },
        ],
        versions: [
          {
            id: "v1",
            assetId: "asset-1",
            workspaceId: "workspace-1",
            byteSize: 200,
            contentType: "image/png",
            blobHash: "a".repeat(64),
            createdBy: "user-1",
            createdAt: date,
          },
        ],
        projects: [],
        nextCursor: null,
      })
      .mockResolvedValue({ assets: [], versions: [], projects: [], nextCursor: null });
    render(<LibraryPage />);
    expect(await screen.findByRole("heading", { name: "remote-cut.png" })).toBeVisible();
    expect(screen.getByText("image/png")).toBeVisible();
    expect(screen.getByText("Version history")).toBeVisible();
    await user.type(
      screen.getByRole("searchbox", { name: messages.workspaceUi.librarySearch }),
      "missing",
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "remote-cut.png" })).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole("heading", { name: "No library items found" })).toBeVisible();
    expect(currentSource.searchLibrary).toHaveBeenLastCalledWith("missing");
  });
});
