import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  extra?: ReactNode;
}

export function ErrorState({
  title = "Unable to load catalog data",
  message,
  onRetry,
  className,
  extra,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-panel bg-danger/10 p-8 text-center text-danger hairline",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full bg-danger/15 text-danger mb-3">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="font-display text-base font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  );
}
