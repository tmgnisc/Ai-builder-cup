"use client";

import { Button as HeroUIButton } from "@heroui/react";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonClasses";

export * from "./buttonClasses";

export interface ButtonProps extends Omit<ComponentProps<typeof HeroUIButton>, "variant" | "size" | "className" | "children"> {
  children?: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  isIconOnly?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  iconLeft,
  iconRight,
  children,
  className,
  type = "button",
  isIconOnly,
  ...props
}: ButtonProps) {
  return (
    <HeroUIButton
      type={type}
      isDisabled={disabled || loading}
      aria-busy={loading}
      isIconOnly={isIconOnly}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : iconLeft}
      {children}
      {!loading && iconRight}
    </HeroUIButton>
  );
}
