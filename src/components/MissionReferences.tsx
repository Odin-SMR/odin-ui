import { Box, Link, Typography } from "@mui/material";

const papers = [
  { author: "Murtagh et al.", year: 2002, title: "An overview of the Odin atmospheric mission", journal: "Canadian Journal of Physics 80, 309–319", doi: "10.1139/P01-157", topic: "Mission and scientific objectives" },
  { author: "Nordh et al.", year: 2003, title: "The Odin orbital observatory", journal: "Astronomy & Astrophysics 402, L21–L25", doi: "10.1051/0004-6361:20030334", topic: "Spacecraft and observing concept" },
  { author: "Frisk et al.", year: 2003, title: "The Odin satellite. I. Radiometer design and test", journal: "Astronomy & Astrophysics 402, L27–L34", doi: "10.1051/0004-6361:20030335", topic: "Instrument design" },
  { author: "Olberg et al.", year: 2003, title: "The Odin satellite. II. Radiometer data processing and calibration", journal: "Astronomy & Astrophysics 402, L35–L38", doi: "10.1051/0004-6361:20030336", topic: "Calibration methods" },
  { author: "Grieco et al.", year: 2020, title: "Recovery and validation of Odin/SMR long-term measurements of mesospheric carbon monoxide", journal: "Atmospheric Measurement Techniques 13, 5013–5031", doi: "10.5194/amt-13-5013-2020", topic: "Carbon monoxide validation" },
  { author: "Grieco et al.", year: 2021, title: "Improvement of Odin/SMR water vapour and temperature measurements and validation of the obtained data sets", journal: "Atmospheric Measurement Techniques 14, 5823–5857", doi: "10.5194/amt-14-5823-2021", topic: "Water vapour and temperature validation" },
];

export function MissionReferences({ all = false }: { all?: boolean }) {
  const selected = all ? papers : [papers[0], papers[4], papers[5]];
  return <Box component="ul" aria-label="Published scientific articles" sx={{ listStyle: "none", pl: 0, my: 0, display: "grid", gap: 2.5 }}>
    {selected.map((paper) => <Box component="li" key={paper.doi}>
      <Typography variant="overline" color="text.secondary">{paper.topic}</Typography>
      <Link href={`https://doi.org/${paper.doi}`} sx={{ display: "block", fontWeight: 500, my: .5 }}>{paper.title}</Link>
      <Typography variant="body2" color="text.secondary">{paper.author} ({paper.year}) · {paper.journal}</Typography>
    </Box>)}
  </Box>;
}
