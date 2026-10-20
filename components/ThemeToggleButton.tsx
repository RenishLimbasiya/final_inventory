"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeToggleButton() {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";
  const label = mounted
    ? isDark ? "Switch to light mode" : "Switch to dark mode"
    : "Toggle color theme";

  return (
    <button
      type="button"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-white/20",
        "bg-white/10 px-3 py-2 text-sm font-medium text-foreground",
        "transition-all hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30",
      )}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{mounted ? isDark ? "Light" : "Dark" : "Theme"}</span>
    </button>
  );
}
