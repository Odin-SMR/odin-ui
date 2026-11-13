import { InspectMenu } from "./InspectMenu";
import { TooltipWithBounds } from "@visx/tooltip";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { LinePath } from "@visx/shape";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import type { z } from "zod";
import type { schemas } from "../odinApi/client";

dayjs.extend(utc);
type Log = z.infer<typeof schemas.Log>;
interface Props { data: Log[] | undefined; scanid: number | undefined; selectedScanid: (id: number | undefined) => void }
export const L1ScanInfoPlot = ({ data, scanid, selectedScanid }: Props) => {
  const theme = useTheme();
  const { parentRef, width, height } = useParentSize();
  const [hovered, setHovered] = useState<Log>();
  const margin = { top: 25, bottom: 65, left: 55, right: 20 };
  const valid = (data ?? []).filter((v) => v.DateTime !== undefined && dayjs.utc(v.DateTime).isValid() && typeof v.SunZD === "number" && Number.isFinite(v.SunZD));
  const times = valid.map((v) => dayjs.utc(v.DateTime).valueOf());
  const angles = valid.map((v) => v.SunZD!);
  const minTime = Math.min(...times), maxTime = Math.max(...times);
  const minAngle = Math.min(...angles), maxAngle = Math.max(...angles);
  const xScale = scaleUtc({ domain: valid.length ? [new Date(minTime - (minTime === maxTime ? 1000 : 0)), new Date(maxTime + (minTime === maxTime ? 1000 : 0))] : [new Date(0), new Date(1)], range: [0, Math.max(0, width - margin.left - margin.right)] });
  const yScale = scaleLinear({ domain: valid.length ? [minAngle - (minAngle === maxAngle ? 1 : 0), maxAngle + (minAngle === maxAngle ? 1 : 0)] : [0, 180], nice: true, range: [Math.max(0, height - margin.top - margin.bottom), 0] });
  const inspected = hovered ?? valid.find((v) => v.ScanID === scanid);
  const color = theme.palette.text.primary;
  return <Box sx={{ height: "100%", minHeight: 240, width: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
    <Box ref={parentRef} sx={{ flex: 1, minHeight: { xs: 280, sm: 320 }, minWidth: 0, position: "relative" }}>
    {!valid.length ? <Typography variant="body2" color="text.secondary" sx={{ pt: 3 }}>{data === undefined ? "Choose a day and frequency mode to see solar geometry." : "No finite scan times and solar zenith angles are available."}</Typography> : <>
      <svg width={width} height={height} onKeyDown={(event) => { if (event.key === "Escape") setHovered(undefined); }} aria-label="Solar zenith angle in degrees by scan start time UTC" style={{ position: "absolute", inset: 0, display: "block" }}>
        <text x={margin.left} y={15} fontSize={12} fill={color}>Solar zenith angle (°)</text>
        <Group top={margin.top} left={margin.left}>
          <LinePath data={data ?? []} defined={(v) => valid.includes(v)} x={(v) => xScale(dayjs.utc(v.DateTime).toDate())} y={(v) => yScale(v.SunZD!)} stroke={theme.palette.primary.main} strokeWidth={1.5} />
          {valid.map((v, i) => <g key={`${v.ScanID}-${i}`}
            tabIndex={0} role="button" aria-pressed={v.ScanID === scanid} aria-label={`Select scan ${v.ScanID}, ${v.SunZD} degrees, ${v.DateTime} UTC`}
            onClick={() => selectedScanid(v.ScanID)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectedScanid(v.ScanID); } }}
            onMouseEnter={() => setHovered(v)} onMouseLeave={() => setHovered(undefined)} onFocus={() => setHovered(v)} onBlur={() => setHovered(undefined)} style={{ cursor: "pointer" }}>
            <circle cx={xScale(dayjs.utc(v.DateTime).toDate())} cy={yScale(v.SunZD!)} r={22} fill="transparent" />
            <circle cx={xScale(dayjs.utc(v.DateTime).toDate())} cy={yScale(v.SunZD!)} r={v.ScanID === scanid ? 6 : 3.5} fill={v.ScanID === scanid ? theme.palette.primary.main : theme.palette.background.paper} stroke={theme.palette.primary.main} strokeWidth={1.5} pointerEvents="none" />
          </g>)}
          <AxisLeft scale={yScale} stroke={color} tickStroke={color} numTicks={5} tickLabelProps={{ fill: color, fontSize: 12, textAnchor: "end", dx: -4 }} />
          <AxisBottom scale={xScale} top={Math.max(0, height - margin.top - margin.bottom)} numTicks={Math.max(2, Math.floor(width / 110))} stroke={color} tickStroke={color}
            tickFormat={(value) => dayjs.utc(new Date(Number(value))).format("HH:mm")} tickLabelProps={{ fill: color, fontSize: 12, textAnchor: "middle" }} />
        </Group>
        <text x={width / 2} y={height - 8} textAnchor="middle" fontSize={12} fill={color}>Scan start time (UTC)</text>
      </svg>
    </>}
    {hovered && <TooltipWithBounds left={margin.left + xScale(dayjs.utc(hovered.DateTime).toDate())} top={margin.top + yScale(hovered.SunZD!)} style={{ background: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, padding: 8, fontSize: 12, maxWidth: 200, pointerEvents: "none" }}>
      Scan {hovered.ScanID} · {hovered.SunZD}°<br />{dayjs.utc(hovered.DateTime).format("HH:mm:ss")} UTC
    </TooltipWithBounds>}
    </Box>
    {!!valid.length && <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5, flexShrink: 0 }}>
      <Typography variant="caption" aria-live="polite" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{inspected ? `Scan ${inspected.ScanID} · ${inspected.SunZD}° · ${dayjs.utc(inspected.DateTime).format("HH:mm:ss")} UTC · raw quality ${inspected.Quality ?? "Missing"}` : "Select a point. Missing values remain gaps."}</Typography>
      <InspectMenu label="Geometry details" description="Exact scan time, solar angle and raw quality"><Stack spacing={1}>
        {valid.find((v) => v.ScanID === scanid) ? (() => { const scan = valid.find((v) => v.ScanID === scanid)!; return <Typography variant="body2">Scan {scan.ScanID}<br />Start time: {scan.DateTime} UTC<br />Solar zenith angle: {scan.SunZD}°<br />Raw quality: {scan.Quality ?? "Missing"}</Typography>; })() : <Typography variant="body2">Select a point to inspect its scan.</Typography>}
        <Typography variant="body2">Times are UTC. Missing or nonfinite values break the line. Quality is shown as stored, without a pass/fail interpretation.</Typography>
      </Stack></InspectMenu>
    </Stack>}
  </Box>;
};
