import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPreviewAdapter, type WorkspaceDataSource } from "./preview-adapter";

const preview = createPreviewAdapter();
const WorkspaceContext = createContext<WorkspaceDataSource>(preview);

export function WorkspaceDataProvider({
  source,
  children,
}: {
  source: WorkspaceDataSource;
  children: ReactNode;
}) {
  return <WorkspaceContext value={source}>{children}</WorkspaceContext>;
}

export function useWorkspaceData() {
  const source = useContext(WorkspaceContext);
  const initial = useRef(source.getSnapshot());
  const snapshot = useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    () => initial.current,
  );
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState("loading");
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
  return { source, snapshot, state, retry: () => setAttempt((value) => value + 1) };
}
