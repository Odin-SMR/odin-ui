import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar, Box, Button, CircularProgress, Divider, Drawer, IconButton,
  List, ListItemButton, ListItemText, ListSubheader, Toolbar, Tooltip, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { lazy, Suspense, useContext, useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Documents } from "./components/Documents";
import Footer from "./components/Footer";
import { Home } from "./components/Home";
import { News } from "./components/News";
import { NotFound } from "./components/NotFound";
import { ColorModeContext } from "./contexts/ColorModeContext";
import { DataAccess } from "./DataAccess";

const CalendarView = lazy(() => import("./components/L1Calendar"));
const L2Calendar = lazy(() => import("./components/L2Calendar").then((module) => ({ default: module.L2Calendar })));
const Level1 = lazy(() => import("./components/Level1").then((module) => ({ default: module.Level1 })));
const MigrationPilot = lazy(() => import("./components/MigrationPilot"));
const MigrationArchive = lazy(() => import("./components/MigrationArchive"));
const ParquetDocumentation = lazy(() => import("./components/ParquetDocumentation"));
const Instrument = lazy(() => import("./components/Instrument"));
const Explore = lazy(() => import("./components/Explore"));
const L2Quickstart = lazy(() => import("./components/L2Quickstart"));
const ParquetFiles = lazy(() => import("./components/ParquetFiles"));
const OdinMcp = lazy(() => import("./components/OdinMcp"));
const DataApi = lazy(() => import("./components/DataApi").then((module) => ({ default: module.DataApi })));

const navigation = [
  { label: "Mission", to: "/" },
  { label: "Instrument", to: "/instrument" },
  { label: "Use data", to: "/data_access" },
  { label: "Explore", to: "/explore" },
];
const shortcuts = [
  { label: "Level 2 calendar", to: "/level2/calendar" },
  { label: "Level 1 calendar", to: "/level1/calendar" },
  { label: "Parquet files", to: "/data_access/files" },
];
const pageTitles = [
  ["/data_access/quickstart", "Level 2 quickstart"],
  ["/data_access/files", "Find Parquet files"],
  ["/data_access/api", "API access"],
  ["/data_access/odin-mcp", "Odin MCP guide"],
  ["/data_access/parquet-guide", "Parquet analysis guide"],
  ["/data_access/parquet-schema", "Parquet schemas"],
  ["/level1/statistics", "Measurement statistics"],
  ["/level1/calendar", "Level 1 observations"],
  ["/level2/calendar", "Level 2 retrievals"],
  ["/migration-pilot", "S3 migration pilot"],
  ["/migration", "S3 archive migration"],
  ["/news", "Mission updates"],
  ["/documentation", "Documentation"],
  ...navigation.map(({ to, label }) => [to, label]),
];
const matches = (pathname: string, path: string) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
const activeSection = (pathname: string, to: string) => matches(pathname, to) || (to === "/explore" && /^\/level[12]\//.test(pathname));

function RouteEffects() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    document.title = `${pageTitles.find(([path]) => matches(pathname, path))?.[1] ?? "Page not found"} · Odin-SMR`;
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      window.scrollTo({ top: 0 });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }
    if (!hash) return;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const scroll = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ block: "start" });
      return true;
    };
    if (scroll()) return;
    // Lazy routes may mount after the location effect; honor their fragment once ready.
    const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
    observer.observe(document.getElementById("main-content")!, { childList: true, subtree: true });
    const timer = window.setTimeout(() => observer.disconnect(), 10000);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [pathname, hash]);
  return null;
}

function SiteLayout() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const themeLabel = `Switch to ${theme.palette.mode === "dark" ? "light" : "dark"} theme`;
  return <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}>
    <RouteEffects />
    <Box component="a" href="#main-content" sx={{ position: "absolute", left: 16, top: -100, zIndex: 1500, bgcolor: "background.paper", color: "text.primary", p: 1.5, borderRadius: 1, "&:focus": { top: 8 } }}>Skip to content</Box>
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ gap: { xs: .5, sm: 1 }, minHeight: 64, maxWidth: 1920, width: "100%", mx: "auto", px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 1, md: 0 } }}>
        <IconButton color="inherit" aria-label="Open navigation menu" aria-expanded={drawerOpen} aria-controls={drawerOpen ? "mobile-navigation" : undefined} onClick={() => setDrawerOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" }, ml: -1, flexShrink: 0 }}><MenuIcon /></IconButton>
        <Typography variant="h6" component={Link} to="/" aria-label="Odin-SMR home" sx={{ textDecoration: "none", color: "inherit", mr: "auto", minWidth: 0, fontWeight: 500 }}>Odin-SMR</Typography>
        <Box component="nav" aria-label="Main navigation" sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: .5 }}>
          {navigation.map(({ to, label }) => <Button key={to} color="inherit" component={Link} to={to} aria-current={activeSection(pathname, to) ? "page" : undefined} sx={{ textDecoration: activeSection(pathname, to) ? "underline" : undefined, textUnderlineOffset: 6 }}>{label}</Button>)}
        </Box>
        <Tooltip title={themeLabel}><IconButton onClick={colorMode.toggleColorMode} color="inherit" aria-label={themeLabel} sx={{ flexShrink: 0 }}>{theme.palette.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}</IconButton></Tooltip>
      </Toolbar>
    </AppBar>
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { sx: { width: 360, maxWidth: "100%" } } }}>
      <Box id="mobile-navigation" component="nav" aria-label="Mobile navigation">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}><Typography variant="h6">Explore Odin-SMR</Typography><IconButton aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton></Box>
        <Divider />
        <List onClick={() => setDrawerOpen(false)}>{navigation.map(({ to, label }) => <ListItemButton key={to} component={Link} to={to} selected={activeSection(pathname, to)} aria-current={activeSection(pathname, to) ? "page" : undefined}><ListItemText primary={label} /></ListItemButton>)}</List>
        <Divider />
        <List subheader={<ListSubheader component="div">Data shortcuts · no sign-in required</ListSubheader>} onClick={() => setDrawerOpen(false)}>{shortcuts.map(({ to, label }) => <ListItemButton key={to} component={Link} to={to}><ListItemText primary={label} /></ListItemButton>)}</List>
        <Divider />
        <List onClick={() => setDrawerOpen(false)}><ListItemButton component={Link} to="/documentation"><ListItemText primary="Documents" /></ListItemButton><ListItemButton component={Link} to="/news"><ListItemText primary="News" /></ListItemButton></List>
      </Box>
    </Drawer>
    <Box component="main" id="main-content" tabIndex={-1} sx={{ flexGrow: 1, width: "100%", maxWidth: 1920, mx: "auto", outline: "none" }}>
      <Suspense fallback={<Box role="status" sx={{ p: 4, display: "flex", alignItems: "center", gap: 2 }}><CircularProgress size={24} aria-hidden="true" /><Typography>Loading page…</Typography></Box>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/instrument" element={<Instrument />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/news" element={<News />} />
          <Route path="/documentation" element={<Documents />} />
          <Route path="/level1/statistics" element={<Level1 />} />
          <Route path="/level1/statistics/:year" element={<Level1 />} />
          <Route path="/level1/calendar" element={<CalendarView />} />
          <Route path="/level2/calendar" element={<L2Calendar />} />
          <Route path="/level2/calendar/:year/:month" element={<L2Calendar />} />
          <Route path="/level2/calendar/:year/:month/:day/:fm" element={<L2Calendar />} />
          <Route path="/data_access" element={<DataAccess />} />
          <Route path="/data_access/quickstart" element={<L2Quickstart />} />
          <Route path="/data_access/files" element={<ParquetFiles />} />
          <Route path="/data_access/api" element={<DataApi />} />
          <Route path="/data_access/odin-mcp" element={<OdinMcp />} />
          <Route path="/data_access/parquet-guide" element={<ParquetDocumentation page="guide" />} />
          <Route path="/data_access/parquet-schema" element={<ParquetDocumentation page="schema" />} />
          <Route path="/migration-pilot" element={<MigrationPilot />} />
          <Route path="/migration" element={<MigrationArchive />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Box>
    <Footer />
  </Box>;
}

export default function App() {
  return <BrowserRouter><SiteLayout /></BrowserRouter>;
}
