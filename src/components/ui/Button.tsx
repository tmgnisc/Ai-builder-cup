import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg font-semibold hover:brightness-110 active:brightness-95 shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_8px_24px_-8px_var(--accent)]",
  secondary: "bg-surface-2 text-text hairline hover:bg-[color-mix(in_oklab,var(--surface-2),var(--text)_6%)]",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  outline: "text-text shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_var(--text)]",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-full",
  md: "h-10 px-4 text-sm gap-2 rounded-full",
  lg: "h-12 px-6 text-base gap-2.5 rounded-full",
  icon: "size-10 rounded-full",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap transition-[background-color,box-shadow,color,filter,transform] duration-200 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-45",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
