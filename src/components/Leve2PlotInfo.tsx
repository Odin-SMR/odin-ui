import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { AxisBottom } from "@visx/axis";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleUtc } from "@visx/scale";
import { Text } from "@visx/text";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";

export interface ScanInfo {
  datetime: Dayjs;
  FM: number;
  project: string;
  scanid: number;
}

interface Level2PlotInfoProps {
  data: ScanInfo[];
  handleSelectedScan: (scan: ScanInfo) => void;
}

export const Level2PlotInfo = ({
  data,
  handleSelectedScan,
}: Level2PlotInfoProps) => {
  const theme = useTheme();

  const { parentRef, width, height } = useParentSize();
  const [scanid, setScanid] = useState<number | null>(null);
  const margin = { top: 20, bottom: 50, left: 40, right: 20 };
  const minTime = dayjs(
    Math.min(...data.map((v) => v.datetime.valueOf()))
  ).toDate();
  const maxTime = dayjs(
    Math.max(...data.map((v) => v.datetime.valueOf()))
  ).toDate();
  const xScale = scaleUtc({
    domain: [minTime, maxTime],
    range: [0, width - margin.left - margin.right],
    nice: true,
  });

  const tFormat = (value: Date | number | { valueOf(): number }) => {
    const date =
      value instanceof Date ? value : new Date(Number(value.valueOf()));
    const fmt = dayjs.utc(date).format("HH:mm");
    return fmt;
  };

  return (
    <Box ref={parentRef} height="inherit">
      <svg width={width} height={height}>
        <rect width={width} height={height} fill={theme.palette.background.default} rx={14} />
        {data.length === 0 && (
          <Text x={width / 2} y={height / 2} textAnchor="middle">
            Select an entry in the calendar to display a time line
          </Text>
        )}
        {data.length >= 1 && (
          <Text x={width / 2} y={margin.top + 10} textAnchor="middle">
            {data[0].datetime.format("YYYY-MM-DD") +
              " FM: " +
              data[0].FM.toString()}
          </Text>
        )}
        <Group top={margin.top} left={margin.left}>
          {data.map((d, i) => (
            <line
              key={i}
              x1={xScale(d.datetime.toDate())}
              x2={xScale(d.datetime.toDate())}
              y1={margin.top + 10}
              y2={height - margin.top - margin.bottom}
              stroke={theme.palette.primary.main}
              strokeWidth={1}
              //   strokeDasharray="4,2"
              onClick={() => handleSelectedScan(d)}
            />
          ))}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={xScale(d.datetime.toDate())}
              cy={margin.top + 10}
              r={4}
              fill={scanid === d.scanid ? "red" : "white"}
              stroke="black"
              onClick={() => {
                setScanid(d.scanid);
                handleSelectedScan(d);
              }}
            />
          ))}
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
  );
};
