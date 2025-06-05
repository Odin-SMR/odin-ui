import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Text } from "@visx/text";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import dayjs from "dayjs";
import AdvancedFormat from "dayjs/plugin/advancedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type z from "zod";
import type { schemas } from "../odinApi/client";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(AdvancedFormat);

type LogType = z.infer<typeof schemas.Log>;

interface L1ScanInfoPlotProps {
  data: LogType[] | undefined;
  scanid: number | undefined;
  selectedScanid: (scanid: number | undefined) => void;
}

export const L1ScanInfoPlot = ({
  data: series,
  scanid,
  selectedScanid,
}: L1ScanInfoPlotProps) => {
  const theme = useTheme();
  const background =
    theme.palette.mode == "light"
      ? theme.palette.grey[300]
      : theme.palette.grey[600];

  const { parentRef, width, height } = useParentSize();
  const margin = { top: 20, bottom: 50, left: 40, right: 20 };
  const time = series?.map((t) => dayjs.utc(t.DateTime).toDate()) ?? [];

  const yScale = scaleLinear<number>({
    domain: [
      Math.min(...(series ?? []).map((v) => v.SunZD ?? NaN)),
      Math.max(...(series ?? []).map((v) => v.SunZD ?? NaN)),
    ],
    nice: true,
    range: [height - margin.top - margin.bottom, 0],
  });
  const xScale = scaleUtc({
    domain: [time[0], time[(series?.length ?? 1) - 1]],
    range: [0, width - margin.left - margin.right],
    nice: true,
  });

  const tFormat = (value: Date | number | { valueOf(): number }) => {
    const date =
      value instanceof Date ? value : new Date(Number(value.valueOf()));
    const fmt = dayjs.utc(date).format("HH:mm");
    return fmt;
  };
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipTop,
    tooltipLeft,
    tooltipOpen,
  } = useTooltip<LogType>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
  });
  return (
    <Grid
      size={{ xs: 12 }}
      sx={{ height: "inherit", position: "relative" }}
      ref={parentRef}
    >
      <Box ref={containerRef}>
        <svg width={width} height={height}>
          <rect width={width} height={height} fill={background} rx={14} />
          <Text
            x={width / 2}
            y={margin.top / 2}
            textAnchor="middle"
            fontSize={12}
          >
            Sun Zentith Angle (deg)
          </Text>
          {series === undefined && (
            <Text
              x={width / 2}
              y={height / 2}
              fontSize={12}
              textAnchor="middle"
            >
              Select an event from the calendar to display a track
            </Text>
          )}
          <Group top={margin.top} left={margin.left}>
            {series && (
              <LinePath
                data={series}
                x={(d) => xScale(dayjs.utc(d.DateTime).toDate())}
                y={(d) => yScale(d.SunZD ?? NaN)}
                stroke="black"
                strokeWidth={3}
                curve={curveMonotoneX}
              />
            )}
            {series &&
              series.map((d, i) => (
                <circle
                  key={i}
                  cx={xScale(dayjs.utc(d.DateTime).toDate())}
                  cy={yScale(d.SunZD ?? NaN)}
                  r={5}
                  fill={scanid == d.ScanID ? "blue" : "white"}
                  stroke="steelblue"
                  onMouseEnter={(
                    event: React.MouseEvent<SVGCircleElement, MouseEvent>
                  ) => {
                    const { x, y } = localPoint(event) || { x: 0, y: 0 };
                    showTooltip({
                      tooltipData: d ?? {},
                      tooltipLeft: x + margin.left,
                      tooltipTop: y + margin.top,
                    });
                  }}
                  onClick={() => selectedScanid(d.ScanID)}
                  onMouseLeave={hideTooltip}
                  style={{ cursor: "pointer" }}
                />
              ))}
            <AxisLeft scale={yScale} />
            <AxisBottom
              scale={xScale}
              top={height - margin.bottom - margin.top}
              tickFormat={tFormat}
              tickLabelProps={() => ({
                angle: -45,
                textAnchor: "end",
                dy: "0.25em",
                fontSize: 11,
              })}
            />
          </Group>
        </svg>
      </Box>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal top={tooltipTop} left={tooltipLeft}>
          <div>
            scanid {tooltipData.ScanID}
            <br />
            {tooltipData.Quality ?? NaN}
          </div>
        </TooltipInPortal>
      )}
    </Grid>
  );
};
