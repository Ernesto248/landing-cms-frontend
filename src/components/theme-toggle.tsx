"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      aria-label={theme === "light" ? "Activar tema oscuro" : "Activar tema claro"}
      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--secondary-btn)]"
      type="button"
      onClick={toggleTheme}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
