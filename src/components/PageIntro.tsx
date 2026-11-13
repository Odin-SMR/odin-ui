import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Box component="header" sx={{ mb: 4, maxWidth: "72ch" }}>
      {eyebrow && (
        <Typography variant="overline" color="primary" sx={{ display: "block", mb: 1 }}>
          {eyebrow}
        </Typography>
      )}
      <Typography component="h1" variant="h3" gutterBottom>
        {title}
      </Typography>
      {children && <Typography color="text.secondary">{children}</Typography>}
    </Box>
  );
}
