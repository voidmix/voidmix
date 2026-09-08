import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSession } from "../../lib/auth-client";
import { createProjectStudioRemoteAdapter } from "./remote-adapter";
import { createProjectStudioPreviewAdapter, type ProjectStudioDataSource } from "./preview-adapter";

const fallbackPreview = createProjectStudioPreviewAdapter();
const ProjectStudioContext = createContext<ProjectStudioDataSource>(fallbackPreview);

export function ProjectStudioDataProvider({
  source,
  children,
}: {
  source?: ProjectStudioDataSource;
  children: ReactNode;
}) {
  const session = useSession();
  const [preview] = useState(() => createProjectStudioPreviewAdapter());
  const [remote, setRemote] = useState<ProjectStudioDataSource | null>(null);
  const authenticatedUserId = session.data?.user?.id;

  useEffect(() => {
    if (source || !authenticatedUserId) {
      setRemote(null);
      return;
    }
    setRemote(createProjectStudioRemoteAdapter({}));
  }, [source, authenticatedUserId]);

  const activeSource = source ?? remote ?? preview;
  return <ProjectStudioContext value={activeSource}>{children}</ProjectStudioContext>;
}

export function useProjectStudioData() {
  const source = useContext(ProjectStudioContext);
  const initial = useRef(source.getSnapshot());
  const snapshot = useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    () => initial.current,
  );
  // The seed snapshot is rendered on the server. Keep it visible while the
  // client restores tab-local data so the first meaningful content can paint
  // without waiting for the hydration effect.
  const [state, setState] = useState<"loading" | "ready" | "error">("ready");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => source.hydrate())
      .then(
        () => {
          if (active) setState("ready");
        },
        () => {
          if (active) setState("error");
        },
      );
    return () => {
      active = false;
    };
  }, [source, attempt]);
  return {
    source,
    snapshot,
    state,
    retry: () => {
      setState("loading");
      setAttempt((value) => value + 1);
    },
  };
}
