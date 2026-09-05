import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown instead of the default fallback — useful for section-level boundaries */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors anywhere in the subtree.
 * Never exposes raw error messages to the user — logs to console for devs.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // ponytail: console.error only — add Sentry/LogRocket when monitoring matters
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle
              aria-hidden="true"
              className="size-8 text-destructive"
            />
            <div>
              <p className="font-medium text-foreground text-sm">
                Something went wrong
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                An unexpected error occurred. Please try again.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
              onClick={this.reset}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
