import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export interface TextareaProps extends ComponentProps<"textarea"> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, disabled, ...props },
  ref,
) {
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-xl bg-surface-2 p-3 text-sm text-text placeholder:text-muted hairline transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none",
          focusRing,
          error && "border-danger focus-visible:outline-danger",
          className,
        )}
        {...props}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
