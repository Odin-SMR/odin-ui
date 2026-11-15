import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Alert, Box, Button, Container, Link, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PageIntro } from "./PageIntro";

const repository = "https://github.com/Odin-SMR/odin-mcp";
const release = `${repository}/releases/tag/v0.2.0`;
const install = `uv tool install --python 3.13 ${repository}/releases/download/v0.2.0/odin_mcp-0.2.0-py3-none-any.whl`;
const clientConfig = JSON.stringify({ servers: { "odin-mcp": { type: "stdio", command: "odin-mcp", args: [] } } }, null, 2);
const prompts = [
  {
    label: "Check the connection",
    text: "Use Odin's list_research_topics_tool to show the available analysis topics. Use guidance tools only; do not download observations.",
    note: "A working connection returns the bundled research topics. This check works offline after installation.",
  },
  {
    label: "Plan an analysis",
    text: "Use the Odin research guidance to help me plan a comparison of seasonal N2O profiles. Read the relevant full topics and cite their sources. Ask me to choose the processing project/version, dates, region and vertical coordinate. Explain product-specific quality screening, sampling and uncertainty. Use guidance tools only for now.",
    note: "Start with a plan and explicit scientific choices before requesting data or plots.",
  },
  {
    label: "Discover and preview data",
    text: "Use Odin MCP to list up to 3 public files for project ALL-Strat-v3.0.0, frequency mode 1, inversion mode stnd, product O3-501GHz-20to50km, storage month March 2019. Read 5 rows from one returned HTTPS URL. Keep the file and catalog provenance, explain the units and quality fields, and say why this preview is neither a complete profile nor a monthly mean. Do not download additional files.",
    note: "This requests a small real-data preview over public HTTPS. Even five rows require downloading the selected file within the server's byte limits.",
  },
  {
    label: "Prepare reproducible code",
    text: "Using the selected file's actual schema and the Odin guidance, write a local Python script to inspect complete ozone profiles. Preserve project, mode, product and scan identity, units, missing values, quality, measurement response, uncertainty and averaging kernels. Record source URLs, checksum status, package versions and all selection or screening choices. Explain unresolved assumptions and cite the guidance. Generate the script without running it.",
    note: "Run the resulting script in your notebook or a client with code execution. Odin MCP itself does not run analysis scripts or create figures.",
  },
];

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [status, setStatus] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setStatus("Copied to clipboard."); }
    catch { setStatus("Clipboard unavailable. Select the text and copy it."); }
  };
  return <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, my: 2, minWidth: 0 }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
      <Typography variant="subtitle2">{label}</Typography>
      <Button size="small" startIcon={<ContentCopyIcon />} onClick={copy} aria-label={`Copy ${label}`} sx={{ flexShrink: 0 }}>Copy</Button>
    </Stack>
    <Box component="pre" tabIndex={0} aria-label={label} sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", fontSize: ".8125rem", lineHeight: 1.65 }}><code>{text}</code></Box>
    <Typography role="status" variant="caption" sx={{ display: "block", mt: status ? 1 : 0 }}>{status}</Typography>
  </Box>;
}

const sectionSx = { mt: 5, maxWidth: "84ch", minWidth: 0 };
const detailsSx = { my: 2, "& summary": { cursor: "pointer", py: 1.5, fontWeight: 500 } };

export default function OdinMcp() {
  return <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
    <Link component={RouterLink} to="/data_access" sx={{ display: "inline-block", mb: 2 }}>← Use the data</Link>
    <PageIntro eyebrow="AI-assisted research · Odin MCP" title="Use Odin MCP with your AI assistant">
      Give your assistant access to cited Odin SMR research guidance, public Level 2 file discovery and small Parquet previews through the Model Context Protocol (MCP).
    </PageIntro>
    <Typography sx={{ maxWidth: "78ch" }}>Odin MCP runs on your computer. Your AI application provides the model and starts the server. Public data access needs no AWS account, credentials or API key; your AI application has its own model and access requirements.</Typography>
    <Stack component="nav" aria-label="Odin MCP guide sections" direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 2 }}>
      <Button href="#installation" variant="outlined">1. Installation</Button>
      <Button href="#running" variant="outlined">2. Running</Button>
      <Button href="#prompting" variant="outlined">3. Prompting</Button>
    </Stack>

    <Box component="section" aria-labelledby="installation" sx={sectionSx}>
      <Typography id="installation" component="h2" variant="h4" gutterBottom>1. Install Odin MCP</Typography>
      <Typography>Use an AI application that supports <strong>local MCP servers over stdio</strong> and CPython 3.10–3.14. The command below selects Python 3.13; uv can install it if needed. Internet access is needed for installation and public data requests.</Typography>
      <Typography sx={{ mt: 2 }}>First <Link href="https://docs.astral.sh/uv/getting-started/installation/">install uv for your operating system</Link>, then run this command in a terminal:</Typography>
      <CopyBlock label="Install Odin MCP v0.2.0" text={install} />
      <Typography variant="body2" color="text.secondary">This installs the official <Link href={release}>v0.2.0 GitHub release</Link> in an isolated environment. Use this release URL rather than assuming a package with the same name on a package index is Odin MCP. Python 3.15 is not supported by this release.</Typography>
      <Box component="details" sx={detailsSx}>
        <Box component="summary">PATH, updates and other installation options</Box>
        <Typography variant="body2">If your terminal cannot find <code>odin-mcp</code>, run the command below, then restart your terminal and AI application.</Typography>
        <CopyBlock label="Update the executable path" text="uv tool update-shell" />
        <Typography variant="body2">To replace an older installation, add <code>--force</code> after <code>uv tool install</code> in the release command and restart the server in your client. The release also supplies a source archive and <code>SHA256SUMS</code>. For pip in a virtual environment or a source installation with locked dependencies, follow the <Link href={`${repository}/blob/v0.2.0/README.md#install`}>installation reference</Link>.</Typography>
      </Box>
    </Box>

    <Box component="section" aria-labelledby="running" sx={sectionSx}>
      <Typography id="running" component="h2" variant="h4" gutterBottom>2. Run it through your AI application</Typography>
      <Typography>Add a local MCP server in your client's settings with these values:</Typography>
      <Box component="dl" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "10rem 1fr" }, columnGap: 3, rowGap: 1, my: 2, "& dt": { fontWeight: 600 }, "& dd": { m: 0, mb: { xs: 1, sm: 0 } } }}>
        <Box component="dt">Name</Box><Box component="dd"><code>odin-mcp</code></Box>
        <Box component="dt">Transport</Box><Box component="dd"><code>stdio</code> (local process)</Box>
        <Box component="dt">Command</Box><Box component="dd"><code>odin-mcp</code>, or its absolute executable path</Box>
        <Box component="dt">Arguments</Box><Box component="dd">None</Box>
        <Box component="dt">Environment</Box><Box component="dd">No environment variables required</Box>
      </Box>
      <Typography>Start or enable the server, accept your client's normal trust prompt, and make its Odin tools available to the assistant. The client launches and manages the process; you do not need a separate terminal server or an HTTP URL.</Typography>
      <Box component="details" sx={detailsSx}>
        <Box component="summary">Example: VS Code configuration</Box>
        <Typography variant="body2">Merge this server entry into <code>.vscode/mcp.json</code>, keeping any other servers. If the application cannot find the command, replace it with the full path to your installed executable. Other clients use different configuration formats; see <Link href="https://code.visualstudio.com/docs/agent-customization/mcp-servers">VS Code's MCP instructions</Link> for this example.</Typography>
        <CopyBlock label="VS Code MCP configuration" text={clientConfig} />
      </Box>
      <Box component="details" sx={detailsSx}>
        <Box component="summary">The server will not start, or the terminal looks idle</Box>
        <Typography variant="body2">Run <code>uv tool dir --bin</code> to find the executable directory. Use the full path ending in <code>odin-mcp</code> on Linux/macOS or <code>odin-mcp.exe</code> on Windows in the client's command setting. A Windows client needs its supported WSL integration to launch a WSL installation.</Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>Running <code>odin-mcp</code> manually waits for MCP messages; it does not open a chat. Stop a manual run with Ctrl+C and let your client start it. A client that only accepts remote HTTP servers cannot connect directly to this local stdio server.</Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>If guidance works but data requests fail, check internet access and the returned error. Narrow the file selection when a request exceeds a limit. Empty selections and HTTP failures are different outcomes; neither requires an AWS login.</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">Guidance works offline after installation. File discovery and previews use anonymous HTTPS on odin-smr.org. Your AI application may send tool results to its model provider even though the MCP server runs locally.</Typography>
    </Box>

    <Box component="section" aria-labelledby="prompting" sx={sectionSx}>
      <Typography id="prompting" component="h2" variant="h4" gutterBottom>3. Prompt your assistant</Typography>
      <Typography>Paste these prompts into your connected AI application's chat. Name Odin MCP explicitly, describe your scientific question, and say whether you want guidance, a bounded data preview or code to run yourself.</Typography>
      {prompts.map(({ label, text, note }) => <Box key={label} sx={{ mt: 3 }}>
        <CopyBlock label={label} text={text} />
        <Typography variant="body2" color="text.secondary">{note}</Typography>
      </Box>)}
      <Alert severity="info" sx={{ mt: 3 }}>A preview may stop partway through a profile, and one file-list page does not establish complete coverage. Storage months are not observation-time filters. Keep missing quality flags as unknown, use product-specific screening guidance, and preserve units and uncertainty. A successful read does not validate the science.</Alert>
      <Typography sx={{ mt: 2 }}>For a repeatable workflow, give your assistant the <Link href={`${repository}/blob/v0.2.0/docs/llm-guide.md`}>Odin LLM guide</Link>. If your client supports MCP prompts, choose <code>plan_odin_analysis</code> with a <code>question</code> and optional <code>product</code>. The bundled literature is a cited snapshot, not a live literature search.</Typography>
    </Box>

    <Box component="section" sx={{ ...sectionSx, pt: 3, borderTop: 1, borderColor: "divider" }}>
      <Typography component="h2" variant="h6" gutterBottom>Keep learning</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap", gap: 1.5 }}>
        <Button variant="outlined" component={RouterLink} to="/data_access/quickstart">Try the Python quickstart</Button>
        <Button variant="outlined" component={RouterLink} to="/data_access/files">Find Parquet files</Button>
        <Button variant="outlined" component={RouterLink} to="/data_access/parquet-guide">Read the analysis guide</Button>
      </Stack>
      <Typography variant="body2" sx={{ mt: 2 }}>Reference: <Link href={`${repository}/blob/v0.2.0/README.md`}>Odin MCP v0.2.0 setup and tool reference</Link>.</Typography>
    </Box>
  </Container>;
}
