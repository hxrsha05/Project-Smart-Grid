import { useTheme } from "@/contexts/ThemeContext";
import { Moon, SunMedium } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-card/95 p-1 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:scale-105"
    >
      <span
        className={`flex h-6 w-11 items-center rounded-full border border-border px-0.5 transition-colors duration-300 ${
          isDark ? "bg-[#3a3347]" : "bg-[#ebe6ef]"
        }`}
      >
        <span className="relative flex h-4.5 w-full items-center justify-between px-0.5">
          <SunMedium className="h-3 w-3 text-[#f8b400]" />
          <span
            className={`absolute left-0.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-[#121331] bg-[#f24c00] shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.18)] transition-transform duration-300 ${
              isDark ? "translate-x-5" : "translate-x-0"
            }`}
          >
            {isDark ? (
              <Moon className="h-2.5 w-2.5 text-[#121331]" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full border border-[#121331] bg-[#f8b400]" />
            )}
          </span>
          <Moon className="h-3 w-3 text-[#6b7280]" />
        </span>
      </span>
    </button>
  );
}
