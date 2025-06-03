import { Brightness4, Brightness7 } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import { useContext, useState } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Link as RouterLink,
  Routes,
} from "react-router-dom";
import Footer from "./components/Footer";
import { Home } from "./components/Home";
import { Level1 } from "./components/Level1";
import CalendarView from "./components/L1Calendar";
import { ColorModeContext } from "./contexts/ColorModeContext";
import { NotFound } from "./components/NotFound";
import { L2Calendar } from "./components/L2Calendar";

function App() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <BrowserRouter>
      <Box display="flex" flexDirection="column" minHeight="100vh">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Odin-SMR
            </Typography>
            <Box>
              <Button color="inherit" component={Link} to="/">
                Home
              </Button>
              <Button
                aria-controls="menu"
                aria-haspopup="true"
                onClick={handleOpen}
                color="inherit"
              >
                Datasets
              </Button>
              <IconButton onClick={colorMode.toggleColorMode} color="inherit">
                {theme.palette.mode === "dark" ? (
                  <Brightness7 />
                ) : (
                  <Brightness4 />
                )}
              </IconButton>
              <Menu
                id="menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem
                  component={RouterLink}
                  to="/level1/statistics"
                  onClick={handleClose}
                >
                  Level1 statistics
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/level1/calendar"
                  onClick={handleClose}
                >
                  Level1 calendar
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/level2/calendar"
                  onClick={handleClose}
                >
                  Level2 data
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/level1/statistics" element={<Level1 />} />
          <Route path="/level1/statistics/:year" element={<Level1 />} />
          <Route path="/level1/calendar" element={<CalendarView />} />
          <Route path="/level2/calendar" element={<L2Calendar />} />

          <Route path="*" element={<NotFound />} />
          
        </Routes>
        <Footer />
      </Box>
    </BrowserRouter>
  );
}

export default App;
