import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Tooltip from "@visx/tooltip/lib/tooltips/Tooltip";

export function Home() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Odin/SMR Project Portal
      </Typography>

      <Divider sx={{ my: 4 }} id="news" />

      {/* Version 3 released */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            Version 3 released{" "}
            <Typography variant="caption">2020-10-30</Typography>
          </Typography>
          <Typography paragraph>
            We are happy to announce the release of version 3 of the Odin
            dataset.
          </Typography>
          <ul>
            <li>
              Complete reprocessing of the level 0 data to level 1 with improved
              calibration and correction algorithms.
            </li>
            <li>
              Upgraded level 2 processing scheme for separate mesospheric and
              stratospheric retrievals.
            </li>
            <li>Comprehensive validation against other instruments.</li>
          </ul>
          <Typography>Some highlights include:</Typography>
          <ul>
            <li>Recovery of the mesospheric carbon monoxide dataset.</li>
            <li>Improved ozone dataset.</li>
            <li>
              Better consistency between mesospheric water vapour products.
            </li>
          </ul>
          <Typography>DOIs:</Typography>
          <ul>
            <li>
              <Link href="https://doi.org/10.5270/OD1-010f2d4" target="_blank">
                Level 1 products (v8)
              </Link>
            </li>
            <li>
              <Link href="https://doi.org/10.5270/OD1-d98abd8" target="_blank">
                Level 2 products (v3)
              </Link>
            </li>
            <li>
              <Link href="https://doi.org/10.5270/OD1-34d7e73" target="_blank">
                Level 2 monthly (v1)
              </Link>
            </li>
          </ul>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/odinlaunch3.png"
            alt="Odin launch"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* FM01 Warning */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            Warning for <em>FM 01</em>{" "}
            <Typography variant="caption">2010–2018</Typography>
          </Typography>
          <Typography paragraph>
            FM 01 data may be unreliable due to a misbehaving local oscillator.
          </Typography>
          <Typography>
            Users should be cautious, as line shapes were distorted, affecting
            ozone and chlorine monoxide values.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/img2.gif"
            alt="Odin exploded view"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Documentation updated */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            Documentation updated{" "}
            <Typography variant="caption">2020-03-11</Typography>
          </Typography>
          <Typography paragraph>
            All data from the mission have been reprocessed and the
            documentation updated.
          </Typography>
          <Typography>
            <Link href="#documents">View documents</Link>
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/Odin_Auto8.jpg"
            alt="Odin at work"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} id="sanoma" />

      {/* SANOMA model */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            NO empirical model <span style={{ color: "gray" }}>SANOMA</span>
          </Typography>
          <Typography variant="h6">
            Warning to users{" "}
            <Typography variant="caption">2022-06-30</Typography>
          </Typography>
          <Typography paragraph>
            <strong>
              Error in provided coefficients. Do not use SANOMA until corrected.
            </strong>
          </Typography>
          <Typography paragraph>
            SANOMA models nitric oxide in the mesosphere and lower thermosphere
            based on Odin/SMR. MATLAB and text versions are available.
          </Typography>
          <Typography>
            Refer to:
            <Link
              href="https://doi.org/10.5194/acp-18-13393-2018"
              target="_blank"
            >
              Kiviranta et al. (2018)
            </Link>
          </Typography>
          <ul>
            <li>
              <Link href="/documents/SANOMA/SANOMA_instructions.m">
                General instructions
              </Link>
            </li>
            <li>
              <Link href="/documents/SANOMA/SANOMA_extraindices.m">
                Extra indices
              </Link>
            </li>
            <li>
              <Link href="/documents/SANOMA/SANOMA_indices.mat">
                Model coefficients (MATLAB)
              </Link>
            </li>
            <li>
              <Link href="/documents/SANOMA/SANOMA_indices.txt">
                Model coefficients (text)
              </Link>
            </li>
          </ul>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/8_odin.jpg"
            alt="SANOMA progress"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} id="mesospheo" />

      {/* MesosphEO */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            ESA mesosphEO <span style={{ color: "gray" }}>project</span>
          </Typography>
          <Typography paragraph>
            MesosphEO (2014–2017) provided mesospheric L2–L3 datasets from Odin,
            Envisat, SCISAT with harmonized format and merged products.
          </Typography>
          <Typography>
            Access:{" "}
            <Link href="http://mesospheo.fmi.fi/data_service.html">
              Data service
            </Link>{" "}
            – <Link href="http://mesospheo.fmi.fi/">Project site</Link>
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/mesospheo_logo.jpg"
            alt="ESA MesosphEO"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Odin Mission Overview */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            Monitoring the sky <span style={{ color: "gray" }}>from above</span>
          </Typography>
          <Typography paragraph>
            Odin launched in 2001, served astronomy and aeronomy. Since 2007,
            it's focused on atmospheric studies.
          </Typography>
          <Typography paragraph>
            It pioneered observations with a radiometer and spectrograph across
            a unique orbit and configuration.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/odin665.jpg"
            alt="Odin aeronomy"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} id="documents" />

      {/* Documents */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            Documents <span style={{ color: "gray" }}>for download</span>
          </Typography>
          <List dense>
            {[
              ["L1_ATBD.pdf", "Level 1 Processing (2020-09-09)"],
              ["L2_ATBD.pdf", "Level 2 Processing (2020-03-07)"],
              ["RBD.pdf", "Requirement Baseline (2015-12-10)"],
              ["VDS.pdf", "Verification Dataset (2019-12-04)"],
              ["L2_DATA.pdf", "L2 data format (2020-08-12)"],
              ["DBMI.pdf", "Processing config (2020-09-08)"],
              ["IODD.pdf", "Input/Output definition (2020-09-08)"],
              ["CAD.pdf", "Completeness analysis (2019-12-04)"],
              ["PVER.pdf", "Validation report (2020-10-27)"],
            ].map(([file, text]) => (
              <ListItem key={file}>
                <Link href={`/documents/${file}`} target="_blank">
                  {text}
                </Link>
              </ListItem>
            ))}
            <ListItem>
              <Link
                href="/documents/astro_aero_programme159.xlsx"
                target="_blank"
              >
                Programme planning spreadsheet (XLSX)
              </Link>
              <Tooltip title="Observing plan in columns B, R, S; pointing modes vary by orbit region.">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItem>
          </List>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/ODIN_Flight_configuration16_small.jpg"
            alt="Odin on Earth"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} id="consortium" />

      {/* Consortium */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            The consortium bringing data{" "}
            <span style={{ color: "gray" }}>from space to you</span>
          </Typography>
          <Typography paragraph>
            Since 2001, Chalmers has processed Level2. In 2015 ESA/SPPA
            initiated reprocessing support.
          </Typography>
          <Typography paragraph>
            Odin is part of ESA’s{" "}
            <Link href="https://earth.esa.int/web/guest/missions/3rd-party-missions/overview">
              Third Party Missions
            </Link>
            .
          </Typography>
          <Typography>
            Collaboration: <Link href="http://www.chalmers.se">Chalmers</Link>,{" "}
            <Link href="http://www.molflow.com">Molflow</Link>. Computation
            supported by <Link href="https://www.snic.se/">SNIC</Link> (grant
            2018-05973).
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/Odin_Auto9.jpg"
            alt="Odin in space"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} id="contact" />

      {/* Contact */}
      <Grid container spacing={4} alignItems="center">
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5">
            Contact us{" "}
            <span style={{ color: "gray" }}>you will find us here</span>
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography>
              <strong>Prof. Donal Murtagh</strong>
            </Typography>
            <Typography>
              Email:{" "}
              <Link href="mailto:donal.murtagh@chalmers.se">
                donal.murtagh@chalmers.se
              </Link>
            </Typography>
            <Typography>
              Chalmers University of Technology
              <br />
              Department of Earth and Space Sciences
              <br />
              SE-412 96 Gothenburg, Sweden
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography>
              <strong>Angelika Dehn</strong>
            </Typography>
            <Typography>
              Email:{" "}
              <Link href="mailto:angelika.dehn@esa.int">
                angelika.dehn@esa.int
              </Link>
            </Typography>
            <Typography>
              ESA-ESRIN
              <br />
              Via Galileo Galilei
              <br />
              Frascati (RM), 00044 Italy
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            component="img"
            src="/images/AS4-1-410HR.jpg"
            alt="Home"
            width="100%"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 8 }}
      >
        Odin/SMR Portal – maintained by Chalmers University of Technology
      </Typography>
    </Container>
  );
}
