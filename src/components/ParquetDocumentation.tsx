import DownloadIcon from "@mui/icons-material/Download";
import { Box, Button, Container, Link, Stack, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { Link as RouterLink } from "react-router-dom";
import remarkGfm from "remark-gfm";
import guide from "../../public/parquet/guide.md?raw";
import schema from "../../public/parquet/schema-guide.md?raw";
import { PageIntro } from "./PageIntro";

const documents = {
  guide: { source: guide, filename: "guide.md", path: "/data_access/parquet-guide" },
  schema: { source: schema, filename: "schema-guide.md", path: "/data_access/parquet-schema" },
};
const asset = (filename: string) => `${import.meta.env.BASE_URL}parquet/${filename}`;

function documentHref(href: string): { href: string; internal?: boolean } {
  if (href === "https://odin-smr.org/data_access#parquet-access") return { href: "/data_access#parquet-access" };
  const relative = href.replace(/^\.\//, "");
  const [filename, fragment] = relative.split("#", 2);
  const document = Object.values(documents).find((entry) => entry.filename === filename);
  if (document) return { href: document.path + (fragment ? `#${fragment}` : ""), internal: true };
  if (/^[a-z0-9-]+\.(?:ipynb|txt)$/i.test(filename)) return { href: asset(filename) + (fragment ? `#${fragment}` : "") };
  return { href };
}

export default function ParquetDocumentation({ page }: { page: keyof typeof documents }) {
  const document = documents[page];
  const [firstLine, ...lines] = document.source.trim().split("\n");
  const title = firstLine.replace(/^#\s+/, "");
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Link href="/data_access#parquet-access" sx={{ display: "inline-block", mb: 2 }}>← Back to Parquet data access</Link>
      <PageIntro eyebrow="Parquet documentation" title={title} />
      <Box component="nav" aria-label="Parquet documentation" sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, mb: 3 }}>
        <Link component={RouterLink} to={documents.guide.path} aria-current={page === "guide" ? "page" : undefined}>Analysis guide</Link>
        <Link component={RouterLink} to={documents.schema.path} aria-current={page === "schema" ? "page" : undefined}>Schemas and scientific contracts</Link>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap", gap: 1.5, mb: 4 }}>
        <Button variant="outlined" href={asset(document.filename)} download startIcon={<DownloadIcon />}>Download this guide as Markdown</Button>
        <Button variant="outlined" href={asset("first-profile.ipynb")} download startIcon={<DownloadIcon />}>Download first-profile notebook</Button>
        <Button variant="outlined" href={asset("requirements.txt")} download>Download Python requirements</Button>
      </Stack>
      <Box component="article" aria-label={title} sx={{
        maxWidth: "84ch", minWidth: 0, lineHeight: 1.75, overflowWrap: "anywhere",
        "& h2": { mt: 4, mb: 1.5 }, "& h3": { mt: 3, mb: 1 },
        "& p": { my: 1.5 }, "& li": { mb: .75 }, "& ul, & ol": { pl: 3 },
        "& code": { fontSize: ".875em", bgcolor: "action.hover", borderRadius: .5, px: .5 },
        "& pre": { border: 1, borderColor: "divider", borderRadius: 2, p: 2, my: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", lineHeight: 1.6 },
        "& pre code": { bgcolor: "transparent", px: 0 },
        "& th, & td": { borderBottom: 1, borderColor: "divider", p: 1.5, textAlign: "left", verticalAlign: "top", minWidth: "8rem" },
        "& th": { bgcolor: "action.hover", fontWeight: 600 },
        "& blockquote": { ml: 0, pl: 2, borderLeft: 3, borderColor: "divider", color: "text.secondary" },
      }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
          h1: ({ children }) => <Typography component="h2" variant="h5">{children}</Typography>,
          h2: ({ children }) => <Typography component="h2" variant="h5">{children}</Typography>,
          h3: ({ children }) => <Typography component="h3" variant="h6">{children}</Typography>,
          a: ({ href, children }) => {
            const target = documentHref(href ?? "");
            return target.internal ? <Link component={RouterLink} to={target.href}>{children}</Link> : <Link href={target.href}>{children}</Link>;
          },
          table: ({ children }) => <Box tabIndex={0} role="region" aria-label="Scrollable reference table" sx={{ overflowX: "auto", maxWidth: "100%", mb: 2 }}><Box component="table" sx={{ borderCollapse: "collapse", width: "100%", fontSize: ".9375rem" }}>{children}</Box></Box>,
          pre: ({ children }) => <Box component="pre" tabIndex={0} aria-label="Example code">{children}</Box>,
        }}>{lines.join("\n")}</ReactMarkdown>
      </Box>
    </Container>
  );
}
