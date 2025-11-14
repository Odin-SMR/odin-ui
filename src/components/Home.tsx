import {
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Typography,
} from "@mui/material";

export const Home = () => {
  return (
    <Card
      elevation={0}
      sx={{
        margin: 0,
        padding: 0,
        maxWidth: "900px",
        mx: "auto",
        mt: 4,
        overflow: "hidden",
      }}
    >
      <CardMedia
        component="img"
        image="/images/odin665.jpg"
        alt="Odin satellite"
        sx={{
          width: "100%",
          height: { xs: 200, sm: 300, md: 380 },
          objectFit: "cover",
        }}
      />

      <CardHeader
        title="Odin/SMR"
        subheader="A long-term mission in space"
        sx={{
          textAlign: "center",
          mt: 1,
          "& .MuiCardHeader-title": { fontSize: "1.8rem", fontWeight: 600 },
          "& .MuiCardHeader-subheader": { fontSize: "1rem" },
        }}
      />

      <CardContent sx={{ textAlign: "center", px: 3, pb: 4 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Odin launched in 2001 and has served both astronomy and aeronomy.
          Since 2007, it has focused on atmospheric studies, pioneering
          observations with a sub-millimeter radiometer and spectrograph in a
          unique orbit and configuration.
        </Typography>

        <Typography variant="body1">
          This site provides visualizations and tools built around data from the
          Sub-Millimetre Radiometer (SMR) instrument onboard the satellite.
        </Typography>
      </CardContent>
    </Card>
  );
};
