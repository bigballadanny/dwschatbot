
import { ThemeProvider as NextThemeProvider } from "next-themes";
import React from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark", // Default is set to dark
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      forcedTheme="dark" // Adding forcedTheme to ensure dark mode is applied initially
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
}
