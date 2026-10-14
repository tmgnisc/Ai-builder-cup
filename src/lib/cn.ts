type ClassValue = string | false | null | undefined | 0;

/** Joins truthy class names. Keep conflicting Tailwind classes out of call sites; there's no merge step. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
