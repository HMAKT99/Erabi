"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "erabi.theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light") setTheme("light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("light", next === "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="rounded border border-terminal-border px-2 py-1 text-xs text-terminal-dim hover:border-terminal-green hover:text-terminal-green"
    >
      {theme === "dark" ? "☀ light" : "☾ dark"}
    </button>
  );
}
