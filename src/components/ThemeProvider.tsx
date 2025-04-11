
import { ThemeProvider as NextThemeProvider } from "next-themes";
import React from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark", // Set default to dark
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      forcedTheme="dark" // Force dark mode
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
}
