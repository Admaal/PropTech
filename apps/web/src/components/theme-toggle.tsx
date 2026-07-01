"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function resolveTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme, persist = false) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (persist) {
    localStorage.setItem("theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = resolveTheme();
    applyTheme(initial);
    setTheme(initial);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (localStorage.getItem("theme")) return;
      const next = mq.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        className="h-9 w-9 rounded-lg border border-border bg-card"
      />
    );
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next, true);
        setTheme(next);
      }}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-sm transition-colors hover:bg-muted"
      aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
