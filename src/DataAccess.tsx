import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

export function DataAccess() {
  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h3" gutterBottom>
          Odin/SMR Data Access
        </Typography>

        <Typography variant="h5" gutterBottom>
          Introduction
        </Typography>
        <Typography paragraph>
          The primary way of accessing data from the Odin/SMR mission is through
          the <em>Odin/SMR web-API</em>. Data is also available for download as
          <em> NetCDF files</em>, accessible at
          <Link
            href="http://odin-l2netcdf.s3-website.eu-north-1.amazonaws.com/"
            target="_blank"
            rel="noopener"
          >
            {" "}
            http://odin-l2netcdf.s3-website.eu-north-1.amazonaws.com/
          </Link>
          .
        </Typography>
        <Typography paragraph>
          The Odin web-API is a so called <em>REST API</em>, where the user
          makes a<em> GET request</em> to an <em>API-endpoint</em>. The result
          is a<em> JSON-object</em>, a text-based format understood by most
          modern programming languages.
        </Typography>
        <Typography paragraph>
          It is recommended to access the API via scripts or programs (e.g.
          Python), not directly in the browser.
        </Typography>
        <Typography paragraph>
          The <strong>root URI</strong> of the API is:
          <code> http://odin.rss.chalmers.se/rest_api/v5</code>
        </Typography>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          Data format specification
        </Typography>
        <Typography paragraph>
          The returned structures are documented in:
        </Typography>
        <ul>
          <li>
            <Link href="/documents/L1_ATBD.pdf" target="_blank">
              Algorithm Theoretical Basis Document: Level 1 Processing
            </Link>
          </li>
          <li>
            <Link href="/documents/L2_DATA.pdf" target="_blank">
              Level 2 Data - Format and overview
            </Link>
          </li>
        </ul>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          Endpoints for data access
        </Typography>
        <Typography paragraph>
          Access to Level 2 data is covered here. For Level 1, see:
          <Link href="/documents/L1_ATBD.pdf"> L1 ATBD</Link>
        </Typography>
        <Typography variant="h6" gutterBottom>
          Recommended projects and products
        </Typography>
        <Typography paragraph>
          To access ozone profiles for 2015-01-03:
        </Typography>
        <Typography>
          <code>
            http://odin.rss.chalmers.se/rest_api/v5/level2/ALL-Strat-v3.0.0/2015-01-03/?product=O3%20%2F%20545%20GHz%20%2F%2020%20to%2085%20km&min_pressure=0&max_pressure=100000
          </code>
        </Typography>

        <Box mt={4}>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Species</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Product name</TableCell>
                  <TableCell>Vertical coverage</TableCell>
                  <TableCell>Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  [
                    "Ozone",
                    "ALL-Strat-v3.0.0",
                    "O3 / 545 GHz / 20 to 85 km",
                    "17–77 km",
                    "",
                  ],
                  [
                    "Chlorine monoxide",
                    "ALL-Strat-v3.0.0",
                    "ClO / 501 GHz / 20 to 55 km",
                    "18–58 km",
                    "Caution advised from early 2010 to January 2018",
                  ],
                  [
                    "Stratospheric water vapour",
                    "ALL-Strat-v3.0.0",
                    "H2O / 488 GHz / 20 to 70 km",
                    "19–78 km",
                    "Possible low bias of up to 15%",
                  ],
                  [
                    "Mesospheric water vapour",
                    "ALL-Meso-v3.0.0",
                    "H2O - 557 GHz - 45 to 100 km",
                    "44–110 km",
                    "Possible low bias of up to 15%",
                  ],
                  [
                    "Stratospheric temperature",
                    "ALL-Strat-v3.0.0",
                    "Temperature / 545 GHz / 15 to 65 km",
                    "21–64 km",
                    "",
                  ],
                  [
                    "Mesospheric temperature",
                    "ALL-Meso-v3.0.0",
                    "Temperature - 557 (Fmode 13) - 45 to 90 km",
                    "44–95 km",
                    "Possible cold bias of 3–5 K",
                  ],
                  [
                    "Nitric oxide",
                    "meso21",
                    "NO - 551 GHz - 45 to 115 km",
                    "45–115 km",
                    "Sporadic temporal coverage",
                  ],
                  [
                    "Carbon monoxide",
                    "ALL-Meso-v3.0.0",
                    "CO - 576 GHz",
                    "50–115 km",
                    "Sporadic temporal coverage",
                  ],
                ].map(([species, project, product, coverage, comment], idx) => (
                  <TableRow key={idx}>
                    <TableCell>{species}</TableCell>
                    <TableCell>
                      <code>{project}</code>
                    </TableCell>
                    <TableCell>
                      <code>{product}</code>
                    </TableCell>
                    <TableCell>{coverage}</TableCell>
                    <TableCell>{comment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Container>
  );
}
