import { Box, Button, LinearProgress, Stack, Typography, useTheme } from "@mui/material";
import { TooltipWithBounds } from "@visx/tooltip";
import { InspectMenu } from "../InspectMenu";
import { Graticule } from "@visx/geo";
import { useParentSize } from "@visx/responsive";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useMemo, useRef, useState } from "react";
import * as topojson from "topojson-client";
import topology from "./world-topo.json";
import { hasStartCoordinates, normalizeLongitude, type MapScanPosition } from "./mapCoordinates";

export const background = "#f9f7e8";
interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: { coordinates: [number, number][][]; type: "Polygon" };
  properties: { name: string };
}
// The imported JSON has the runtime TopoJSON shape; its inferred string types are wider.
// @ts-expect-error JSON geometry discriminator is inferred as string
const world = topojson.feature(topology, topology.objects.units) as { type: "FeatureCollection"; features: FeatureShape[] };

export type TrackType = MapScanPosition;
interface TrackProps { data: TrackType[] | undefined; loading: boolean; scanid: number | undefined; selectedScanid: (scanid: number | undefined) => void }

export function OdinTrack({ data: series, scanid, selectedScanid, loading }: TrackProps) {
  const theme = useTheme();
  const { parentRef, width, height } = useParentSize();
  const [hovered, setHovered] = useState<number>();
  const [tooltipPosition, setTooltipPosition] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const [panMode, setPanMode] = useState(false);
  const drag = useRef<{ x: number; y: number; initial: [number, number] } | null>(null);
  const valid = (series ?? []).filter(hasStartCoordinates);
  const omitted = (series?.length ?? 0) - valid.length;
  const base = useMemo(() => width > 20 && height > 20 ? geoNaturalEarth1().fitExtent([[8, 8], [width - 8, height - 8]], { type: "Sphere" }) : null, [width, height]);
  const projection = useMemo(() => base ? geoNaturalEarth1().scale(base.scale() * zoom).translate([width / 2 + pan[0], height / 2 + pan[1]]) : null, [base, width, height, zoom, pan]);
  const path = projection ? geoPath(projection) : null;
  const selected = valid.find((v) => v.scanid === scanid);
  const inspected = valid.find((v) => v.scanid === hovered) ?? selected;
  const reset = () => { setZoom(1); setPan([0, 0]); setPanMode(false); };
  const changeZoom = (next: number) => { const bounded = Math.max(1, Math.min(8, next)); setPan([pan[0] * bounded / zoom, pan[1] * bounded / zoom]); setZoom(bounded); };
  const zoomToSelected = () => { const point = selected && base?.([normalizeLongitude(selected.lon), selected.lat]); if (point) { setZoom(4); setPan([(width / 2 - point[0]) * 4, (height / 2 - point[1]) * 4]); } };

  return <Stack spacing={1} sx={{ flex: 1, minHeight: 0, minWidth: 0, position: "relative" }} aria-busy={loading}>
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap" }} aria-label="Map controls">
      <Button size="small" onClick={() => changeZoom(zoom * 2)} disabled={zoom >= 8}>Zoom +</Button>
      <Button size="small" onClick={() => changeZoom(zoom / 2)} disabled={zoom <= 1}>Zoom −</Button>
      <Button size="small" onClick={reset}>Reset</Button>
      <InspectMenu label="Map tools" description="Pan the map or focus the selected scan">{(close) => <Stack spacing={1}>
        <Button aria-pressed={panMode} onClick={() => { setPanMode(!panMode); close(); }} disabled={zoom === 1}>{panMode ? "Stop panning" : "Pan map"}</Button>
        <Button onClick={() => { zoomToSelected(); close(); }} disabled={!selected}>Focus scan</Button>
        <Typography variant="body2">Zoom first to pan. Drag in Pan mode or use the direction buttons. Reset returns to the whole globe. Escape ends panning.</Typography>
      </Stack>}</InspectMenu>
    </Stack>
    {panMode && <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
      <Button size="small" aria-label="Pan map west" onClick={() => setPan([pan[0] + width / 5, pan[1]])}>West</Button>
      <Button size="small" aria-label="Pan map east" onClick={() => setPan([pan[0] - width / 5, pan[1]])}>East</Button>
      <Button size="small" aria-label="Pan map north" onClick={() => setPan([pan[0], pan[1] + height / 5])}>North</Button>
      <Button size="small" aria-label="Pan map south" onClick={() => setPan([pan[0], pan[1] - height / 5])}>South</Button>
    </Stack>}
    {loading && <LinearProgress aria-label="Loading scan locations" />}
    <Box ref={parentRef} sx={{ flex: 1, minHeight: { xs: 220, sm: 280 }, minWidth: 0, bgcolor: theme.palette.mode === "light" ? "#f5f8fa" : "#182229", borderRadius: 1, overflow: "hidden", position: "relative" }}>
      <svg width={width} height={height} aria-label="Natural Earth map of scan start locations" style={{ position: "absolute", inset: 0, display: "block", touchAction: panMode ? "none" : "auto", cursor: panMode ? "grab" : undefined }}
        onKeyDown={(event) => { if (event.key === "Escape") { setPanMode(false); setHovered(undefined); } }}
        onPointerDown={(event) => { if (panMode) { drag.current = { x: event.clientX, y: event.clientY, initial: pan }; event.currentTarget.setPointerCapture(event.pointerId); } }}
        onPointerMove={(event) => { if (drag.current) setPan([drag.current.initial[0] + event.clientX - drag.current.x, drag.current.initial[1] + event.clientY - drag.current.y]); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <title>Scan start positions, geographic latitude ±90° and longitude ±180°. Select a point or use the scan list.</title>
        {projection && path && <g>
          <Graticule graticule={(geometry) => path(geometry) ?? ""} stroke={theme.palette.divider} />
          {world.features.map((feature, i) => <path key={i} d={path(feature) ?? ""} stroke={theme.palette.mode === "light" ? "#a3b2bd" : "#647c8a"} strokeWidth={0.5} fill={theme.palette.mode === "light" ? "#e2e9ed" : "#263b47"} />)}
          {!loading && valid.map((v, i) => { const point = projection([normalizeLongitude(v.lon), v.lat]); if (!point || point[0] < 0 || point[0] > width || point[1] < 0 || point[1] > height) return null;
            return <g key={`${v.scanid}-${i}`}
              tabIndex={0} role="button" aria-label={`Select scan ${v.scanid}, latitude ${v.lat}°, longitude ${v.lon}°`} aria-pressed={scanid === v.scanid}
              onMouseEnter={() => { setHovered(v.scanid); setTooltipPosition(point); }} onMouseLeave={() => setHovered(undefined)} onFocus={() => { setHovered(v.scanid); setTooltipPosition(point); }} onBlur={() => setHovered(undefined)}
              onClick={() => { if (!panMode) selectedScanid(v.scanid); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectedScanid(v.scanid); } }} style={{ cursor: "pointer" }}>
              <title>Scan {v.scanid} · {v.lat}° latitude · {v.lon}° longitude</title>
              <circle cx={point[0]} cy={point[1]} r={22} fill="transparent" />
              <circle cx={point[0]} cy={point[1]} r={scanid === v.scanid || hovered === v.scanid ? 6 : 4} fill={scanid === v.scanid ? theme.palette.primary.main : theme.palette.error.main} stroke={theme.palette.background.paper} strokeWidth={scanid === v.scanid ? 2 : 1} pointerEvents="none" />
            </g>;
          })}
        </g>}
      </svg>
      {hovered !== undefined && inspected && <TooltipWithBounds left={tooltipPosition[0]} top={tooltipPosition[1]} style={{ background: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, padding: 8, fontSize: 12, maxWidth: 220, pointerEvents: "none" }}>
        Scan {inspected.scanid}<br />{inspected.lat}° latitude · {inspected.lon}° longitude
      </TooltipWithBounds>}
      {!loading && !valid.length && <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", p: 2, pointerEvents: "none" }}><Typography variant="body2" align="center" sx={{ bgcolor: "background.paper", p: 1 }}>{series === undefined ? "Choose a day and frequency mode to see scan locations." : "No valid scan start coordinates are available."}</Typography></Box>}
    </Box>
    <Typography variant="caption">Natural Earth 1 · scan START positions · zoom {zoom}×</Typography>
    {omitted > 0 && <Typography variant="caption">{omitted} scans with missing or invalid coordinates are omitted.</Typography>}
    <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
      <Typography variant="caption" aria-live="polite" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{selected ? `Scan ${selected.scanid} · ${Math.abs(selected.lat).toFixed(3)}° ${selected.lat < 0 ? "S" : "N"} · ${Math.abs(normalizeLongitude(selected.lon)).toFixed(3)}° ${normalizeLongitude(selected.lon) < 0 ? "W" : "E"}` : "Select a point. Exact values are also in the scan list."}</Typography>
      <InspectMenu label="Inspect scan" disabled={!selected} title={selected ? `Scan ${selected.scanid}` : "Inspect scan"}>
        {selected && <Stack spacing={1}><Typography variant="body2">Start latitude: {selected.lat}°<br />Start longitude (raw): {selected.lon}°<br />Displayed longitude: {normalizeLongitude(selected.lon)}°</Typography>
          <Typography variant="body2">Natural Earth 1 projection. Points show scan start locations, not connected orbit tracks. Geographic bounds: latitude ±90°; longitude ±180°.</Typography>
        </Stack>}
      </InspectMenu>
    </Stack>
  </Stack>;
}
