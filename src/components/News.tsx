import SearchIcon from "@mui/icons-material/Search";
import {
  Alert, Box, Container, Divider, InputAdornment, Link, TextField, Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadLocalNews } from "../content/loadLocalNews";
import { PageIntro } from "./PageIntro";

const items = loadLocalNews();

function newsImage(source: string) {
  // The historical FM1 article stored a development-server URL for a local asset.
  return source.replace(/^https?:\/\/localhost(?::\d+)?\//, "/").replace(/^(?!https?:\/\/|\/)/, "/");
}

export function News() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => `${item.title} ${item.body} ${item.date}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageIntro eyebrow="Mission archive" title="News & mission updates">
        Announcements, product notices and scientific updates from the Odin-SMR team.
      </PageIntro>
      <Alert severity="info" sx={{ mb: 3 }}>
        Satellite operations have ended and archive reprocessing continues. Older
        announcements below are retained as published and reflect their original date.
      </Alert>
      <TextField label="Search news" placeholder="Search by topic, product or year" value={query} onChange={(event) => setQuery(event.target.value)} fullWidth
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
        sx={{ maxWidth: 560, mb: 2 }} />
      <Typography role="status" variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {filtered.length} {filtered.length === 1 ? "update" : "updates"}{query.trim() ? ` matching “${query.trim()}”` : " in the archive"}
      </Typography>
      <Box sx={{ display: "grid", gap: 3 }}>
        {filtered.map((item) => (
          <Box component="article" key={item.slug} aria-labelledby={`news-${item.slug}`} sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", display: "grid", gridTemplateColumns: item.image ? { xs: "1fr", md: "minmax(0, 3fr) minmax(0, 2fr)" } : "1fr" }}>
            <Box sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
              <Typography component="time" dateTime={item.date} variant="caption" color="text.secondary">
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(item.date))}
              </Typography>
              <Typography component="h2" id={`news-${item.slug}`} variant="h5" sx={{ mt: 1, mb: 2 }}>{item.title}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ maxWidth: "70ch", color: "text.secondary", "& > :first-child": { mt: 0 }, "& > :last-child": { mb: 0 }, "& h3": { color: "text.primary", fontSize: "1.125rem", fontWeight: 500 }, "& img": { maxWidth: "100%", height: "auto" }, "& table": { display: "block", overflowX: "auto" }, "& pre": { p: 2, border: 1, borderColor: "divider", borderRadius: 1 }, "& a": { overflowWrap: "anywhere" } }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  h1: (props) => <Typography component="h3" variant="h6" gutterBottom>{props.children}</Typography>,
                  h2: (props) => <Typography component="h3" variant="h6" gutterBottom>{props.children}</Typography>,
                  a: ({ href, children }) => <Link href={href} {...(href?.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}{href?.startsWith("http") && <Box component="span" aria-label="opens in a new tab"> ↗</Box>}</Link>,
                }}>{item.body}</ReactMarkdown>
              </Box>
            </Box>
            {item.image && <Box component="img" src={newsImage(item.image)} alt="" loading="lazy" sx={{ width: "100%", height: { xs: 220, sm: 280, md: "100%" }, maxHeight: { md: 480 }, objectFit: "cover", alignSelf: "center" }} />}
          </Box>
        ))}
        {filtered.length === 0 && <Alert severity="info">No updates match this search. Try a product name or year.</Alert>}
      </Box>
    </Container>
  );
}
