import useMediaQuery from "@mui/material/useMediaQuery";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { memo, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { PilotL1b } from "../../odinApi/pilot";
import { InspectMenu } from "../InspectMenu";
import { bandMembership, displayDomain, exactValue, finite, frequencyAxis } from "./scientificValues";
import { usePlotWidth } from "./usePlotWidth";

type Props = { data: PilotL1b; frequencyReference?: "per-spectrum" | "first" };
type Channel = { spectrum: number; channel: number };
type Point = Channel & { x: number | null | undefined; y: number | null };
// Compact navigation labels; inspection retains the exact stored metres.
const heightLabel = (value: unknown) => finite(value) ? `${Number((value / 1000).toFixed(2))} km` : "height missing";

const SpectrumTrace = memo(function SpectrumTrace({ points, bands, spectrum, color, x, y }: {
  points: Point[]; bands: number[] | null; spectrum: number; color: string;
  x: (value: number) => number; y: (value: number) => number;
}) {
  // A missing datum at each band boundary prevents connecting distinct bands.
  const linePoints = bands ? points.flatMap((point, channel) => channel > 0 && bands[channel] !== bands[channel - 1] ? [null, point] : [point]) : [];
  return <g data-spectrum-index={spectrum}>
    <LinePath data={linePoints} defined={(point) => point !== null && finite(point.x) && finite(point.y)} x={(point) => x(point!.x as number)} y={(point) => y(point!.y as number)} fill="none" stroke={color} strokeWidth={1.5} data-spectrum-line="true" data-spectrum-index={spectrum} />
    {points.map((point, channel) => {
      const previous = points[channel - 1], next = points[channel + 1];
      if (!finite(point.x) || !finite(point.y)
        || (bands && bands[channel] === bands[channel - 1] && finite(previous?.x) && finite(previous?.y))
        || (bands && bands[channel] === bands[channel + 1] && finite(next?.x) && finite(next?.y))) return null;
      return <circle key={channel} cx={x(point.x)} cy={y(point.y)} r={2} fill={color}><title>Channel {channel + 1}: {point.x} Hz, {point.y} K</title></circle>;
    })}
  </g>;
});

export default function PilotSpectrum({ data, frequencyReference = "per-spectrum" }: Props) {
  const identity = `${data.ScanID?.[0] ?? "unknown"}/${data.FreqMode?.[0] ?? "unknown"}/${data.Version?.[0] ?? "unknown"}/${data.Spectrum?.length ?? 0}/${frequencyReference}`;
  return <SpectrumExplorer key={identity} data={data} frequencyReference={frequencyReference} />;
}

function SpectrumExplorer({ data, frequencyReference }: Props) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const { ref, width } = usePlotWidth();
  const { ref: selectionRef, width: selectionWidth } = usePlotWidth();
  const clipId = useId();
  const rangeId = useId();
  const rangeHelpId = useId();
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<[number, number]>([0, Math.max(0, (data.Spectrum?.length ?? 1) - 1)]);
  const [pin, setPin] = useState<Channel | null>(null);
  const [hover, setHover] = useState<Channel | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<[number, number] | null>(null);
  const [domain, setDomain] = useState<[number, number] | null>(null);
  const [bounds, setBounds] = useState<[string, string]>(["", ""]);
  const [rangeError, setRangeError] = useState("");
  const [mode, setMode] = useState<"inspect" | "zoom" | "pan">("inspect");
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectAnchor, setInspectAnchor] = useState<Element | null>(null);
  const [table, setTable] = useState<boolean | null>(null);
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; domain: [number, number] } | null>(null);
  const rangeDrag = useRef<{ pointerId: number; x: number; width: number; bounds: [number, number]; element: HTMLElement } | null>(null);
  const [rangeDragging, setRangeDragging] = useState(false);
  const series = useMemo(() => (data.Spectrum ?? []).map((spectrum, spectrumIndex) => {
    const lo = data.Frequency?.LOFreq;
    const offset = frequencyReference === "first" || lo?.length === 1 ? lo?.[0] : lo?.[spectrumIndex];
    const points = spectrum.map((value, channel): Point => {
      const frequency = data.Frequency?.IFreqGrid?.[channel];
      return { x: finite(frequency) && finite(offset) ? frequency + offset : null, y: value, channel, spectrum: spectrumIndex };
    });
    return { points, bands: bandMembership(data.Frequency?.SubBandIndex, points.length), valid: points.filter((point) => finite(point.x) && finite(point.y)) };
  }), [data.Spectrum, data.Frequency, frequencyReference]);
  const spectra = data.Spectrum ?? [];
  const spectrum = spectra[index] ?? [];
  const points = series[index]?.points ?? [];
  const visible = useMemo(() => series.slice(selection[0], selection[1] + 1), [series, selection]);
  const valid = useMemo(() => visible.flatMap((entry) => entry.valid), [visible]);
  const allBands = visible.every((entry) => entry.bands !== null);
  const channelCount = visible.reduce((total, entry) => total + entry.points.length, 0);
  const tableOpen = table ?? !valid.length;
  const fullX = useMemo(() => displayDomain(valid.map((point) => point.x as number)), [valid]);
  const [xMin, xMax] = domain ?? fullX;
  const [yMin, yMax] = useMemo(() => displayDomain(valid.map((point) => point.y as number)), [valid]);
  const left = 64, right = Math.max(left + 1, width - 18), top = 22, bottom = 322;
  const x = useMemo(() => scaleLinear<number>({ domain: [xMin, xMax], range: [left, right] }), [xMin, xMax, left, right]);
  const y = useMemo(() => scaleLinear<number>({ domain: [yMin, yMax], range: [bottom, top] }), [yMin, yMax, bottom, top]);
  const frequencyAt = (coordinate: number) => x.invert(coordinate);
  const pointX = (event: { currentTarget: SVGSVGElement; clientX: number }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return (event.clientX - rect.left) * width / rect.width;
  };
  const pointerPosition = (event: { currentTarget: SVGSVGElement; clientX: number; clientY: number }): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [pointX(event), (event.clientY - rect.top) * 382 / rect.height];
  };
  const nearest = ([px, py]: [number, number]): Channel | null => {
    if (px < left || px > right || py < top || py > bottom) return null;
    let best: Channel | null = null, distance = Infinity;
    for (const point of valid) {
      if ((point.x as number) < xMin || (point.x as number) > xMax) continue;
      const next = (x(point.x as number) - px) ** 2 + (y(point.y as number) - py) ** 2;
      if (next < distance) { best = point; distance = next; }
    }
    return best;
  };
  const updateDomain = (next: [number, number] | null) => {
    if (next && (!finite(next[0]) || !finite(next[1]) || !finite(next[1] - next[0]) || next[0] >= next[1])) {
      setRangeError("Choose a finite, nonzero frequency range."); return false;
    }
    setDomain(next); setBounds(next ? [String(next[0]), String(next[1])] : ["", ""]); setRangeError("");
    return true;
  };
  const zoom = (factor: number) => {
    const pinned = pin && series[pin.spectrum]?.points[pin.channel];
    const center = pinned && finite(pinned.x) ? pinned.x : (xMin + xMax) / 2;
    updateDomain([center - (xMax - xMin) * factor / 2, center + (xMax - xMin) * factor / 2]);
  };
  const tickCount = width < 500 ? 3 : 5;
  const ticks = Array.from({ length: tickCount }, (_, value) => value / (tickCount - 1));
  const tick = (value: number) => Math.abs(value) >= 1e6 ? value.toExponential(3) : Number(value.toPrecision(5)).toString();
  const frequencyTicks = frequencyAxis(xMin, xMax, right - left);
  const inspected = inspectOpen ? pin ?? hover : hover ?? pin;
  const inspectedPoint = inspected === null ? null : series[inspected.spectrum]?.points[inspected.channel];
  const scan = data.ScanID?.length === 1 ? data.ScanID[0] : data.ScanID?.[index];
  const frequencyMode = data.FreqMode?.length === 1 ? data.FreqMode[0] : data.FreqMode?.[index];
  const backendValues = Array.isArray(data.Backend) ? data.Backend : [];
  const backend = backendValues.length === 1 ? backendValues[0] : backendValues[index];
  const pinChannel = (channel: number, trigger: HTMLElement | SVGSVGElement | null, spectrumIndex = index) => {
    if (!Number.isInteger(channel) || channel < 0 || channel >= (series[spectrumIndex]?.points.length ?? 0)) return;
    setPin({ spectrum: spectrumIndex, channel }); setHover(null); setTooltipPosition(null); setIndex(spectrumIndex);
    if (spectrumIndex !== index) setPage(0);
    if (!inspectOpen) { trigger?.focus(); setInspectAnchor(trigger); }
    setInspectOpen(true);
  };
  const changeSelection = (next: [number, number]) => {
    setSelection(next); setIndex((current) => Math.max(next[0], Math.min(next[1], current)));
    setPin(null); setHover(null); setTooltipPosition(null); setInspectOpen(false); setPage(0); updateDomain(null);
  };
  const translateSelection = (bounds: [number, number], requestedShift: number) => {
    const shift = Math.max(-bounds[0], Math.min(spectra.length - 1 - bounds[1], requestedShift));
    const next: [number, number] = [bounds[0] + shift, bounds[1] + shift];
    if (next[0] !== selection[0] || next[1] !== selection[1]) changeSelection(next);
  };
  const endRangeDrag = () => {
    const current = rangeDrag.current;
    rangeDrag.current = null; setRangeDragging(false);
    if (current?.element.hasPointerCapture?.(current.pointerId)) current.element.releasePointerCapture(current.pointerId);
  };
  const moveRange = (event: PointerEvent<HTMLElement>) => {
    const current = rangeDrag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const distance = (event.clientX - current.x) / current.width * (spectra.length - 1);
    translateSelection(current.bounds, Math.sign(distance) * Math.round(Math.abs(distance)));
  };
  const rangeMovable = spectra.length > 1 && selection[1] - selection[0] < spectra.length - 1;
  const color = (spectrumIndex: number) => spectra.length === 1 ? theme.palette.primary.main : `hsl(${(215 + spectrumIndex * 137.508) % 360} 65% ${theme.palette.mode === "dark" ? 66 : 38}%)`;
  const channelDetails = (point: Point) => <>
    <strong>Spectrum {point.spectrum + 1} · Channel {point.channel + 1}</strong><br />
    Tangent altitude: {exactValue(data.Altitude?.[point.spectrum], " m")}{finite(data.Altitude?.[point.spectrum]) && ` (${heightLabel(data.Altitude?.[point.spectrum])})`}<br />
    Frequency: {exactValue(point.x, " Hz")}<br />Brightness temperature: {exactValue(point.y, " K")}<br />
    Quality: {exactValue(data.Quality?.[point.spectrum])} (raw)
  </>;

  const controls = <Stack key="plot-controls" direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <InspectMenu label="Inspect channel" buttonLabel="Inspect" title={pin !== null ? "Pinned channel" : "Inspect a channel"} description="Exact stored values; select a channel on the plot or by its number."
          open={inspectOpen} anchorEl={inspectAnchor} onOpenChange={(open) => { if (open) setInspectAnchor(null); setInspectOpen(open); }}>
          <TextField inputRef={inputRef} label="Channel (1-based)" type="number" size="small" value={inspected === null ? "" : inspected.channel + 1} slotProps={{ htmlInput: { min: 1, max: spectrum.length, step: 1 } }} onChange={(event) => { if (!event.target.value) setPin(null); else pinChannel(Number(event.target.value) - 1, inputRef.current); }} fullWidth />
          {inspectedPoint ? <Typography component="div" variant="body2" sx={{ overflowWrap: "anywhere" }} aria-live="polite">
            {channelDetails(inspectedPoint)}<br />Spectrum index: {inspectedPoint.spectrum} · Channel index: {inspectedPoint.channel}<br />Scan: {exactValue(scan)} · FM: {exactValue(frequencyMode)}
          </Typography> : <Typography variant="body2" color="text.secondary">Tap the plot or enter a channel number. Exact stored values remain available in the table and JSON.</Typography>}
          {inspectedPoint && finite(inspectedPoint.x) && (inspectedPoint.x < xMin || inspectedPoint.x > xMax) && <Typography variant="caption">This channel is outside the displayed frequency range. Reset to show it.</Typography>}
          {pin !== null && <Button onClick={() => { setPin(null); setHover(null); setTooltipPosition(null); }}>Clear pin</Button>}
        </InspectMenu>
        <Button variant="outlined" disabled={!valid.length} onClick={() => zoom(0.5)}>Zoom +</Button><Button variant="outlined" disabled={!valid.length} onClick={() => zoom(2)}>Zoom −</Button>
        <Button disabled={!valid.length} onClick={() => updateDomain(null)}>Reset</Button>
        <InspectMenu label="Axes & range" title="Frequency axis and gestures" description="Frequency changes leave the brightness scale fixed and preserve every source value." disabled={!valid.length}>{(close) => <>
          <ToggleButtonGroup exclusive size="small" value={mode} aria-label="Spectrum interaction" onChange={(_, value) => { if (value) { setMode(value); close(); } }}>
            <ToggleButton value="inspect">Inspect</ToggleButton><ToggleButton value="zoom">Zoom</ToggleButton><ToggleButton value="pan">Pan</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2">Inspect: tap to pin; ←/→ previews channels, Enter pins. Zoom or Pan: drag horizontally. Escape returns to Inspect.</Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => updateDomain([xMin - (xMax - xMin) / 4, xMax - (xMax - xMin) / 4])} aria-label="Pan frequency range left">←</Button>
            <Button variant="outlined" onClick={() => updateDomain([xMin + (xMax - xMin) / 4, xMax + (xMax - xMin) / 4])} aria-label="Pan frequency range right">→</Button>
          </Stack>
          <Box component="form" onSubmit={(event) => {
            event.preventDefault();
            const low = bounds[0].trim() ? Number(bounds[0]) : NaN, high = bounds[1].trim() ? Number(bounds[1]) : NaN;
            if (!finite(low) || !finite(high) || low >= high) setRangeError("Enter two finite frequencies with the minimum below the maximum."); else if (updateDomain([low, high])) close();
          }}>
            <Stack spacing={2}>
              <TextField label="Minimum frequency (Hz)" size="small" value={bounds[0]} placeholder={String(xMin)} onChange={(event) => setBounds([event.target.value, bounds[1]])} fullWidth />
              <TextField label="Maximum frequency (Hz)" size="small" value={bounds[1]} placeholder={String(xMax)} onChange={(event) => setBounds([bounds[0], event.target.value])} fullWidth />
              <Button type="submit" variant="outlined">Apply range</Button>
            </Stack>
            {rangeError && <Typography role="alert" color="error" variant="body2">{rangeError}</Typography>}
          </Box>
        </>}</InspectMenu>
      </Stack>;

  if (!spectra.length) return <Alert severity="info">No spectra are stored for this scan.</Alert>;
  return <Stack spacing={1.5} sx={{ minWidth: 0 }}>
    <Box ref={selectionRef}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        <Typography id={rangeId} variant="body2">Showing {selection[1] - selection[0] + 1} of {spectra.length} spectra · {selection[0] === selection[1] ? `spectrum ${selection[0] + 1}` : `${selection[0] + 1}–${selection[1] + 1}`}</Typography>
        <Button disabled={selection[0] === 0 && selection[1] === spectra.length - 1} onClick={() => changeSelection([0, spectra.length - 1])}>Show all</Button>
      </Stack>
      <Box sx={{ px: 1.5 }}><Slider value={[selection[0] + 1, selection[1] + 1]} min={1} max={Math.max(2, spectra.length)} step={1} disableSwap disabled={spectra.length < 2}
        onPointerDown={(event) => {
          if (!(event.target instanceof Element) || !event.target.closest(".MuiSlider-track")) return;
          // MUI calls this before its pointer handling; prevention also suppresses
          // its duplicate native touchstart path without taking thumb hit targets.
          event.preventDefault();
          if (event.button !== 0 || rangeDrag.current || !rangeMovable) return;
          const sliderWidth = event.currentTarget.getBoundingClientRect().width;
          if (sliderWidth <= 0) return;
          try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { return; }
          rangeDrag.current = { pointerId: event.pointerId, x: event.clientX, width: sliderWidth, bounds: selection, element: event.currentTarget };
          setRangeDragging(true);
          event.currentTarget.querySelector<HTMLInputElement>('input[type="range"]')?.focus({ preventScroll: true });
        }}
        onPointerMove={moveRange}
        onPointerUp={(event) => { if (event.pointerId === rangeDrag.current?.pointerId) { moveRange(event); endRangeDrag(); } }}
        onPointerCancel={(event) => { if (event.pointerId === rangeDrag.current?.pointerId) endRangeDrag(); }}
        onLostPointerCapture={(event) => { if (event.pointerId === rangeDrag.current?.pointerId) endRangeDrag(); }}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape" && rangeDrag.current) { event.preventDefault(); event.stopPropagation(); endRangeDrag(); }
          if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            event.preventDefault(); event.stopPropagation();
            if (!rangeDrag.current) translateSelection(selection, event.key === "ArrowRight" ? 1 : -1);
          }
        }}
        sx={{
          mb: 4.5,
          "& .MuiSlider-track": { cursor: rangeMovable ? rangeDragging ? "grabbing" : "grab" : "default", transition: rangeDragging ? "none" : undefined,
            "&::after": { content: '"⋮⋮"', position: "absolute", left: "50%", top: 24, transform: "translateX(-50%)", width: 44, height: 24, display: "grid", placeItems: "center", boxSizing: "border-box", border: "1px solid", borderColor: "currentColor", borderRadius: 1, bgcolor: "background.paper", fontSize: 18, lineHeight: 1, opacity: rangeMovable ? 1 : 0.45, touchAction: "none" } },
          ...(rangeDragging ? { cursor: "grabbing", "& .MuiSlider-thumb": { transition: "none" } } : {}),
          "& .MuiSlider-valueLabel": { width: "max-content", maxWidth: Math.max(40, (selectionWidth - 24) / 2), boxSizing: "border-box", whiteSpace: "normal", overflowWrap: "anywhere" },
          ...Object.fromEntries(selection.map((value, thumb) => [`& .MuiSlider-thumb[data-index="${thumb}"] .MuiSlider-valueLabel`, value < (spectra.length - 1) / 2
            ? { left: 0, transformOrigin: "bottom left", "&::before": { left: 10 } }
            : { right: 0, transformOrigin: "bottom right", "&::before": { left: "auto", right: 2 } }])),
        }}
        slotProps={{ input: { "aria-describedby": `${rangeId} ${rangeHelpId}` } }} getAriaLabel={(thumb) => thumb === 0 ? "First spectrum" : "Last spectrum"}
        getAriaValueText={(value) => `Spectrum ${value}, ${heightLabel(data.Altitude?.[value - 1])}`}
        valueLabelDisplay="auto" valueLabelFormat={(value) => `${value} · ${heightLabel(data.Altitude?.[value - 1])}`}
        onChange={(_, value) => { if (Array.isArray(value)) changeSelection([value[0] - 1, value[1] - 1]); }} />
      </Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
        <Typography variant="caption">{selection[0] + 1} · {heightLabel(data.Altitude?.[selection[0]])}</Typography>
        <Typography variant="caption">{selection[1] + 1} · {heightLabel(data.Altitude?.[selection[1]])}</Typography>
      </Stack>
      <Typography id={rangeHelpId} variant="caption" color="text.secondary">Scan order · tangent altitude. Move either handle to narrow the spectra. Drag the selected bar or its grip to move the range; Shift + ←/→ on either handle moves it one spectrum.</Typography>
    </Box>
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
      <TextField select label="Inspect spectrum" value={index} size="small" sx={{ minWidth: 160, flex: "1 1 160px", maxWidth: 280 }} onChange={(event) => {
        setIndex(Number(event.target.value)); setPin(null); setHover(null); setTooltipPosition(null); setInspectOpen(false); setPage(0);
      }}>
        {visible.map((_, relative) => { const value = selection[0] + relative; return <MenuItem key={value} value={value}>{value + 1} · {heightLabel(data.Altitude?.[value])}</MenuItem>; })}
      </TextField>
      <InspectMenu label="Spectrum details" title="Spectrum metadata" description="Stored metadata for the selected spectrum.">
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Scan: {exactValue(scan)} · FM: {exactValue(frequencyMode)}<br />Spectrum index: {index}<br />Tangent altitude: {exactValue(data.Altitude?.[index], " m")}<br />Solar zenith angle: {exactValue(data.SunZD?.[index], "°")}<br />Quality: {exactValue(data.Quality?.[index])} (raw)<br />Version: {exactValue(data.Version?.[index])}<br />Backend: {typeof backend === "string" ? backend : exactValue(backend)}</Typography>
        <Typography variant="caption">Quality values are stored flags, without a pass/fail interpretation.</Typography>
      </InspectMenu>
    </Stack>
    {!valid.length && <Alert severity="warning">The selected spectra have no finite frequency and brightness pairs. Missing values have not been replaced.</Alert>}
    {!!valid.length && !allBands && <Alert severity="info">Subband boundaries are unavailable or invalid for some spectra. Channels are shown as separate points where boundaries are unavailable.</Alert>}
    {!phone && controls}
      {!!valid.length && <>
      {mode !== "inspect" && <Typography variant="caption">Drag horizontally to {mode}. Escape returns to Inspect.</Typography>}
      <Box ref={ref} sx={{ width: "100%", minWidth: 0, color: "text.primary", position: "relative" }}>
        <svg role="img" aria-label="Brightness temperature spectrum" tabIndex={0} width="100%" height={382} viewBox={`0 0 ${width} 382`} style={{ display: "block", touchAction: mode === "inspect" ? "pan-y" : "none" }}
          onClick={(event) => { if (mode === "inspect") { const point = nearest(pointerPosition(event)); if (point) pinChannel(point.channel, event.currentTarget, point.spectrum); } }}
          onPointerDown={(event) => { if (mode !== "inspect") { drag.current = { x: pointX(event), domain: [xMin, xMax] }; event.currentTarget.setPointerCapture?.(event.pointerId); } }}
          onPointerMove={(event) => { if (mode === "inspect" && event.pointerType !== "touch") { const position = pointerPosition(event); setHover(nearest(position)); setTooltipPosition(position); } }} onPointerLeave={() => { setHover(null); setTooltipPosition(null); }}
          onBlur={() => { setHover(null); setTooltipPosition(null); }}
          onPointerUp={(event) => {
            const coordinate = pointX(event);
            if (mode === "inspect") return;
            const start = drag.current; drag.current = null;
            if (!start || Math.abs(start.x - coordinate) < 4) return;
            if (mode === "zoom") updateDomain([Math.min(frequencyAt(start.x), frequencyAt(coordinate)), Math.max(frequencyAt(start.x), frequencyAt(coordinate))]);
            else { const shift = (start.x - coordinate) / (right - left) * (start.domain[1] - start.domain[0]); updateDomain([start.domain[0] + shift, start.domain[1] + shift]); }
          }} onPointerCancel={() => { drag.current = null; }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { drag.current = null; setPin(null); setHover(null); setTooltipPosition(null); setInspectOpen(false); setMode("inspect"); }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              const active = inspected?.spectrum ?? index;
              const channel = Math.max(0, Math.min(series[active].points.length - 1, (inspected?.channel ?? 0) + (event.key === "ArrowRight" ? 1 : -1)));
              const point = series[active].points[channel];
              setHover(point ? { spectrum: active, channel } : null); setPin(null);
              setTooltipPosition(point && finite(point.x) && finite(point.y) ? [x(point.x), y(point.y)] : [left, top]);
            }
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pinChannel(inspected?.channel ?? 0, event.currentTarget, inspected?.spectrum ?? index); }
          }}>
          <title>Brightness temperature in kelvin versus frequency in hertz; select a channel to inspect exact source values</title>
          <defs><clipPath id={clipId}><rect x={left} y={top} width={right - left} height={bottom - top} /></clipPath></defs>
          {ticks.map((fraction) => <g key={fraction}>
            <line x1={left} x2={right} y1={y(yMin + fraction * (yMax - yMin))} y2={y(yMin + fraction * (yMax - yMin))} stroke={theme.palette.divider} />
          </g>)}
          <g clipPath={`url(#${clipId})`}>
            {visible.map((entry, relative) => <SpectrumTrace key={selection[0] + relative} {...entry} spectrum={selection[0] + relative} color={color(selection[0] + relative)} x={x} y={y} />)}
            {inspectedPoint && finite(inspectedPoint.x) && finite(inspectedPoint.y) && <g>
              <line x1={x(inspectedPoint.x)} x2={x(inspectedPoint.x)} y1={top} y2={bottom} stroke={theme.palette.primary.main} strokeDasharray="5 5" />
              <circle cx={x(inspectedPoint.x)} cy={y(inspectedPoint.y)} r={6} fill={theme.palette.background.paper} stroke={theme.palette.primary.main} strokeWidth={2} />
            </g>}
          </g>
          <AxisLeft scale={y} left={left} tickValues={ticks.map((fraction) => yMin + fraction * (yMax - yMin))} tickFormat={(value) => tick(Number(value))} stroke={theme.palette.text.secondary} tickStroke={theme.palette.text.secondary} tickLabelProps={{ fill: theme.palette.text.primary, fontSize: 12, textAnchor: "end", dx: -4, dy: "0.35em" }} />
          <AxisBottom scale={x} top={bottom} tickValues={frequencyTicks.ticks.map((entry) => entry.value)} tickFormat={(value) => frequencyTicks.ticks.find((entry) => entry.value === value)?.label} stroke={theme.palette.text.secondary} tickStroke={theme.palette.text.secondary}
            tickLabelProps={(value) => ({ fontSize: 12, fill: theme.palette.text.primary, textAnchor: value === xMin ? "start" : value === xMax ? "end" : "middle" })}
            tickComponent={({ x: tickX, y: tickY, formattedValue, textAnchor, fill }) => <text x={tickX} y={tickY} dy={6} fontSize={12} fill={fill} textAnchor={textAnchor} data-frequency-tick="true" data-frequency-value={frequencyTicks.ticks.find((entry) => entry.label === formattedValue)?.value}>{formattedValue}</text>} />
          <text x={(left + right) / 2} y={374} textAnchor="middle" fontSize={12} fill="currentColor">{frequencyTicks.reference === null ? "Frequency (Hz)" : "Frequency offset (Hz)"}</text><text transform="translate(14 172) rotate(-90)" textAnchor="middle" fontSize={12} fill="currentColor">Brightness temperature (K)</text>
        </svg>
        {hover && tooltipPosition && inspectedPoint && !inspectOpen && <Box role="tooltip" sx={{ position: "absolute", pointerEvents: "none", zIndex: 1, width: 280, maxWidth: "calc(100% - 16px)", boxSizing: "border-box", p: 1.25, border: 1, borderColor: "divider", borderRadius: 1, boxShadow: 3, bgcolor: "background.paper", color: "text.primary", fontSize: 12, overflowWrap: "anywhere",
          left: Math.max(8, Math.min(width - Math.min(280, width - 16) - 8, tooltipPosition[0] > width / 2 ? tooltipPosition[0] - 292 : tooltipPosition[0] + 12)), top: Math.max(8, Math.min(190, tooltipPosition[1] + 12)) }}>
          {channelDetails(inspectedPoint)}
        </Box>}
      </Box>
      {frequencyTicks.reference !== null && <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Reference frequency: {String(frequencyTicks.reference)} Hz. Add each offset to this reference for the absolute frequency.</Typography>}
      <Typography variant="caption" role="status">Frequency range: {String(xMin)}–{String(xMax)} Hz</Typography>
      </>}
    {phone && controls}
    <Typography variant="caption">{valid.length} of {channelCount} channels plotted. {allBands ? "Subbands are drawn separately. Missing or non-finite values appear as gaps." : "Channels are not connected without valid subband boundaries."}</Typography>
    <Button sx={{ alignSelf: "flex-start" }} aria-expanded={tableOpen} onClick={() => setTable(!tableOpen)}>{tableOpen ? "Hide table" : "Table"}</Button>
    {tableOpen && <Box><Typography variant="body2">Spectrum {index + 1} · Tangent altitude: {exactValue(data.Altitude?.[index], " m")}</Typography><TableContainer tabIndex={0} role="region" aria-label="Spectrum channel data" sx={{ maxHeight: 360 }}>
      <Table stickyHeader sx={{ minWidth: 520, "& th": { whiteSpace: "nowrap" } }} size="small" aria-label="Exact spectrum channel values"><TableHead><TableRow><TableCell>Channel</TableCell><TableCell>Frequency (Hz)</TableCell><TableCell>Brightness temperature (K)</TableCell></TableRow></TableHead>
        <TableBody>{points.slice(page * 50, page * 50 + 50).map((point) => <TableRow key={point.channel} selected={pin?.spectrum === index && pin.channel === point.channel}>
          <TableCell><Button onClick={(event) => pinChannel(point.channel, event.currentTarget)} aria-label={`Inspect channel ${point.channel + 1}`}>{point.channel + 1}</Button></TableCell><TableCell>{exactValue(point.x)}</TableCell><TableCell>{exactValue(point.y)}</TableCell>
        </TableRow>)}</TableBody></Table>
    </TableContainer><TablePagination component="div" count={points.length} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={50} rowsPerPageOptions={[50]} sx={{ "& .MuiTablePagination-toolbar": { px: 0, flexWrap: "wrap" }, "& .MuiTablePagination-spacer": { display: "none" }, "& .MuiTablePagination-actions": { ml: 1 } }} /></Box>}
  </Stack>;
}
