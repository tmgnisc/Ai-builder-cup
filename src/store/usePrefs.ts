"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "dark" | "light";

export const PREFS_STORAGE_KEY = "persona-prefs";

interface PrefsState {
  theme: Theme;
  voiceMuted: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setVoiceMuted: (muted: boolean) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      voiceMuted: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
      setVoiceMuted: (voiceMuted) => set({ voiceMuted }),
    }),
    {
      name: PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, voiceMuted }) => ({ theme, voiceMuted }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
