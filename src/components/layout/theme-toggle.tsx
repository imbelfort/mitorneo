"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const THEME_KEY = "mitorneo-theme";

type Props = {
  className?: string;
};

export default function ThemeToggle({ className }: Props) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const initial: ThemeMode =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    localStorage.setItem(THEME_KEY, initial);
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${initial}`);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${next}`);
  };

  const isDark = theme === "dark";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        className="relative flex h-8 w-14 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 transition"
      >
        <span
          className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-[var(--accent-foreground)] transition ${
            isDark ? "translate-x-6" : "translate-x-0"
          }`}
        >
        </span>
      </button>
    </div>
  );
}
