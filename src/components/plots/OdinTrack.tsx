import Box from "@mui/material/Box";
import { Graticule } from "@visx/geo";
import { useParentSize } from "@visx/responsive";
import { Text } from "@visx/text";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useMemo, useState } from "react";
import * as topojson from "topojson-client";
import topology from "./world-topo.json";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

export const background = "#f9f7e8";

interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: { coordinates: [number, number][][]; type: "Polygon" };
  properties: { name: string };
}

// @ts-expect-error test
const world = topojson.feature(topology, topology.objects.units) as {
  type: "FeatureCollection";
  features: FeatureShape[];
};

export interface TrackType {
  lat: number;
  lon: number;
  scanid: number;
}

interface TrackProps {
  data: TrackType[] | undefined;
  loading: boolean;
  scanid: number | undefined;
  selectedScanid: (scanid: number | undefined) => void;
}

// keep longitudes in [-180, 180] to avoid wrap issues
const toLon180 = (lon?: number) =>
  lon == null ? 0 : ((lon + 540) % 360) - 180;

export function OdinTrack({
  data: series,
  scanid,
  selectedScanid,
  loading,
}: TrackProps) {
  const { parentRef, width, height } = useParentSize();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Build a single projection fitted to the viewport
  const projection = useMemo(() => {
    if (!width || !height) return null;
    return geoNaturalEarth1().fitSize([width, height], world);
  }, [width, height]);

  const path = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection]
  );

  // Reusable styles for dots
  const dotBaseStyle = useMemo(
    () => ({
      transformBox: "fill-box" as const,
      transformOrigin: "center" as const,
      transition: "transform 120ms ease, filter 120ms ease",
      cursor: "pointer",
      outline: "none",
    }),
    []
  );

  return (
    <Box
      ref={parentRef}
      sx={{
        width: "100%",
        height: "100%",
        flex: 1, // let it grow/shrink with parent
        minWidth: 0,
        minHeight: 0, // super important in flex/grids
        overflow: "hidden",
      }}
    >
      <svg
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        // viewBox={`0 0 ${width} ${height}`}
      >
        {/* soft shadow for hover/focus */}
        <defs>
          <filter id="dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.5"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        {width > 10 && projection && path && (
          <g>
            {/* graticule using the same path/projection */}
            <Graticule
              graticule={(g) => path(g) || ""}
              stroke="rgba(33,33,33,0.05)"
            />

            {/* land */}
            {world.features.map((f, i) => (
              <path
                key={`map-feature-${i}`}
                d={path(f) || ""}
                strokeWidth={0.5}
                stroke="black"
                fill="white"
              />
            ))}

            {/* points */}
            {series?.map((v, i) => {
              const p = projection([toLon180(v.lon ?? 0), v.lat ?? 0]);
              if (!p) return null;

              const isSelected = scanid === v.scanid;
              const isHovered = hoveredIdx === i;

              return (
                <circle
                  key={`track-point-${i}`}
                  cx={p[0]}
                  cy={p[1]}
                  r={5}
                  fill={isSelected ? "blue" : "red"}
                  stroke="white"
                  strokeWidth={1}
                  style={{
                    ...dotBaseStyle,
                    transform: isHovered ? "scale(1.4)" : "scale(1)",
                    filter: isHovered ? "url(#dot-shadow)" : "none",
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(i)}
                  onBlur={() => setHoveredIdx(null)}
                  onClick={() => selectedScanid(v.scanid)}
                />
              );
            })}
          </g>
        )}

        {series === undefined && (
          <Text x={width / 2} y={height / 2} textAnchor="middle" fontSize={12}>
            Select an event from the calendar to display a track
          </Text>
        )}
      </svg>
      <Backdrop
        open={loading}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "rgba(0, 0, 0, 0.3)", // semi-transparent gray
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}
