import DownloadIcon from "@mui/icons-material/Download";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import type { PropsWithChildren } from "react";
import type { z } from "zod";
import type { schemas } from "../odinApi/cloud_client";
import { InspectMenu } from "./InspectMenu";
import { saveJson } from "./plots/scientificValues";

type L2 = z.infer<typeof schemas.Product>;

export function L2Card({ data, children }: PropsWithChildren<{ data: L2 }>) {
  return <Card variant="outlined" sx={{ height: "100%", minWidth: 0 }}>
    <CardHeader sx={{ flexWrap: "wrap", gap: 1, "& .MuiCardHeader-content": { minWidth: 0, flex: "1 1 12rem" } }} title={data.name} subheader={`Scan ${data.scanid}`} slotProps={{ title: { component: "h3", variant: "h6", sx: { overflowWrap: "anywhere" } }, action: { sx: { m: 0, alignSelf: "center" } } }} action={
      <InspectMenu label="Download" buttonLabel={<DownloadIcon />} title="Product data and metadata" description="Anonymous JSON downloads retain the original values.">
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{data.name} · Scan {data.scanid}</Typography>
        <Typography variant="caption">Downloads retain any supplied noise and total-error arrays. Explicit project/version is unavailable from this API response. The metadata download includes the returned product name and scan ID.</Typography>
        <Button variant="outlined" onClick={() => saveJson(data.data, `${data.scanid}_${data.name}.json`)}>Download JSON</Button>
        <Button onClick={() => saveJson(data, `${data.scanid}_${data.name}_product.json`)}>Include product metadata</Button>
      </InspectMenu>
    } />
    <CardContent>{children}</CardContent>
  </Card>;
}
