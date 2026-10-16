import { cn } from "@/lib/cn";

/**
 * Shared visible focus ring style conforming to WCAG 2.2 AA.
 * Used across all interactive primitives (Button, IconButton, Input, Drawer close, etc.)
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-accent-text focus-visible:outline-offset-2 focus-visible:rounded-sm";

export function withFocusRing(className?: string): string {
  return cn(focusRing, className);
}
