import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Text } from "@visx/text";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { format } from "d3-format";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../../odinApi/client";

interface L1BPlotProps {
  scanid: number | undefined;
  freqmode: number | undefined;
}

interface ToolTipValues {
  x: number;
  y: number;
  alt: number;
  Sza: number;
}

type L1BType = z.infer<typeof schemas.L1b>;
const api = createApiClient("https://odin-smr.org/");
const margin = { top: 20, bottom: 50, left: 40, right: 20 };

export const L1BPlots = ({ freqmode, scanid }: L1BPlotProps) => {
  const theme = useTheme();
  const background =
    theme.palette.mode == "light"
      ? theme.palette.grey[300]
      : theme.palette.grey[600];
  const { parentRef, width, height } = useParentSize({ debounceTime: 150 });
  const [series, setSeries] = useState<L1BType>();
  const [hovered, setHovered] = useState<number | null>(null);

  const siTickFormat = format("~s");

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipOpen,
    tooltipTop = 0,
    tooltipLeft = 0,
  } = useTooltip<ToolTipValues>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

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
    (v) => (v ?? 0) + (series.Frequency?.LOFreq?.[0] ?? 0)
  );
  const index = Array.from({ length: freq?.length ?? 0 }, (_, i) => i);
  const spectra = series?.Spectrum;
  // if (spectra && freq) {
  const yScale = scaleLinear({
    domain: [
      Math.min(...(spectra ?? []).flatMap((v) => v)),
      Math.max(...(spectra ?? []).flatMap((v) => v)),
    ],
    range: [height - margin.bottom - margin.top, margin.top],
    // nice: true,
  });
  const xScale = scaleLinear({
    domain: [freq?.[0] ?? 0, freq ? freq?.[freq.length - 1] : 0],
    range: [0, width - margin.right - margin.left],
    // nice: true,
  });
  return (
    <Box
      ref={parentRef}
      sx={{ height: "100%", width: "100%", position: "relative" }}
    >
      <svg ref={containerRef} width={width} height={height}>
        <rect width={width} height={height} fill={background} rx={14} />
        <Text
          x={width / 2}
          y={margin.top / 2}
          textAnchor="middle"
          fontSize={12}
        >
          {`FM ${series?.FreqMode?.[0] ?? 0} Scanid: ${scanid ?? 0}`}
        </Text>

        <Text
          x={10}
          y={height / 2}
          angle={-90}
          textAnchor="middle"
          verticalAnchor="middle"
          fontSize={10}
        >
          Brightness Temp. (K)
        </Text>

        <Text x={width / 2} y={height - 5} textAnchor="middle" fontSize={12}>
          Frequency (Hz)
        </Text>
        <Group top={margin.top} left={margin.left}>
          {scanid &&
            spectra &&
            freqmode &&
            spectra.map((spectrum, idx) => (
              <LinePath
                key={idx}
                data={index}
                x={(d) => xScale(freq?.[d] ?? 0)}
                y={(d) => yScale(spectrum[d])}
                stroke="black"
                strokeWidth={hovered === idx ? 3 : 0.5}
                onMouseMove={(
                  event: React.MouseEvent<SVGLineElement, MouseEvent>
                ) => {
                  const point = localPoint(event) ?? { x: 0, y: 4 };
                  setHovered(idx);
                  showTooltip({
                    tooltipLeft: point.x,
                    tooltipTop: point.y,
                    tooltipData: {
                      Sza: series.SunZD?.[idx] ?? 0,
                      alt: series.Altitude?.[idx] ?? 0,
                      x: point.x,
                      y: point.y,
                    },
                  });
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  hideTooltip();
                }}
              />
            ))}
          <AxisLeft scale={yScale} />
          <AxisBottom
            top={height - margin.top - margin.bottom}
            scale={xScale}
            tickFormat={siTickFormat}
            tickLabelProps={() => ({
              // angle: -45,
              textAnchor: "end",
              dy: "0.25em",
              fontSize: 11,
            })}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            position: "absolute", // ensure it's layered
            backgroundColor: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <div>
            {/* {format(".5s")(xScale.invert(tooltipData.x)).toString() + "Hz"}
            <br />
            {format(".3s")(yScale.invert(tooltipData.y)).toString() + "K"}
            <br /> */}
            Tangent alt.: {format(".3s")(tooltipData.alt).toString() + "m"}
            <br />
            SZA:{format(".3s")(tooltipData.Sza).toString() + "deg"}
            <br />
          </div>
        </TooltipInPortal>
      )}
    </Box>
  );
  // }
  // return (
  //   <Box ref={parentRef} height={height}>
  //     <svg width={width} height={height}>
  //       <rect width={width} height={height} fill={background} />
  //       <Text x={width / 2} y={height / 2} textAnchor="middle">
  //         Select an event from the calendar to display a track
  //       </Text>
  //     </svg>
  //   </Box>
  // );
};
