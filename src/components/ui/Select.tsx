"use client";

import { Select as HeroUISelect, ListBox } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export { HeroUISelect, ListBox };

export interface SelectProps extends ComponentProps<"select"> {
  error?: string;
  selectSize?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "h-8 pl-3 pr-8 text-xs rounded-lg",
  md: "h-10 pl-4 pr-10 text-sm rounded-lg",
  lg: "h-12 pl-5 pr-12 text-base rounded-lg",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, selectSize = "md", children, disabled, ...props },
  ref,
) {
  return (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full appearance-none bg-surface text-text hairline transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none",
          focusRing,
          SIZE[selectSize],
          error && "border-danger focus-visible:outline-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

