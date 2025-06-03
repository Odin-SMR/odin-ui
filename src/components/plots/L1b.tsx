import { Box, useTheme } from "@mui/material";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Text } from "@visx/text";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../../odinApi/client";

interface L1BPlotProps {
  scanid: number | undefined;
  freqmode: number | undefined;
}

type L1BType = z.infer<typeof schemas.L1b>;
const api = createApiClient("https://odin-smr.org/");
const margin = { top: 10, bottom: 50, left: 30, right: 20 };

export const L1BPlots = ({ freqmode, scanid }: L1BPlotProps) => {
  const theme = useTheme();
  const background =
    theme.palette.mode == "light"
      ? theme.palette.grey[300]
      : theme.palette.grey[600];
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
      } else {
        setSeries(undefined);
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
          <rect width={width} height={height} fill={background} />

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
          <AxisBottom
            top={height - margin.bottom}
            scale={xScale}
            tickLabelProps={() => ({
              angle: -45,
              textAnchor: "end",
              dy: "0.25em",
              fontSize: 11,
            })}
          />
        </svg>
      </Box>
    );
  }
  return (
    <Box ref={parentRef} height={height}>
      <svg width={width} height={height}>
        <rect width={width} height={height} fill={background} />
        <Text x={width / 2} y={height / 2} textAnchor="middle">
          Select an event from the calendar to display a track
        </Text>
      </svg>
    </Box>
  );
};
