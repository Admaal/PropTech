"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const themeListeners = new Set<() => void>();

function resolveTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function subscribeTheme(onStoreChange: () => void) {
  themeListeners.add(onStoreChange);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (localStorage.getItem("theme")) return;
    onStoreChange();
  };
  mq.addEventListener("change", onSystemChange);
  return () => {
    themeListeners.delete(onStoreChange);
    mq.removeEventListener("change", onSystemChange);
  };
}

function getThemeSnapshot(): Theme {
  return resolveTheme();
}

function setThemePreference(theme: Theme) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
  themeListeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => "light" as Theme,
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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
      onClick={() => setThemePreference(next)}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-sm transition-colors hover:bg-muted"
      aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
