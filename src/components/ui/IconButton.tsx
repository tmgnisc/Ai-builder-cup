"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export type IconButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<IconButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg font-semibold hover:brightness-110 active:brightness-95 shadow-[0_0_0_1px_var(--border-strong)]",
  secondary: "bg-surface-2 text-text hairline hover:bg-[color-mix(in_oklab,var(--surface-2),var(--text)_6%)]",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  outline: "text-text border border-border hover:border-text/50 bg-transparent",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

const SIZE: Record<IconButtonSize, string> = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-lg",
  lg: "size-12 rounded-lg",
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
      data-slot="button"
      data-rac=""
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "grid shrink-0 select-none place-items-center transition-[background-color,box-shadow,color,filter,transform] duration-200 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-45",
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

