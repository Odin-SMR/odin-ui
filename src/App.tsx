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
import CalendarView from "./components/Level2";
import { ColorModeContext } from "./contexts/ColorModeContext";

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
                  to="/level1"
                  onClick={handleClose}
                >
                  Level1 statistics
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/level1_calendar"
                  onClick={handleClose}
                >
                  Level1 calendar
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/level2"
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
          <Route path="/level1/:year" element={<Level1 />} />
          <Route path="/level1" element={<Level1 />} />
          <Route path="/level2" element={<CalendarView />} />
        </Routes>
        <Footer />
      </Box>
    </BrowserRouter>
  );
}

export default App;
