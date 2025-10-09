import Grid from "@mui/material/Grid";
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
    <>
      <Grid container size={{ xs: 12 }} spacing={1} > 
        {l2
          .filter((v) => !v.name?.startsWith("Temperature"))
          .map((v, i) => (
            <Grid
              key={i}
              size={{ xs: 12 }}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "row",
                height: "420px",
                minWidth: 120,
              }}
            >
              <L2Plot data={v} />
            </Grid>
          ))}
      </Grid>
    </>
  );
};
