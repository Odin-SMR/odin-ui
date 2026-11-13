import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
} from "@mui/material";
import { useMemo, useState } from "react";
import { ColorModeContext } from "./contexts/ColorModeContext";

type Mode = "light" | "dark";

function initialMode(): Mode {
  try {
    return localStorage.getItem("themeMode") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((previous) => {
          const next = previous === "light" ? "dark" : "light";
          try {
            localStorage.setItem("themeMode", next);
          } catch {
            // Theme switching also works when browser storage is unavailable.
          }
          return next;
        });
      },
    }),
    [],
  );

  const theme = useMemo(
    () => createTheme({
      palette: {
        mode,
        primary: { main: mode === "dark" ? "#90caf9" : "#1976d2" },
        background: {
          default: mode === "dark" ? "#121212" : "#ffffff",
          paper: mode === "dark" ? "#121212" : "#ffffff",
        },
        text: {
          primary: mode === "dark" ? "#ffffff" : "#212121",
          secondary: mode === "dark" ? "#bdbdbd" : "#616161",
        },
        divider: mode === "dark" ? "#424242" : "#d7dce2",
        info: { main: mode === "dark" ? "#29b6f6" : "#0288d1" },
        warning: { main: mode === "dark" ? "#ffa726" : "#ed6c02" },
        error: { main: mode === "dark" ? "#f44336" : "#d32f2f" },
        success: { main: mode === "dark" ? "#66bb6a" : "#2e7d32" },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: "1.875rem", fontWeight: 500, lineHeight: 1.25 },
        h2: { fontSize: "1.875rem", fontWeight: 500, lineHeight: 1.25 },
        h3: { fontSize: "1.875rem", fontWeight: 500, lineHeight: 1.25 },
        h4: { fontSize: "1.5rem", fontWeight: 500, lineHeight: 1.35 },
        h5: { fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.4 },
        h6: { fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.4 },
        body1: { fontSize: "1rem", lineHeight: 1.65 },
        body2: { fontSize: ".875rem", lineHeight: 1.6 },
        caption: { fontSize: ".75rem", lineHeight: 1.5 },
        button: { fontSize: ".875rem", textTransform: "none", fontWeight: 500 },
        overline: { fontSize: ".75rem", lineHeight: 1.5, fontWeight: 500, letterSpacing: ".06em" },
      },
      shape: { borderRadius: 4 },
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: {
              "& a:focus-visible, & button:focus-visible, & .Mui-focusVisible": {
                outline: "2px solid currentColor",
                outlineOffset: 3,
              },
            },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: { root: { minHeight: 44, borderRadius: 4, paddingInline: 16 } },
        },
        MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
        MuiMenuItem: { styleOverrides: { root: { minHeight: 44, whiteSpace: "normal" } } },
        MuiListItemButton: { styleOverrides: { root: { minHeight: 44 } } },
        MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { borderRadius: 8 } } },
        MuiPaper: { styleOverrides: { root: { "&.MuiPaper-outlined": { borderRadius: 8 } } } },
        MuiOutlinedInput: { styleOverrides: { root: { minHeight: 44 } } },
        MuiContainer: {
          styleOverrides: {
            root: ({ theme: currentTheme }) => ({
              minWidth: 0,
              [currentTheme.breakpoints.up("xl")]: { paddingInline: 32 },
            }),
          },
        },
        MuiLink: { defaultProps: { underline: "hover" } },
      },
    }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={(currentTheme) => ({
          html: { scrollPaddingTop: 24 },
          body: { overflowWrap: "anywhere" },
          "#root": { minHeight: "100vh", minWidth: 0 },
          "main": { minWidth: 0 },
          "a:focus-visible, button:focus-visible, [tabindex]:focus-visible, input:focus-visible, select:focus-visible": {
            outline: `2px solid ${currentTheme.palette.primary.main}`,
            outlineOffset: 3,
          },
          "a, button, input, select, textarea": { WebkitTapHighlightColor: "transparent" },
          "pre": { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
          ".fc-col-header-cell": { background: currentTheme.palette.background.paper },
          ".fc-event": { cursor: "pointer", borderRadius: 4 },
          ".fc .fc-button": { minHeight: 44 },
          ".fc .fc-toolbar": { flexWrap: "wrap", gap: 12 },
          ".fc .fc-toolbar-title": { fontSize: "1.25rem" },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": { scrollBehavior: "auto", transitionDuration: "0s !important", animationDuration: "0s !important" },
          },
        })} />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
