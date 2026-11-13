import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export const NotFound = () => (
  <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
    <Typography variant="overline" color="primary">404 · Page not found</Typography>
    <Typography component="h1" variant="h3" sx={{ mt: 1, mb: 2 }}>Let’s get you back to the observations</Typography>
    <Typography color="text.secondary" sx={{ maxWidth: "60ch", mb: 3 }}>
      This address doesn’t match a page on Odin-SMR. Use a link below to explore
      the data or find the documentation.
    </Typography>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 4 }}>
      <Button variant="contained" component={Link} to="/">Go to home</Button>
      <Button variant="outlined" component={Link} to="/level1/calendar">Explore Level 1</Button>
      <Button variant="outlined" component={Link} to="/documentation">Documentation</Button>
    </Stack>
    <Box component="img" src="/images/3_odin.jpg" alt="Odin satellite being prepared for its mission" sx={{ display: "block", width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 2 }} />
  </Container>
);
