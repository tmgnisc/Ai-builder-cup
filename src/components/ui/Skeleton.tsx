"use client";

import { Skeleton as HeroUISkeleton } from "@heroui/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends ComponentProps<"div"> {
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({
  variant = "rectangular",
  className,
  ...props
}: SkeletonProps) {
  return (
    <HeroUISkeleton
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-surface-2 motion-reduce:animate-none",
        variant === "text" && "h-4 rounded-md",
        variant === "rectangular" && "rounded-card",
        variant === "circular" && "rounded-full",
        className,
      )}
      {...props}
    />
  );
}

