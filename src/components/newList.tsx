// src/components/NewsList.tsx
import { CardContent, CardHeader, CardMedia, Grid } from "@mui/material";
import Card from "@mui/material/Card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NewsItem } from "../content/types";

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <>
      {items.map((n, i) => (
        <Grid key={`card-${i}`} size={12}>
          <Card sx={{ padding: 2 }}>
            <Grid container>
              <Grid size={{ xs: 12, md: 6 }} sx={{ minHeight: 500 }}>
                <CardHeader title={n.title} subheader={n.date} />
                <CardContent sx={{ flex: 1 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {n.body}
                  </ReactMarkdown>
                </CardContent>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CardMedia
                  sx={{ flex: 1, objectFit: "fill", minHeight: 400 }}
                  image={n.image}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>
      ))}
    </>
  );
}
