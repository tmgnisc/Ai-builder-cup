"use client";

import { Moon, Sun } from "lucide-react";
import { usePrefs } from "@/store/usePrefs";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";

export function ThemeToggle() {
  const theme = usePrefs((s) => s.theme);
  const toggle = usePrefs((s) => s.toggleTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Tooltip content={`Switch to ${next} theme`} side="bottom">
      <IconButton onClick={toggle} aria-label={`Switch to ${next} theme`} className="rounded-full">
        {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </IconButton>
    </Tooltip>
  );
}
