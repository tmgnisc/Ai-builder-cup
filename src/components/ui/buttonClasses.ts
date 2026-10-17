import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg font-semibold hover:brightness-110 active:brightness-95 shadow-[0_0_0_1px_var(--border-strong)]",
  secondary: "bg-surface-2 text-text hairline hover:bg-[color-mix(in_oklab,var(--surface-2),var(--text)_6%)]",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  outline: "text-text border border-border hover:border-text/50 bg-transparent",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
  subtle: "bg-surface text-muted hover:text-text hairline",
};

export const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2.5 rounded-lg",
  icon: "size-10 rounded-lg p-0",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap transition-[background-color,box-shadow,color,filter,transform] duration-200 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-45",
    focusRing,
    VARIANT[variant],
    SIZE[size],
    className,
  );
}
