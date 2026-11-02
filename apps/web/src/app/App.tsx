import { useEffect } from "react";
import { useSession } from "../hooks/useSession";
import { useConnectionStore } from "../stores/connectionStore";
import { CanvasStage } from "../components/CanvasStage";
import { ErrorBoundary } from "../components/ErrorBoundary";

function Skeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-accent" />
        <p className="text-sm text-ink/50">Opening the canvas…</p>
      </div>
    </div>
  );
}

export function App() {
  const { data: session, isError, isLoading } = useSession();
  const setSessionError = useConnectionStore((s) => s.setSessionError);

  useEffect(() => {
    setSessionError(isError);
  }, [isError, setSessionError]);

  // Even if identity couldn't be established yet, still render the canvas
  // shell once loading settles - drawing attempts will simply fail quietly
  // until the backend is reachable, rather than blocking the whole app.
  if (isLoading) {
    return <Skeleton />;
  }

  const sessionId = session?.sessionId ?? "anonymous-offline";

  return (
    <ErrorBoundary>
      <CanvasStage sessionId={sessionId} />
    </ErrorBoundary>
  );
}
