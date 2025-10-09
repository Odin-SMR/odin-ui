// src/theme/ColorModeContext.tsx
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
} from "@mui/material";
import { useMemo, useState } from "react";
import { ColorModeContext } from "./contexts/ColorModeContext";

export const lightThemeOptions = {
  palette: {
    mode: "light",
    // primary: { main: "#6750A4" },
    // secondary: { main: "#625B71" },
    // background: { default: "#ffb3ffff", paper: "#e1a8a8ff" },
  },
  // shape: { borderRadius: 12 },
  // typography: { fontFamily: "'Inter', system-ui, sans-serif" },
} as const;

export const darkThemeOptions = {
  palette: {
    mode: "dark",
    // primary: { main: "#CFBCFF" },
    // secondary: { main: "#CCC2DC" },
    // background: { default: "#121212", paper: "#1E1E1E" },
  },
  shape: { borderRadius: 12 },
  // typography: { fontFamily: "'Inter', system-ui, sans-serif" },
} as const;

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(
    () => (localStorage.getItem("themeMode") as "light" | "dark") || "light"
  );

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          localStorage.setItem("themeMode", next);
          return next;
        });
      },
    }),
    []
  );

  const theme = useMemo(
    () => createTheme(mode === "dark" ? darkThemeOptions : lightThemeOptions),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={(theme) => ({
            ".fc-col-header-cell": {
              background: theme.palette.background.paper,
            },
            "& .fc-event": {
              cursor: "pointer",
              borderRadius: 4,
              transition: "transform 120ms ease, box-shadow 120ms ease",
            },
            "& .fc-event:hover": {
              transform: "scale(1.03)",
              boxShadow: 6, // uses MUI shadow scale
            },
          })}
        />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
