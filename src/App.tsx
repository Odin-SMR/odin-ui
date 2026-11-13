import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar, Box, Button, CircularProgress, Divider, Drawer, IconButton,
  List, ListItemButton, ListItemText, ListSubheader, Menu, MenuItem, Toolbar,
  Tooltip, Typography,
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

const datasets = [
  { label: "Measurement statistics", to: "/level1/statistics", description: "Level 1 and Level 2 coverage" },
  { label: "Level 1 calendar", to: "/level1/calendar", description: "Calibrated spectra and scan locations" },
  { label: "Level 2 calendar", to: "/level2/calendar", description: "Retrieved atmospheric profiles" },
  { label: "S3 migration pilot", to: "/migration-pilot", description: "Bounded pilot observations" },
  { label: "S3 archive migration", to: "/migration", description: "Archive progress and validated lookup" },
  { label: "Data access", to: "/data_access", description: "Downloads, formats and product guidance" },
];

function RouteEffects() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const title = pathname === "/" ? "Atmospheric observations" :
      pathname === "/news" ? "Mission updates" :
      pathname === "/documentation" ? "Documentation" :
      datasets.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))?.label ?? "Page not found";
    document.title = `${title} · Odin-SMR`;
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      window.scrollTo({ top: 0 });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}

function SiteLayout() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { pathname } = useLocation();
  const [datasetAnchor, setDatasetAnchor] = useState<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const datasetActive = datasets.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const themeLabel = `Switch to ${theme.palette.mode === "dark" ? "light" : "dark"} theme`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}>
      <RouteEffects />
      <Box component="a" href="#main-content" sx={{
        position: "absolute", left: 16, top: -100, zIndex: 1500,
        bgcolor: "background.paper", color: "text.primary", p: 1.5, borderRadius: 1,
        "&:focus": { top: 8 },
      }}>Skip to content</Box>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: { xs: .5, sm: 1 }, minHeight: 64, maxWidth: 1920, width: "100%", mx: "auto", px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 1, md: 0 } }}>
          <IconButton color="inherit" aria-label="Open navigation menu" aria-expanded={drawerOpen} aria-controls={drawerOpen ? "mobile-navigation" : undefined}
            onClick={() => setDrawerOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" }, ml: -1, flexShrink: 0 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component={Link} to="/" aria-label="Odin-SMR home" sx={{ textDecoration: "none", color: "inherit", mr: "auto", minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere", fontWeight: 500 }}>
            Odin-SMR
          </Typography>
          <Box component="nav" aria-label="Main navigation" sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: .5 }}>
            <Button color="inherit" component={Link} to="/news" aria-current={pathname === "/news" ? "page" : undefined} sx={{ textDecoration: pathname === "/news" ? "underline" : undefined }}>
              News
            </Button>
            <Button color="inherit" component={Link} to="/documentation" aria-current={pathname === "/documentation" ? "page" : undefined} sx={{ textDecoration: pathname === "/documentation" ? "underline" : undefined }}>
              Documents
            </Button>
            <Button color="inherit" id="dataset-menu-button" aria-controls={datasetAnchor ? "dataset-menu" : undefined} aria-haspopup="menu" aria-expanded={Boolean(datasetAnchor)}
              onClick={(event) => setDatasetAnchor(event.currentTarget)} endIcon={<ExpandMoreIcon />} sx={{ textDecoration: datasetActive ? "underline" : undefined }}>
              Datasets
            </Button>
          </Box>
          <Tooltip title={themeLabel}>
            <IconButton onClick={colorMode.toggleColorMode} color="inherit" aria-label={themeLabel} sx={{ flexShrink: 0 }}>
              {theme.palette.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Menu id="dataset-menu" anchorEl={datasetAnchor} open={Boolean(datasetAnchor)} onClose={() => setDatasetAnchor(null)}
        slotProps={{ list: { "aria-labelledby": "dataset-menu-button" }, paper: { sx: { maxWidth: 360 } } }}>
        {datasets.map((item) => (
          <MenuItem key={item.to} component={Link} to={item.to} selected={pathname === item.to || pathname.startsWith(`${item.to}/`)} onClick={() => setDatasetAnchor(null)}>
            <ListItemText primary={item.label} secondary={item.description} />
          </MenuItem>
        ))}
      </Menu>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { sx: { width: 360, maxWidth: "100%" } } }}>
        <Box id="mobile-navigation" component="nav" aria-label="Mobile navigation">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}>
            <Typography variant="h6">Explore Odin-SMR</Typography>
            <IconButton aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Divider />
          <List onClick={() => setDrawerOpen(false)}>
            <ListItemButton component={Link} to="/" selected={pathname === "/"}><ListItemText primary="Home" /></ListItemButton>
            <ListItemButton component={Link} to="/news" selected={pathname === "/news"}><ListItemText primary="News" /></ListItemButton>
            <ListItemButton component={Link} to="/documentation" selected={pathname === "/documentation"}><ListItemText primary="Documents" /></ListItemButton>
          </List>
          <Divider />
          <List subheader={<ListSubheader component="div">Datasets · no sign-in required</ListSubheader>} onClick={() => setDrawerOpen(false)}>
            {datasets.map((item) => (
              <ListItemButton key={item.to} component={Link} to={item.to} selected={pathname === item.to || pathname.startsWith(`${item.to}/`)} sx={{ alignItems: "flex-start", py: 1.5 }}>
                <ListItemText primary={item.label} secondary={item.description} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" id="main-content" tabIndex={-1} sx={{ flexGrow: 1, width: "100%", maxWidth: 1920, mx: "auto", outline: "none" }}>
        <Suspense fallback={<Box role="status" sx={{ p: 4, display: "flex", alignItems: "center", gap: 2 }}><CircularProgress size={24} aria-hidden="true" /><Typography>Loading observations…</Typography></Box>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/documentation" element={<Documents />} />
            <Route path="/level1/statistics" element={<Level1 />} />
            <Route path="/level1/statistics/:year" element={<Level1 />} />
            <Route path="/level1/calendar" element={<CalendarView />} />
            <Route path="/level2/calendar" element={<L2Calendar />} />
            <Route path="/level2/calendar/:year/:month" element={<L2Calendar />} />
            <Route path="/level2/calendar/:year/:month/:day/:fm" element={<L2Calendar />} />
            <Route path="/data_access" element={<DataAccess />} />
            <Route path="/data_access/parquet-guide" element={<ParquetDocumentation page="guide" />} />
            <Route path="/data_access/parquet-schema" element={<ParquetDocumentation page="schema" />} />
            <Route path="/migration-pilot" element={<MigrationPilot />} />
            <Route path="/migration" element={<MigrationArchive />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Box>
      <Footer />
    </Box>
  );
}

export default function App() {
  return <BrowserRouter><SiteLayout /></BrowserRouter>;
}
