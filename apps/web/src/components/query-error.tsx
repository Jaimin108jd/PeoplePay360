import { AlertTriangle } from "lucide-react";

interface Props {
  /** Short description of what failed — e.g. "employees" */
  resource?: string;
}

/**
 * Inline error state for failed Convex queries.
 * Shows a friendly message; never leaks the raw error string.
 */
export function QueryError({ resource }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm">
      <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
      <span>
        Failed to load{resource ? ` ${resource}` : " data"}.{" "}
        <span className="text-muted-foreground">
          Check your connection and refresh.
        </span>
      </span>
    </div>
  );
}
