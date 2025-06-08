import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

export const NotFound = () => {
  return (
    <Grid container padding={2} spacing={2} alignItems={"center"}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant="h6">Page not found</Typography>
        <Typography variant="body1">
          The content you tried to find cannot be found.
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }} justifyItems={{ md: "center" }}>
        <Box
          component="img"
          src="/images/3_odin.jpg"
          alt="Odin picture"
          sx={{ maxWidth: { xs: "100%", md: "md" } }}
        />
      </Grid>
    </Grid>
  );
};
