import useMediaQuery from "@mui/material/useMediaQuery";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleLinear } from "@visx/scale";
import { useEffect, useId, useRef, useState } from "react";
import type z from "zod";
import type { schemas } from "../odinApi/cloud_client";
import { InspectMenu } from "./InspectMenu";
import { displayDomain, exactValue, finite } from "./plots/scientificValues";
import { usePlotWidth } from "./plots/usePlotWidth";
import { altitudeBins, errorPpmv, ppmv } from "./plots/profileGeometry";

type Product = z.infer<typeof schemas.Product>;
type Domain = { vmr: [number, number]; altitude: [number, number] };

export function L2Plot({ data }: { data: Product }) {
  return <ProfileExplorer key={`${data.scanid}/${data.name}`} data={data} />;
}

function ProfileExplorer({ data }: { data: Product }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const { ref, width } = usePlotWidth();
  const clipId = useId();
  const tooltipId = useId();
  const [pin, setPin] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState<boolean | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [bounds, setBounds] = useState(["", "", "", ""]);
  const [rangeError, setRangeError] = useState("");
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectAnchor, setInspectAnchor] = useState<Element | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (hover === null || inspectOpen) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setHover(null); };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [hover, inspectOpen]);
  const count = Math.max(data.data.alt.length, data.data.vmr.length, data.data.meas_resp.length,
    data.data.error_total?.length ?? 0, data.data.error_noise?.length ?? 0);
  const bins = altitudeBins(data.data.alt);
  const points = Array.from({ length: count }, (_, index) => ({
    index, altitude: data.data.alt[index], sourceVmr: data.data.vmr[index],
    vmr: ppmv(data.data.vmr[index]), response: data.data.meas_resp[index],
    bin: bins[index] ?? null, sourceTotal: data.data.error_total?.[index], sourceNoise: data.data.error_noise?.[index],
    total: errorPpmv(data.data.error_total?.[index]), noise: errorPpmv(data.data.error_noise?.[index]),
  }));
  const valid = points.filter((point) => finite(point.vmr) && finite(point.altitude));
  const tableOpen = table ?? !valid.length;
  const fullDomain: Domain = {
    vmr: displayDomain([0, ...valid.flatMap((point) => point.total === null
      ? [point.vmr as number] : [point.vmr as number, (point.vmr as number) - point.total, (point.vmr as number) + point.total]).filter(finite)]),
    altitude: displayDomain(points.flatMap((point) => point.bin ? [point.bin.lower, point.bin.upper] : [point.altitude]).filter(finite)),
  };
  const visible = domain ?? fullDomain;
  const [xMin, xMax] = visible.vmr, [yMin, yMax] = visible.altitude;
  const left = 64, right = Math.max(left + 1, width - 18), top = 20, bottom = 350;
  const x = scaleLinear<number>({ domain: [xMin, xMax], range: [left, right] });
  const y = scaleLinear<number>({ domain: [yMin, yMax], range: [bottom, top] });
  const selected = pin ?? hover;
  const selectedPoint = selected === null ? null : points[selected];
  const hoveredPoint = hover === null ? null : points[hover];
  const errorText = (source: unknown, converted: number | null) => converted === null
    ? source == null ? "Unavailable" : `Invalid (${exactValue(source)} source units)`
    : `±${exactValue(converted, " ppmv")}`;
  const details = (point: typeof points[number]) => <>
    <strong>Level {point.index} · {data.name}</strong><br />
    Altitude: {exactValue(point.altitude, " m")}<br />
    VMR: {exactValue(point.vmr, " ppmv")}<br />
    Source total error (1σ): {errorText(point.sourceTotal, point.total)}<br />
    Noise error (1σ): {errorText(point.sourceNoise, point.noise)}<br />
    {point.bin ? <>Grid display bounds: {exactValue(point.bin.lower)}–{exactValue(point.bin.upper, " m")}<br />Grid display thickness: {exactValue(point.bin.upper - point.bin.lower, " m")}<br /></>
      : <>Grid display thickness: unavailable<br /></>}
    Measurement response: {exactValue(point.response)}<br />
    Source VMR: {exactValue(point.sourceVmr)}
  </>;
  const tickCount = width < 500 ? 3 : 5;
  const ticks = Array.from({ length: tickCount }, (_, index) => index / (tickCount - 1));
  const tick = (value: number) => Number(value.toPrecision(5)).toString();
  const updateDomain = (next: Domain | null) => {
    if (next && [next.vmr, next.altitude].some(([low, high]) => !finite(low) || !finite(high) || !finite(high - low) || low >= high)) {
      setRangeError("Choose finite, nonzero ranges."); return false;
    }
    setDomain(next); setBounds(next ? [...next.vmr.map(String), ...next.altitude.map(String)] : ["", "", "", ""]); setRangeError("");
    return true;
  };
  const zoom = (factor: number) => {
    const center = (xMin + xMax) / 2, half = (xMax - xMin) * factor / 2;
    updateDomain({ vmr: [center - half, center + half], altitude: visible.altitude });
  };
  const pinLevel = (index: number, trigger: HTMLElement | SVGSVGElement | null) => {
    if (!Number.isInteger(index) || index < 0 || index >= count) return;
    setPin(index);
    if (!inspectOpen) { trigger?.focus(); setInspectAnchor(trigger); }
    setInspectOpen(true);
  };
  const nearest = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const rectangle = svg.getBoundingClientRect();
    const px = (clientX - rectangle.left) * width / rectangle.width;
    const py = (clientY - rectangle.top) * 410 / rectangle.height;
    if (!finite(px) || !finite(py) || px < left || px > right || py < top || py > bottom) return null;
    const candidates = valid.filter((point) => {
      const vmr = point.vmr as number;
      const extents = [vmr, ...(point.bin ? [0] : []), ...(point.total === null ? [] : [vmr - point.total, vmr + point.total])].filter(finite);
      if (Math.max(...extents) < xMin || Math.min(...extents) > xMax) return false;
      return point.bin ? py >= y(point.bin.upper) && py <= y(point.bin.lower) : Math.abs(py - y(point.altitude)) <= 8;
    });
    return candidates.reduce<number | null>((best, point) => {
      if (best === null) return point.index;
      const distance = Math.abs(y(point.altitude) - py), previousDistance = Math.abs(y(points[best].altitude) - py);
      return distance < previousDistance || (distance === previousDistance
        && Math.abs(x(point.vmr as number) - px) < Math.abs(x(points[best].vmr as number) - px)) ? point.index : best;
    }, null);
  };

  const controls = <Stack key="plot-controls" direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
      <InspectMenu label="Inspect level" buttonLabel="Inspect" title={pin !== null ? "Pinned level" : "Inspect a level"} description="Exact retrieved values and diagnostics; select a bar or choose its level."
        open={inspectOpen} anchorEl={inspectAnchor} onOpenChange={(open) => { if (open) setInspectAnchor(null); setInspectOpen(open); }} disabled={!points.length}>
        <TextField select inputRef={inputRef} size="small" label="Retrieval level" value={selected ?? ""} onChange={(event) => pinLevel(Number(event.target.value), inputRef.current)} fullWidth>
          {points.map((point) => <MenuItem key={point.index} value={point.index}>Level {point.index} · {exactValue(point.altitude, " m")}</MenuItem>)}
        </TextField>
        {selectedPoint ? <Typography component="div" variant="body2" sx={{ overflowWrap: "anywhere" }} aria-live="polite">
          {details(selectedPoint)}
        </Typography> : <Typography variant="body2" color="text.secondary">Tap a bar or choose a level. On the plot, ↑/↓ previews levels and Enter pins. Escape closes the pin.</Typography>}
        {selectedPoint && finite(selectedPoint.vmr) && finite(selectedPoint.altitude)
          && (selectedPoint.vmr < xMin || selectedPoint.vmr > xMax || selectedPoint.altitude < yMin || selectedPoint.altitude > yMax)
          && <Typography variant="caption">This level is outside the displayed ranges. Reset to show it.</Typography>}
        <Typography variant="caption">Source total error is a one-standard-deviation estimate including noise and cross-state contributions; internal smoothing error is excluded. Missing or invalid errors have no whiskers. Grid bounds are inferred halfway between distinct altitude levels, with half-spacing extrapolated at the ends; they do not measure retrieval resolution. Duplicate or solitary heights use symbols only. Explicit project/version are unavailable from this API response.</Typography>
        {pin !== null && <Button onClick={() => { setPin(null); setHover(null); }}>Clear pin</Button>}
      </InspectMenu>
      <Button variant="outlined" disabled={!valid.length} onClick={() => zoom(0.5)}>Zoom +</Button><Button variant="outlined" disabled={!valid.length} onClick={() => zoom(2)}>Zoom −</Button>
      <Button disabled={!valid.length} onClick={() => updateDomain(null)}>Reset</Button>
      <InspectMenu label="Axes & range" title="Profile axes" description="Display bounds preserve the source samples. Altitude increases upward; VMR is shown in ppmv." disabled={!valid.length}>{(close) => <Box component="form" onSubmit={(event) => {
        event.preventDefault();
        const values = bounds.map((value) => value.trim() ? Number(value) : NaN);
        if (values.some((value) => !finite(value)) || values[0] >= values[1] || values[2] >= values[3]) setRangeError("Enter finite bounds with each minimum below its maximum.");
        else if (updateDomain({ vmr: [values[0], values[1]], altitude: [values[2], values[3]] })) close();
      }}>
        <Stack spacing={2}>
          {["Minimum VMR (ppmv)", "Maximum VMR (ppmv)", "Minimum altitude (m)", "Maximum altitude (m)"].map((label, index) => <TextField key={label} size="small" label={label} value={bounds[index]} placeholder={String([xMin, xMax, yMin, yMax][index])} onChange={(event) => setBounds(bounds.map((value, entry) => index === entry ? event.target.value : value))} fullWidth />)}
          <Button type="submit" variant="outlined">Apply ranges</Button>
        </Stack>
        {rangeError && <Typography role="alert" color="error" variant="body2">{rangeError}</Typography>}
      </Box>}</InspectMenu>
    </Stack>;

  return <Stack spacing={1.5} sx={{ minWidth: 0 }}>
    {!phone && controls}
    {!valid.length && <Alert severity="info">This product has no finite altitude and mixing-ratio pairs to plot. Missing values have not been replaced with zero.</Alert>}
    {!!valid.length && <>
      <Box ref={ref} sx={{ width: "100%", minWidth: 0, color: "text.primary", position: "relative" }}>
        <svg width="100%" height={410} viewBox={`0 0 ${width} 410`} role="img" aria-label={`${data.name} retrieval profile`} tabIndex={0} style={{ display: "block", touchAction: "pan-y" }}
          aria-describedby={hoveredPoint && !inspectOpen ? tooltipId : undefined}
          onPointerMove={(event) => { if (event.pointerType !== "touch") setHover(nearest(event.clientX, event.clientY, event.currentTarget)); }} onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onClick={(event) => pinLevel(nearest(event.clientX, event.clientY, event.currentTarget) ?? -1, event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setPin(null); setHover(null); setInspectOpen(false); }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setHover(Math.max(0, Math.min(count - 1, (selected ?? 0) + (event.key === "ArrowUp" ? 1 : -1)))); setPin(null); }
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pinLevel(selected ?? 0, event.currentTarget); }
          }}>
          <title>Altitude in meters against volume mixing ratio in parts per million by volume. Bar heights show inferred altitude grid spacing, not retrieval resolution. Whiskers show source total error plus or minus one standard deviation. Filled symbols indicate response greater than 0.8; open symbols indicate response at most 0.8.</title>
          <defs><clipPath id={clipId}><rect x={left} y={top} width={right - left} height={bottom - top} /></clipPath></defs>
          {ticks.map((fraction) => <g key={fraction}>
            <line x1={left} x2={right} y1={y(yMin + fraction * (yMax - yMin))} y2={y(yMin + fraction * (yMax - yMin))} stroke={theme.palette.divider} />
          </g>)}
          <g clipPath={`url(#${clipId})`}>
            <line x1={x(0)} x2={x(0)} y1={top} y2={bottom} stroke={theme.palette.text.secondary} strokeDasharray="3 3" />
            {valid.map((point) => point.bin && <rect key={point.index} data-profile-bar="true" data-bar-level={point.index}
              data-bin-lower={point.bin.lower} data-bin-upper={point.bin.upper}
              x={Math.min(x(0), x(point.vmr as number))} y={y(point.bin.upper)}
              width={Math.abs(x(point.vmr as number) - x(0))} height={y(point.bin.lower) - y(point.bin.upper)}
              fill={theme.palette.primary.main} fillOpacity={0.18} stroke={theme.palette.primary.main} strokeWidth={1} />)}
            {valid.map((point) => point.total !== null && finite((point.vmr as number) - point.total) && finite((point.vmr as number) + point.total)
              && <g key={point.index} data-error-bar="true" data-error-level={point.index} data-error-ppmv={point.total} stroke={theme.palette.text.primary} strokeWidth={1.5}>
                <line x1={x((point.vmr as number) - point.total)} x2={x((point.vmr as number) + point.total)} y1={y(point.altitude)} y2={y(point.altitude)} />
                <line x1={x((point.vmr as number) - point.total)} x2={x((point.vmr as number) - point.total)} y1={y(point.altitude) - 4} y2={y(point.altitude) + 4} />
                <line x1={x((point.vmr as number) + point.total)} x2={x((point.vmr as number) + point.total)} y1={y(point.altitude) - 4} y2={y(point.altitude) + 4} />
              </g>)}
            {valid.map((point) => finite(point.response)
              ? <circle key={point.index} cx={x(point.vmr as number)} cy={y(point.altitude)} r={4} data-level={point.index} data-response={point.response > 0.8 ? "above" : "at-or-below"} fill={point.response > 0.8 ? theme.palette.primary.main : theme.palette.background.paper} stroke={theme.palette.primary.main} strokeWidth={1.5}><title>Level {point.index}: {point.altitude} m, {point.vmr} ppmv, response {point.response}</title></circle>
              : <path key={point.index} d={`M${x(point.vmr as number) - 4},${y(point.altitude) - 4}l8,8m0,-8l-8,8`} stroke={theme.palette.text.secondary} data-response="missing"><title>Level {point.index}: response missing</title></path>)}
            {selectedPoint && finite(selectedPoint.vmr) && finite(selectedPoint.altitude) && <circle cx={x(selectedPoint.vmr)} cy={y(selectedPoint.altitude)} r={8} fill="none" stroke={theme.palette.primary.main} strokeWidth={2} />}
          </g>
          <AxisLeft scale={y} left={left} tickValues={ticks.map((fraction) => yMin + fraction * (yMax - yMin))} tickFormat={(value) => tick(Number(value))} stroke={theme.palette.text.secondary} tickStroke={theme.palette.text.secondary} tickLabelProps={{ fill: theme.palette.text.primary, fontSize: 12, textAnchor: "end", dx: -4, dy: "0.35em" }} />
          <AxisBottom scale={x} top={bottom} tickValues={ticks.map((fraction) => xMin + fraction * (xMax - xMin))} tickFormat={(value) => tick(Number(value))} stroke={theme.palette.text.secondary} tickStroke={theme.palette.text.secondary}
            tickLabelProps={(value) => ({ fill: theme.palette.text.primary, fontSize: 12, textAnchor: value === xMin ? "start" : value === xMax ? "end" : "middle" })} />
          <text transform="translate(14 185) rotate(-90)" textAnchor="middle" fill="currentColor" fontSize={12}>Altitude (m)</text><text x={(left + right) / 2} y={401} textAnchor="middle" fill="currentColor" fontSize={12}>VMR (ppmv)</text>
        </svg>
        {hoveredPoint && !inspectOpen && <Box id={tooltipId} role="tooltip" sx={{
          position: "absolute", zIndex: 2, pointerEvents: "none", top: finite(hoveredPoint.altitude) && y(hoveredPoint.altitude) < 180 ? Math.max(8, Math.min(y(hoveredPoint.altitude) + 14, 90)) : 8,
          left: 8, width: "max-content", maxWidth: "calc(100% - 16px)", boxSizing: "border-box", p: 1.5,
          border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", color: "text.primary", boxShadow: 4,
        }}><Typography component="div" variant="caption" sx={{ overflowWrap: "anywhere", lineHeight: 1.5 }}>{details(hoveredPoint)}</Typography></Box>}
      </Box>
      <Typography variant="caption">● Response &gt;0.8 · ○ Response ≤0.8 · × Response missing. Response is a diagnostic, not a pass/fail rule. Missing pairs leave gaps.</Typography>
      <Typography variant="caption" role="status">VMR: {String(xMin)}–{String(xMax)} ppmv · Altitude: {String(yMin)}–{String(yMax)} m</Typography>
    </>}
    {phone && controls}
    <Typography variant="caption">Bar height shows altitude-grid spacing, not retrieval resolution. Whiskers: source total error (±1σ); unavailable errors are omitted.</Typography>
    {!valid.some((point) => point.total !== null) && <Typography variant="caption">Total errors are unavailable for this profile; no error bars are shown.</Typography>}
    <Button sx={{ alignSelf: "flex-start" }} aria-expanded={tableOpen} onClick={() => setTable(!tableOpen)}>{tableOpen ? "Hide table" : "Table"}</Button>
    {tableOpen && <TableContainer tabIndex={0} role="region" aria-label="Retrieval level data" sx={{ maxHeight: 360 }}>
      <Table stickyHeader sx={{ minWidth: 620, "& th": { whiteSpace: "nowrap" } }} size="small" aria-label="Exact retrieval profile values"><TableHead><TableRow><TableCell>Level</TableCell><TableCell>Altitude (m)</TableCell><TableCell>VMR (ppmv)</TableCell><TableCell>Source VMR</TableCell><TableCell>Total error (1σ, ppmv)</TableCell><TableCell>Noise error (1σ, ppmv)</TableCell><TableCell>Response</TableCell></TableRow></TableHead>
        <TableBody>{points.map((point) => <TableRow key={point.index} selected={pin === point.index}><TableCell><Button onClick={(event) => pinLevel(point.index, event.currentTarget)} aria-label={`Inspect level ${point.index}`}>{point.index}</Button></TableCell><TableCell>{exactValue(point.altitude)}</TableCell><TableCell>{exactValue(point.vmr)}</TableCell><TableCell>{exactValue(point.sourceVmr)}</TableCell><TableCell>{errorText(point.sourceTotal, point.total)}</TableCell><TableCell>{errorText(point.sourceNoise, point.noise)}</TableCell><TableCell>{exactValue(point.response)}</TableCell></TableRow>)}</TableBody>
      </Table>
    </TableContainer>}
  </Stack>;
}
