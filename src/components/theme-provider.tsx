"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolved: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolved: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return "dark";
  return "light";
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved: theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
