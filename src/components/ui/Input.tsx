"use client";

import { Input as HeroUIInput } from "@heroui/react";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export interface InputProps extends Omit<ComponentProps<"input">, "size"> {
  error?: string;
  inputSize?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "h-8 px-2.5 text-xs rounded-lg",
  md: "h-10 px-3.5 text-sm rounded-lg",
  lg: "h-12 px-4 text-base rounded-lg",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, inputSize = "md", disabled, ...props },
  ref,
) {
  return (
    <div className="w-full">
      <HeroUIInput
        ref={ref}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full bg-surface-2 text-text placeholder:text-muted hairline transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none",
          focusRing,
          SIZE[inputSize],
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

