import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export type IconButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<IconButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg font-semibold hover:brightness-110 active:brightness-95 shadow-[0_0_0_1px_var(--border-strong),0_8px_24px_-8px_var(--accent)]",
  secondary: "bg-surface-2 text-text hairline hover:bg-[color-mix(in_oklab,var(--surface-2),var(--text)_6%)]",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  outline: "text-text shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_var(--text)]",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

const SIZE: Record<IconButtonSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

export interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  /** Accessible label is required for all icon-only buttons (WCAG 4.1.2) */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

export function IconButton({
  "aria-label": ariaLabel,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "grid shrink-0 select-none place-items-center rounded-full transition-[background-color,box-shadow,color,filter,transform] duration-200 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-45",
        focusRing,
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : children}
    </button>
  );
}
