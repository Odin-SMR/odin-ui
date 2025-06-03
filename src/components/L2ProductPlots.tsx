import { Grid, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../odinApi/client";
import { L2Plot } from "./L2Plot";
import type { ScanInfo } from "./Leve2PlotInfo";

interface L2ProductPlotsProps {
  scan: ScanInfo | undefined;
}

type L2 = z.infer<typeof schemas.L2>;

const api = createApiClient("https://odin-smr.org/");

export const L2ProductPlots = ({ scan }: L2ProductPlotsProps) => {
  const [l2, setL2] = useState<L2[]>([]);

  useEffect(() => {
    const getData = async () => {
      if (scan) {
        try {
          const data = await api.getRest_apiv5level2ProjectFreqmodeScannoL2({
            params: {
              freqmode: scan.FM,
              project: scan.project,
              scanno: scan.scanid,
            },
          });
          setL2(data.Data);
        } catch (err) {
          console.error(err);
        }
      } else {
        setL2([]);
      }
    };
    getData();
  }, [scan]);

  return (
    <Grid spacing={2} container>
      {l2.length === 0 && (
        <Grid size={12} alignItems={"center"} justifyItems={"center"}>
          <Typography>
            Select a scan in the timeline to view products
          </Typography>
        </Grid>
      )}
      {l2
        .filter((v) => !v.Product?.startsWith("Temperature"))
        .map((v, i) => (
          <Grid key={i} size={{ xs: 12, md: 6, xl: 3 }} height="40vh">
            <L2Plot data={v} />
          </Grid>
        ))}
    </Grid>
  );
};
