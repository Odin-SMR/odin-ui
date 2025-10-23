import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../odinApi/cloud_client";
import { L2Card } from "./L2Card";
import { L2Plot } from "./L2Plot";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface L2ProductPlotsProps {
  scanid: number;
  day: string;
}
const api = createApiClient("/api");

type L2 = z.infer<typeof schemas.Products>;

export const L2ProductPlots = ({ scanid, day }: L2ProductPlotsProps) => {
  const [l2, setL2] = useState<L2>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // setL2([]);
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
      setLoading(false);
    };
    fetchData();
  }, [scanid, day]);

  return (
    <Box sx={{ width: "100%", position: "relative"}}>
      <Grid container spacing={1} size={12}>
        {l2.length > 0 ? (
          l2
            .filter((v) => !v.name?.startsWith("Temperature"))
            .map((v, i) => (
              <Grid key={`card-${i}`} size={{ xs: 12, md: 6, xl: 3 }}>
                <L2Card data={v}>
                  <L2Plot data={v} />
                </L2Card>
                <Backdrop
                  open={loading}
                  key={`bdrop-${i}`}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: "rgba(0, 0, 0, 0.3)", // semi-transparent gray
                  }}
                >
                  <CircularProgress color="inherit" />
                </Backdrop>
              </Grid>
            ))
        ) : (
          <Box
            sx={{
              height: 524,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No scans selected.
            </Typography>
          </Box>
        )}
      </Grid>
      <Backdrop
        open={loading}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "rgba(0, 0, 0, 0.3)", // semi-transparent gray
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};
