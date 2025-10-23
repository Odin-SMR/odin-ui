// src/theme/ColorModeContext.tsx
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
} from "@mui/material";
import { useMemo, useState } from "react";
import { ColorModeContext } from "./contexts/ColorModeContext";

const lightThemeOptions = {
  palette: {
    mode: "light",
  },
} as const;

const darkThemeOptions = {
  palette: {
    mode: "dark",
  },
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
