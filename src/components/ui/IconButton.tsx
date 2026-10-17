"use client";

import { Button as HeroUIButton } from "@heroui/react";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./buttonClasses";

export type IconButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

const SIZE: Record<IconButtonSize, string> = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-lg",
  lg: "size-12 rounded-lg",
};

export interface IconButtonProps extends Omit<ComponentProps<typeof HeroUIButton>, "aria-label" | "variant" | "size" | "className" | "children"> {
  /** Accessible label is required for all icon-only buttons (WCAG 4.1.2) */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Icon-only HeroUI button. Shares variants with `Button`; the label doubles as the native tooltip. */
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
    <HeroUIButton
      type={type}
      isIconOnly
      // Neutral HeroUI variant: our token classes own the visuals (see Button).
      variant="ghost"
      aria-label={ariaLabel}
      isDisabled={disabled || loading}
      aria-busy={loading}
      className={buttonClasses({ variant, size: "icon", className: cn("grid place-items-center", SIZE[size], className) })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : children}
    </HeroUIButton>
  );
}
