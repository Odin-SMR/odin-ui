import { Box, Typography, Container, useTheme } from "@mui/material";

export default function Footer() {
  const theme = useTheme();
  return (
    <Box
      component="footer"
      sx={{
        bgcolor:
          theme.palette.mode === "light"
            ? theme.palette.grey[400]
            : theme.palette.grey[800],
        color: "text.primary",
        py: 2,
        mt: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" align="center">
          © {new Date().getFullYear()} Odin API — All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
