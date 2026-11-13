import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../odinApi/cloud_client";
import { L2Card } from "./L2Card";
import { L2Plot } from "./L2Plot";

const api = createApiClient("/api");
type Products = z.infer<typeof schemas.Products>;

export function L2ProductPlots({ scanid, day }: { scanid?: number; day?: string }) {
  if (scanid === undefined || !day) return <Alert severity="info">Select a scan to view its retrieved atmospheric profiles.</Alert>;
  return <ProductRequest key={`${day}/${scanid}`} scanid={scanid} day={day} />;
}

function ProductRequest({ scanid, day }: { scanid: number; day: string }) {
  const [result, setResult] = useState<{ data?: Products; error?: string; loading: boolean }>({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.products_products_get({ queries: { day, scanid }, signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult({ data, loading: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ error: "Retrieved products could not be loaded. Please try again.", loading: false }); });
    return () => controller.abort();
  }, [day, scanid, retry]);
  if (result.loading) return <Stack direction="row" sx={{ gap: 1, alignItems: "center" }} role="status"><CircularProgress size={20} /><Typography>Loading retrieved products for scan {scanid}…</Typography></Stack>;
  if (result.error) return <Alert severity="error" action={<Button color="inherit" onClick={() => { setResult({ loading: true }); setRetry(retry + 1); }}>Retry</Button>}>{result.error}</Alert>;
  if (!result.data?.length) return <Alert severity="info">No retrieved products were returned for scan {scanid} on {day} UTC.</Alert>;
  return <Stack spacing={2}>
    <Box><Typography component="h2" variant="h5">Retrieved profiles</Typography><Typography color="text.secondary" variant="body2">{day} UTC · Scan {scanid} · {result.data.length} products</Typography></Box>
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", alignItems: "start" }}>
      {result.data.map((product, index) => <L2Card key={`${product.name}/${index}`} data={product}>
        {product.name.startsWith("Temperature")
          ? <Alert severity="info">Temperature products are available as JSON. This view plots volume mixing ratios; temperature is not shown on a ppmv axis.</Alert>
          : <L2Plot data={product} />}
      </L2Card>)}
    </Box>
  </Stack>;
}
