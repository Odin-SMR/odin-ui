import { Box } from "@mui/material";
import { Graticule, Mercator } from "@visx/geo";
import { useParentSize } from "@visx/responsive";
import * as topojson from "topojson-client";
import type z from "zod";
import { schemas } from "../../odinApi/client";
import topology from "./world-topo.json";

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
type LogType = z.infer<typeof schemas.Log>;

interface TrackProps {
  data: LogType[] | undefined;
  selectedScanid: (scanid: number | undefined) => void;
}

export function Track({ data: series, selectedScanid }: TrackProps) {
  const { parentRef, width, height } = useParentSize();
  const centerX = width / 2;
  const centerY = height / 2;

  const scale = (height<width)? (height / 630) * 100 : (width/630) *100;

  return (
    <Box ref={parentRef} sx={{ height: "100%", width: "100%" }}>
      <svg width={width} height={height}>
        {width > 10 && (
          <Mercator<FeatureShape>
            data={world.features}
            scale={scale}
            translate={[centerX, centerY + 0]}
          >
            {(mercator) => {
              const track = series?.map((v) =>
                mercator.projection([v.LonStart ?? 0, v.LatStart ?? 0])
              );

              return (
                <g>
                  <Graticule
                    graticule={(g) => mercator.path(g) || ""}
                    stroke="rgba(33,33,33,0.05)"
                  />
                  {mercator.features.map(({ path }, i) => (
                    <path
                      key={`map-feature-${i}`}
                      d={path || ""}
                      strokeWidth={0.5}
                      stroke="black"
                      fill="white"
                    />
                  ))}
                  {track &&
                    track.map((v, i) => (
                      <circle
                        key={`track-point-${i}`}
                        cx={v?.[0]}
                        cy={v?.[1]}
                        r={5}
                        fill="red"
                        stroke="white"
                        strokeWidth={1}
                        onClick={() => {
                          selectedScanid(series?.[i]?.ScanID);
                        }}
                      />
                    ))}
                  {/* <LinePath
                    data={track}
                    x={(d) => d[0]}
                    y={(d) => d[1]}
                    stroke="red"
                    strokeWidth={1.5}
                    // curve={null} // or use `curveLinear`, `curveBasis`, etc.
                  /> */}
                </g>
              );
            }}
          </Mercator>
        )}
      </svg>
    </Box>
  );
}
