import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../odinApi/cloud_client";
import { L2Plot } from "./L2Plot";

interface L2ProductPlotsProps {
  scanid: number;
  day: string;
}
const api = createApiClient("/api");

type L2 = z.infer<typeof schemas.Products>;

export const L2ProductPlots = ({ scanid, day }: L2ProductPlotsProps) => {
  const [l2, setL2] = useState<L2>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (scanid && day) {
        try {
          const data = await api.products_products_get({
            queries: {
              day: day,
              scanid: scanid,
            },
          });
          setL2(data);
        } catch {
          setL2([]);
        }
      }
    };
    fetchData();
  }, [scanid, day]);

  return (
    <Grid spacing={2} container>
      {scanid && (
        <Grid size={12}>
          <Typography align="center">{`${day} - ${scanid}`}</Typography>
        </Grid>
      )}
      {l2.length === 0 && (
        <Grid size={12} alignItems={"center"} justifyItems={"center"}>
          <Typography>
            Select a scan in the timeline to view products
          </Typography>
        </Grid>
      )}
      {l2
        .filter((v) => !v.name?.startsWith("Temperature"))
        .map((v, i) => (
          <Grid key={i} size={{ xs: 12, md: 6, xl: 3 }} height="40vh">
            <L2Plot data={v} />
          </Grid>
        ))}
    </Grid>
  );
};
