import { Brightness4, Brightness7 } from "@mui/icons-material";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useContext, useState } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Link as RouterLink,
  Routes,
} from "react-router-dom";
import { Documents } from "./components/Documents";
import Footer from "./components/Footer";
import { Home } from "./components/Home";
import CalendarView from "./components/L1Calendar";
import { L2Calendar } from "./components/L2Calendar";
import { Level1 } from "./components/Level1";
import { NotFound } from "./components/NotFound";
import { ColorModeContext } from "./contexts/ColorModeContext";
import { DataAccess } from "./DataAccess";

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
              <Button color="inherit" component={Link} to="/documentation">
                Documents
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
                  Level1 Calendar
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/level2/calendar"
                  onClick={handleClose}
                >
                  Level2 Calendar
                </MenuItem>
                <MenuItem
                  component={RouterLink}
                  to="/data_access"
                  onClick={handleClose}
                >
                  Data Access
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documentation" element={<Documents />} />
          <Route path="/level1/statistics" element={<Level1 />} />
          <Route path="/level1/statistics/:year" element={<Level1 />} />
          <Route path="/level1/calendar" element={<CalendarView />} />
          <Route path="/level2/calendar" element={<L2Calendar />} />
          <Route path="/data_access" element={<DataAccess />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </Box>
    </BrowserRouter>
  );
}

export default App;
