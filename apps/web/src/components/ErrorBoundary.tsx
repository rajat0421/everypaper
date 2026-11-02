import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render-time errors so a backend/runtime hiccup never produces a blank white crashed screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Everypaper crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-paper text-ink">
            <p className="text-sm text-ink/70">Something went wrong. Try reloading.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-ink px-4 py-1.5 text-sm text-paper"
            >
              Reload
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
