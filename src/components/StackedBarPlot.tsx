import { InspectMenu } from "./InspectMenu";
import { MenuItem, Popper, Stack, TextField } from "@mui/material";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import { useTheme } from "@mui/material/styles";
import { useEffect, useId, useState, type MouseEvent } from "react";
import { FREQMODES } from "../definitions";
import {
  timelineCount, timelineGroups, timelineModeInfo, timelineStack, useFrequencyModeData,
  type TimelineCount, type TimelineResponse,
} from "../hooks/Level1Stats";

type ComparisonRow = { group: number } & Record<string, TimelineCount>;
type PlotProps = {
  data: TimelineResponse; loading: boolean; error: string | null;
  updateYear?: (year: number) => void; level2?: ComparisonRow[];
};
type TooltipData = {
  group: number; key: string; valueL1: TimelineCount; valueL2: TimelineCount; ratio: number | null;
  level: number; source: "pointer" | "focus"; anchor: { getBoundingClientRect: () => DOMRect; contextElement: Element };
};
const showCount = (value: TimelineCount) => value === null ? "Missing" : String(value);
const tooltipCount = (value: TimelineCount) => value === null ? "Missing" : value.toLocaleString("en-US");
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Shared rendering keeps annual and comparison timelines on the same count contract. */
export function FrequencyTimelinePlot({ data, loading, error, updateYear, level2 }: PlotProps) {
  const theme = useTheme();
  const { parentRef, width } = useParentSize();
  const [tableOpen, setTableOpen] = useState(false);
  const [pinned, setPinned] = useState<{ group: number; key: string }>();
  const [inspectOpen, setInspectOpen] = useState(false);
  const tableTitle = useId();
  const tooltipId = useId();
  const [tooltipData, setTooltipData] = useState<TooltipData>();
  const hovered = tooltipData ? `${tooltipData.group}-${tooltipData.key}-${tooltipData.level}` : null;
  useEffect(() => { setPinned(undefined); setInspectOpen(false); setTooltipData(undefined); }, [data, loading]);
  useEffect(() => {
    // Focus can scroll an offscreen bar into view. Retain its live element
    // anchor while dismissing pointer coordinates that become stale on scroll.
    const dismissPointer = () => setTooltipData((current) => current?.source === "focus" ? current : undefined);
    const dismiss = () => setTooltipData(undefined);
    const dismissOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("scroll", dismissPointer, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("scroll", dismissPointer, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, []);
  const groups = timelineGroups(data), keys = Object.keys(data.Data);
  const compare = level2 !== undefined;
  const l2Keys = Array.from(new Set([...FREQMODES.map(String), ...keys,
    ...(level2 ?? []).flatMap((row) => Object.keys(row).filter((key) => key !== "group"))]));
  const getL1 = (group: number, key: string) => timelineCount(data, group, key);
  const getL2 = (group: number, key: string): TimelineCount => {
    const row = level2?.find((entry) => entry.group === group);
    return row?.[key] ?? null;
  };
  const l1 = timelineStack(groups, keys, getL1);
  const l2 = compare ? timelineStack(groups, l2Keys, getL2) : null;
  const countMissing = l1.missing.length + (l2?.missing.length ?? 0);
  const legendKeys = compare ? l2Keys : keys;
  // Only the plotting viewport has a bounded height. Text and controls stay in
  // natural flow, including at enlarged text sizes; measuring their height here
  // would feed it back through ResizeObserver and repeatedly grow the chart.
  const height = width >= 1000 ? 440 : width >= 600 ? 380 : 320;
  const plotError = error ?? l1.error ?? l2?.error;
  const margin = { top: 20, bottom: 40, left: 60, right: 20 };
  const background = theme.palette.background.paper;
  const stroke = theme.palette.text.secondary;
  const xScale = scaleBand<number>({ domain: groups, padding: 0.2, range: [0, Math.max(0, width - margin.left - margin.right)] });
  const pairGap = compare ? Math.min(4, xScale.bandwidth() / 8) : 0;
  const barWidth = (xScale.bandwidth() - pairGap) / (compare ? 2 : 1);
  const domain: [number, number] = [Math.min(l1.domain[0], l2?.domain[0] ?? 0), Math.max(l1.domain[1], l2?.domain[1] ?? 0)];
  const yScale = scaleLinear<number>({ domain, nice: true, range: [Math.max(0, height - margin.top - margin.bottom), 0] });
  const periodLabel = "Years" in data ? "Year" : "Month";
  const periodTitle = (group: number) => "Years" in data ? String(group) : `${monthNames[group - 1]} ${data.Year}`;
  const show = (group: number, key: string, level: number, trigger: SVGElement, event?: MouseEvent<SVGElement>) => {
    const valueL1 = getL1(group, key), valueL2 = getL2(group, key);
    const ratio = valueL1 !== null && valueL1 > 0 && valueL2 !== null ? valueL2 / valueL1 : null;
    // Client coordinates and a fixed portal keep the tooltip out of document
    // flow. Keyboard focus anchors to the actual bar, not the SVG's origin.
    const point = event ? new DOMRect(event.clientX, event.clientY, 0, 0) : null;
    setTooltipData({ group, key, level, valueL1, valueL2, ratio, source: event ? "pointer" : "focus",
      anchor: { getBoundingClientRect: () => point ?? trigger.getBoundingClientRect(), contextElement: trigger } });
  };
  const leave = () => setTooltipData(undefined);
  const leavePointer = () => setTooltipData((current) => current?.source === "focus" ? current : undefined);
  const pin = (group: number, key: string, trigger: SVGElement) => { trigger.focus(); leave(); setPinned({ group, key }); setInspectOpen(true); };
  const inspected = pinned ?? { group: groups[0], key: legendKeys[0] };
  const inspectedL1 = getL1(inspected.group, inspected.key), inspectedL2 = getL2(inspected.group, inspected.key);
  const inspectedRatio = inspectedL1 !== null && inspectedL1 > 0 && inspectedL2 !== null ? inspectedL2 / inspectedL1 : null;
  const boxStyle = { width: "100%", position: "relative" } as const;
  if (loading) return <Box ref={parentRef} sx={boxStyle}><Typography role="status">Loading Level 1 statistics…</Typography></Box>;
  if (plotError) return <Box ref={parentRef} sx={boxStyle}><Alert severity="error">Statistics unavailable: {plotError}</Alert></Box>;
  if (!groups.length || (!keys.length && !level2?.length)) return <Box ref={parentRef} sx={boxStyle}><Alert severity="info">No frequency-mode records are stored for this interval.</Alert></Box>;

  return <Box ref={parentRef} sx={boxStyle}>
    <svg width={width} height={height} role="img" aria-label={compare ? "Level 1 and Level 2 frequency-mode timeline" : "Level 1 frequency-mode timeline"}>
      <rect fill={background} width={width} height={height} rx={5} />
      {height > margin.top + margin.bottom && width > margin.left + margin.right && <Group top={margin.top} left={margin.left}>
        <line x1={0} x2={width - margin.left - margin.right} y1={yScale(0)} y2={yScale(0)} stroke={stroke} strokeDasharray="3 3" data-zero-baseline="true" />
        {[l1, ...(l2 ? [l2] : [])].map((stack, dataset) => <Group key={dataset}>
          {stack.segments.map((segment) => {
            const x = (xScale(segment.group) ?? 0) + dataset * (barWidth + pairGap);
            const info = timelineModeInfo(segment.key);
            const label = `${compare ? `L${dataset + 1}, ` : ""}${periodLabel} ${segment.group}, frequency mode ${info.label}, Count: ${segment.value}`;
            const common = {
              "data-count-state": segment.value === 0 ? "zero" : "value", "data-count": segment.value,
              "data-mode": segment.key, "data-group": segment.group, "data-level": dataset + 1,
              "aria-label": label, tabIndex: 0, role: "button", onClick: (event: MouseEvent<SVGElement>) => pin(segment.group, segment.key, event.currentTarget),
              "aria-describedby": tooltipData?.group === segment.group && tooltipData.key === segment.key && tooltipData.level === dataset + 1 && !inspectOpen ? tooltipId : undefined,
              onFocus: (event: React.FocusEvent<SVGElement>) => show(segment.group, segment.key, dataset + 1, event.currentTarget), onBlur: leave,
              onKeyDown: (event: React.KeyboardEvent<SVGElement>) => { if (event.key === "Escape") leave(); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pin(segment.group, segment.key, event.currentTarget); } },
              onMouseMove: (event: MouseEvent<SVGElement>) => show(segment.group, segment.key, dataset + 1, event.currentTarget, event), onMouseLeave: leavePointer,
            };
            return segment.value === 0
              ? <line key={`${segment.group}-${segment.key}`} {...common} x1={x} x2={x + barWidth} y1={yScale(segment.end)} y2={yScale(segment.end)} stroke={info.color} strokeWidth={3} />
              : <rect key={`${segment.group}-${segment.key}`} {...common} x={x} y={Math.min(yScale(segment.start), yScale(segment.end))}
                width={barWidth} height={Math.abs(yScale(segment.start) - yScale(segment.end))} fill={info.color} stroke={theme.palette.background.paper}
                strokeWidth={hovered === `${segment.group}-${segment.key}-${dataset + 1}` || (pinned?.group === segment.group && pinned.key === segment.key) ? 3 : 1} />;
          })}
          {stack.missing.map((cell) => {
            const siblings = stack.missing.filter((entry) => entry.group === cell.group);
            const x = (xScale(cell.group) ?? 0) + dataset * (barWidth + pairGap)
              + barWidth * (siblings.indexOf(cell) + 1) / (siblings.length + 1);
            const label = `${compare ? `L${dataset + 1}, ` : ""}${periodLabel} ${cell.group}, frequency mode ${timelineModeInfo(cell.key).label}, Count: Missing`;
            return <g key={`${cell.group}-${cell.key}`} data-count-state="missing" data-mode={cell.key} data-group={cell.group} data-level={dataset + 1}
              aria-label={label} tabIndex={0} role="button"
              aria-describedby={tooltipData?.group === cell.group && tooltipData.key === cell.key && tooltipData.level === dataset + 1 && !inspectOpen ? tooltipId : undefined}
              onFocus={(event) => show(cell.group, cell.key, dataset + 1, event.currentTarget)} onBlur={leave}
              onKeyDown={(event) => { if (event.key === "Escape") leave(); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pin(cell.group, cell.key, event.currentTarget); } }}
              onClick={(event) => pin(cell.group, cell.key, event.currentTarget)} onMouseMove={(event) => show(cell.group, cell.key, dataset + 1, event.currentTarget, event)} onMouseLeave={leavePointer}>
              <line x1={x - 4} x2={x + 4} y1={yScale(0) - 4} y2={yScale(0) + 4} stroke={theme.palette.warning.main} strokeWidth={2} />
              <line x1={x - 4} x2={x + 4} y1={yScale(0) + 4} y2={yScale(0) - 4} stroke={theme.palette.warning.main} strokeWidth={2} />
            </g>;
          })}
        </Group>)}
      </Group>}
      <AxisBottom scale={xScale} top={height - margin.bottom} left={margin.left} stroke={stroke} tickStroke={stroke}
        tickValues={groups.filter((_, index) => index % Math.max(1, Math.ceil(groups.length / Math.max(2, Math.floor(width / 65)))) === 0)} tickLabelProps={{ fill: stroke, fontSize: 12, textAnchor: "middle" }} />
      <AxisLeft scale={yScale} top={margin.top} left={margin.left} numTicks={5} stroke={stroke} tickStroke={stroke} tickLabelProps={{ fill: stroke, fontSize: 12, textAnchor: "end", dx: -3 }} />
      <text x={margin.left} y={14} fontSize={12} fill={stroke}>Stored scan-count sum</text>
      <text x={width / 2} y={height - 3} fontSize={12} fill={stroke} textAnchor="middle">{periodLabel === "Year" ? "Calendar year" : "Calendar month"}</text>
    </svg>
    {compare && <Stack direction="row" spacing={2} aria-label="Data level legend" sx={{ mb: 1 }}>
      <Typography variant="caption"><strong>L1</strong> · left bar</Typography>
      <Typography variant="caption"><strong>L2</strong> · right bar</Typography>
    </Stack>}
    <Box aria-label="Frequency mode legend" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 0.5, mt: 1 }}>
      {legendKeys.map((key) => <Box key={key} sx={{ display: "flex", gap: 0.75, alignItems: "center", minWidth: 0 }}><Box component="span" sx={{ width: 12, height: 12, bgcolor: timelineModeInfo(key).color, flexShrink: 0, borderRadius: 0.5 }} /><Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>FM {timelineModeInfo(key).label}</Typography></Box>)}
    </Box>
    {!!countMissing && <Typography variant="caption">Missing sums are marked × and excluded from bar heights. They have not been replaced with zero.</Typography>}
    <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
      <InspectMenu label="Inspect counts" open={inspectOpen} onOpenChange={setInspectOpen} description="Inspect a period and frequency mode, or open its monthly view">{(close) => <Stack spacing={2}>
        <TextField select size="small" label={periodLabel} value={inspected.group} onChange={(event) => setPinned({ ...inspected, group: Number(event.target.value) })}>{groups.map((group) => <MenuItem key={group} value={group}>{group}</MenuItem>)}</TextField>
        <TextField select size="small" label="Frequency mode" value={inspected.key} onChange={(event) => setPinned({ ...inspected, key: event.target.value })}>{legendKeys.map((key) => <MenuItem key={key} value={key}>FM {timelineModeInfo(key).label}</MenuItem>)}</TextField>
        <Typography variant="body2">L1 count: {showCount(getL1(inspected.group, inspected.key))}{compare && <><br />L2 count: {showCount(getL2(inspected.group, inspected.key))}<br />L2 / L1: {inspectedRatio === null ? "—" : `${(inspectedRatio * 100).toFixed(1)} %`}</>}<br />Range: {timelineModeInfo(inspected.key).freq}<br />Species: {timelineModeInfo(inspected.key).spec}</Typography>
        <Typography variant="caption">Stored signed sums are retained. Missing is distinct from zero.</Typography>
        {updateYear && <Button variant="contained" onClick={() => { close(); updateYear(inspected.group); }}>View {inspected.group} monthly</Button>}
      </Stack>}</InspectMenu>
      <Button size="small" onClick={() => setTableOpen(true)}>View exact counts in table</Button>
    </Stack>
    <Dialog open={tableOpen} onClose={() => setTableOpen(false)} fullWidth maxWidth="md" aria-labelledby={tableTitle}>
      <DialogTitle id={tableTitle}>{compare ? "Level 1 and Level 2" : "Level 1"} stored scan counts</DialogTitle>
      <DialogContent><Typography variant="body2" sx={{ mb: 2 }}>Missing values are shown as Missing; zero and negative stored sums are retained.</Typography><TableContainer><Table size="small" aria-label="Exact frequency mode counts">
        <TableHead><TableRow><TableCell>{periodLabel}</TableCell><TableCell>Frequency mode</TableCell><TableCell align="right">L1 count</TableCell>{compare && <TableCell align="right">L2 count</TableCell>}{updateYear && <TableCell>Monthly view</TableCell>}</TableRow></TableHead>
        <TableBody>{groups.flatMap((group) => legendKeys.map((key) => <TableRow key={`${group}-${key}`}><TableCell>{group}</TableCell><TableCell>{timelineModeInfo(key).label}</TableCell><TableCell align="right">{showCount(getL1(group, key))}</TableCell>{compare && <TableCell align="right">{showCount(getL2(group, key))}</TableCell>}{updateYear && <TableCell><Button size="small" onClick={() => { updateYear(group); setTableOpen(false); }}>View {group}</Button></TableCell>}</TableRow>))}</TableBody>
      </Table></TableContainer></DialogContent><DialogActions><Button onClick={() => setTableOpen(false)}>Close</Button></DialogActions>
    </Dialog>
    {tooltipData && !inspectOpen && <Popper id={tooltipId} open anchorEl={tooltipData.anchor} placement="top" popperOptions={{ strategy: "fixed" }}
      modifiers={[
        { name: "offset", options: { offset: [0, 12] } },
        { name: "flip", options: { rootBoundary: "viewport", padding: 8 } },
        { name: "preventOverflow", options: { rootBoundary: "viewport", padding: 8, altAxis: true, tether: false } },
      ]} sx={{ zIndex: theme.zIndex.tooltip, pointerEvents: "none" }}>
      <Box sx={{ bgcolor: "background.paper", color: "text.primary", p: 1.5,
        width: 300, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100dvh - 16px)", boxSizing: "border-box", overflow: "hidden",
        border: "1px solid", borderColor: "divider", borderRadius: 1.5, boxShadow: 4, overflowWrap: "anywhere" }}>
        <Typography variant="subtitle2">{periodTitle(tooltipData.group)} · FM {timelineModeInfo(tooltipData.key).label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{timelineModeInfo(tooltipData.key).spec}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 0.5, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
          <Box component="span" sx={{ fontWeight: tooltipData.level === 1 ? 700 : 400 }}>L1 count</Box><Box component="span" sx={{ textAlign: "right", fontWeight: tooltipData.level === 1 ? 700 : 400 }}>{tooltipCount(tooltipData.valueL1)}</Box>
          {compare && <><Box component="span" sx={{ fontWeight: tooltipData.level === 2 ? 700 : 400 }}>L2 count</Box><Box component="span" sx={{ textAlign: "right", fontWeight: tooltipData.level === 2 ? 700 : 400 }}>{tooltipCount(tooltipData.valueL2)}</Box>
            {tooltipData.ratio !== null && <><Box component="span">L2 / L1</Box><Box component="span" sx={{ textAlign: "right" }}>{(tooltipData.ratio * 100).toFixed(1)} %</Box></>}</>}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Range: {timelineModeInfo(tooltipData.key).freq}{/^[\d.\s,-]+$/.test(timelineModeInfo(tooltipData.key).freq) && " GHz"}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>Click or press Enter to inspect</Typography>
      </Box>
    </Popper>}
  </Box>;
}

export default function StackedBarPlot({ updateYear }: { updateYear?: (year: number) => void }) {
  const { series, loading, error } = useFrequencyModeData(null);
  return <FrequencyTimelinePlot data={series} loading={loading} error={error} updateYear={updateYear} />;
}
