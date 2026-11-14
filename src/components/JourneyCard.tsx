import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

export function JourneyCard({ eyebrow, title, children, to, action, primary = false }: {
  eyebrow: string; title: string; children: ReactNode; to: string; action: string; primary?: boolean;
}) {
  return <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
    <Typography variant="overline" color="primary">{eyebrow}</Typography>
    <Typography component="h2" variant="h5">{title}</Typography>
    <Typography color="text.secondary" sx={{ flexGrow: 1 }}>{children}</Typography>
    <Box sx={{ pt: 1 }}><Button component={RouterLink} to={to} variant={primary ? "contained" : "outlined"} endIcon={<ArrowForwardIcon />}>{action}</Button></Box>
  </Paper>;
}
