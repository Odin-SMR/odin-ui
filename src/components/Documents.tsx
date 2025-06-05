import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

export const Documents = () => {
  const theme = useTheme();

  return (
    <Grid
      container
      justifyContent="center"
      spacing={2}
      padding={2}
      sx={{ bgcolor: theme.palette.background.paper }}
    >
      <Grid size={{ xs: 12, md: 8 }}>
        <Typography variant="h5" gutterBottom>
          Odin/SMR Documentation
        </Typography>
        <List dense>
          <ListItem disablePadding>
            <Link href="/documents/L1_ATBD.pdf" target="_blank" rel="noopener">
              Algorithm Theoretical Basis Document - Level 1 Processing (PDF)
              (2020-09-09)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/L2_ATBD.pdf" target="_blank" rel="noopener">
              Algorithm Theoretical Basis Document - Level 2 Processing (PDF)
              (2020-03-07)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/RBD.pdf" target="_blank" rel="noopener">
              Odin/SMR Requirement Baseline Document (PDF) (2015-12-10)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/VDS.pdf" target="_blank" rel="noopener">
              Odin/SMR Verification Dataset: Technical Note (PDF) (2019-12-04)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/L2_DATA.pdf" target="_blank" rel="noopener">
              L2 data - format and overview (PDF) (2020-08-12)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/DBMI.pdf" target="_blank" rel="noopener">
              Level2 processing configuration (PDF) (2020-09-08)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/IODD.pdf" target="_blank" rel="noopener">
              Input/Output Data Definition Document: Level2 processor (PDF)
              (2020-09-08)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/CAD.pdf" target="_blank" rel="noopener">
              Odin/SMR Level 2 Completeness Analysis Document (PDF) (updated
              2019-12-04)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link href="/documents/PVER.pdf" target="_blank" rel="noopener">
              Odin/SMR Product Validation and Evolution Report (PDF)
              (2020-10-27)
            </Link>
          </ListItem>
          <ListItem disablePadding>
            <Link
              href="/documents/astro_aero_programme159.xlsx"
              target="_blank"
              rel="noopener"
            >
              Programme planning spreadsheet for the Odin/SMR mission (XLSX)
            </Link>
            <Tooltip
              title={
                <>
                  For most users the <strong>Observing Plan</strong> tab is most
                  interesting. Columns B, R and S show date, mode and
                  description. Pointing and instrument modes vary by orbital
                  region. Comments clarify non-standard settings.
                </>
              }
              arrow
            >
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ListItem>
        </List>
      </Grid>
    </Grid>
  );
};
