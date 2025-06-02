import { Box } from "@mui/material";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../../odinApi/client";

interface L1BPlotProps {
  scanid: number | undefined;
  freqmode: number | undefined;
}

type L1BType = z.infer<typeof schemas.L1b>;
const api = createApiClient("https://odin-smr.org/");
const margin = { top: 10, bottom: 30, left: 30, right: 20 };

export const L1BPlots = ({ freqmode, scanid }: L1BPlotProps) => {
  const { parentRef, width, height } = useParentSize({ debounceTime: 150 });
  const [series, setSeries] = useState<L1BType>();

  useEffect(() => {
    const getData = async () => {
      if (scanid && freqmode) {
        try {
          const data = await api.getRest_apiv5level1FreqmodeScannoL1b({
            params: { freqmode: freqmode, scanno: scanid },
          });
          setSeries(data.Data);
        } catch (err) {
          console.error(err);
        }
      }
    };
    getData();
  }, [freqmode, scanid]);

  const freq = series?.Frequency?.IFreqGrid?.map(
    (v) => ((v ?? 0) + (series.Frequency?.LOFreq?.[0] ?? 0)) / 1e9
  );
  const index = Array.from({ length: freq?.length ?? 0 }, (_, i) => i);
  const spectra = series?.Spectrum;
  if (spectra && freq) {
    const yScale = scaleLinear({
      domain: [
        Math.min(...spectra.flatMap((v) => v)),
        Math.max(...spectra.flatMap((v) => v)),
      ],
      range: [height - margin.bottom, margin.top],
      nice: true,
    });
    const xScale = scaleLinear({
      domain: [freq[0], freq[freq.length - 1]],
      range: [margin.left, width - margin.right],
      nice: true,
    });
    return (
      <Box ref={parentRef} sx={{ height: "inherit" }}>
        <svg width={width} height={height}>
          <rect width={width} height={height} fill="lightgray" />
          {scanid &&
            spectra.map((spectrum, idx) => (
              <LinePath
                key={idx}
                data={index}
                x={(d) => xScale(freq[d])}
                y={(d) => yScale(spectrum[d])}
                stroke="black"
                strokeWidth={0.5}
              />
            ))}
          <AxisLeft left={margin.left} scale={yScale} />
          <AxisBottom top={height - margin.bottom} scale={xScale} />
        </svg>
      </Box>
    );
  }
  return (
    <Box ref={parentRef} height={300}>
      <svg width={width} height={height}>
        <rect width={width} height={height} fill="lightgray" />
      </svg>
    </Box>
  );
};
