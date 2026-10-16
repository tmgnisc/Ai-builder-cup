import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastProps {
  tone?: ToastTone;
  title: string;
  description?: string;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

const ICONS = {
  info: <Info className="size-5 text-searching" />,
  success: <CheckCircle2 className="size-5 text-success" />,
  warning: <AlertCircle className="size-5 text-thinking" />,
  danger: <AlertCircle className="size-5 text-danger" />,
};

export function Toast({
  tone = "info",
  title,
  description,
  onDismiss,
  action,
  className,
}: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "panel-solid flex max-w-sm items-start gap-3 rounded-card p-4 shadow-xl transition-all duration-300 ease-[var(--ease-out-expo)]",
        className,
      )}
    >
      <div className="mt-0.5 shrink-0">{ICONS[tone]}</div>
      <div className="min-w-0 flex-1">
        <h4 className="font-display text-sm font-semibold text-text">{title}</h4>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Dismiss toast"
          onClick={onDismiss}
          className="-mr-1 -mt-1 size-6"
        >
          <X className="size-3.5" />
        </IconButton>
      )}
    </div>
  );
}
