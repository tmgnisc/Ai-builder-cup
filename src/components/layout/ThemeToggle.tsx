"use client";

import { Moon, Sun } from "lucide-react";
import { usePrefs } from "@/store/usePrefs";
import { Tooltip } from "@/components/ui/Tooltip";

export function ThemeToggle() {
  const theme = usePrefs((s) => s.theme);
  const toggle = usePrefs((s) => s.toggleTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Tooltip content={`Switch to ${next} theme`} side="bottom">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${next} theme`}
        className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </button>
    </Tooltip>
  );
}
