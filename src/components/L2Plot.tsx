import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneY } from "@visx/curve";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Text } from "@visx/text";
import { format } from "d3-format";
import type z from "zod";
import type { schemas } from "../odinApi/cloud_client";

type L2 = z.infer<typeof schemas.Product>;

interface L2PlotProps {
  data: L2;
}

export const L2Plot = ({ data }: L2PlotProps) => {
  const theme = useTheme();
  const { parentRef, width, height } = useParentSize();
  const margin = { top: 30, bottom: 50, left: 40, right: 20 };

  const plotdata = (data.data.alt ?? []).map((v, i) => ({
    altitude: v,
    vmr: (data.data.vmr?.[i] ?? NaN) * 1e6,
    measresp: data.data.meas_resp[i],
  }));

  const siTickFormat = format("~s");

  const vmrMin = Math.min(...plotdata.map((v) => v.vmr));
  const vmrMax = Math.max(...plotdata.map((v) => v.vmr));
  const xScale = scaleLinear<number>({
    domain: [vmrMin, vmrMax],
    range: [0, width - margin.right - margin.left],
    nice: true,
  });

  const altMin = Math.min(...plotdata.map((v) => v.altitude));
  const altMax = Math.max(...plotdata.map((v) => v.altitude));
  const yScale = scaleLinear<number>({
    domain: [altMax, altMin],
    range: [0, height - margin.bottom - margin.top],
    nice: true,
  });

  return (
    <Box
      ref={parentRef}
      sx={{
        flex: 1, // let it grow/shrink with parent
        height:"100%",
         width: "100%",
        minWidth: 0,
        minHeight: 0, // super important in flex/grids
        overflow: "hidden",
      }}
    >
      <svg width={width} height={height}>
        <rect
          width={width}
          height={height}
          fill={theme.palette.background.paper}
          rx={14}
          style={{ display: "block" }}
        />
        <Text
          x={width / 2}
          y={margin.top / 2}
          textAnchor="middle"
          fontSize={12}
          fill={theme.palette.primary.dark}
        >
          {data.name}
        </Text>

        <Text
          x={5}
          y={height / 2}
          angle={-90}
          textAnchor="middle"
          verticalAnchor="middle"
          fontSize={10}
          fill={theme.palette.primary.dark}
        >
          Altitude (m)
        </Text>

        <Text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize={12}
          fill={theme.palette.primary.dark}
        >
          VMR (ppmv)
        </Text>
        <Group top={margin.top} left={margin.left}>
          <LinePath
            data={plotdata}
            x={(d) => xScale(d.vmr)}
            y={(d) => yScale(d.altitude)}
            stroke={theme.palette.primary.main}
            strokeWidth={1}
            curve={curveMonotoneY}
          />

          <AxisLeft
            scale={yScale}
            tickFormat={siTickFormat}
            tickStroke={theme.palette.primary.dark}
            stroke={theme.palette.primary.dark}
            tickLabelProps={() => ({
              fill: theme.palette.primary.dark,
              textAnchor: "end",
              fontSize: 11,
              dx: "-0.25em",
            })}
          />
          <AxisBottom
            scale={xScale}
            top={height - margin.bottom - margin.top}
            tickFormat={siTickFormat}
            numTicks={5}
            tickStroke={theme.palette.primary.dark}
            tickLabelProps={() => ({
              angle: -45,
              textAnchor: "end",
              dy: "0.25em",
              fontSize: 11,
              fill: theme.palette.primary.dark,
            })}
            stroke={theme.palette.primary.dark}
          />
          {/* <LinePath
            data={plotdata.filter((p) => p.measresp > 0.8)}
            x={(d) => xScale(d.vmr)}
            y={(d) => yScale(d.altitude)}
            stroke="black"
            strokeWidth={4}
            // curve={curveMonotoneY}
          /> */}
          {plotdata.map((v, i) => {
            return (
              <g key={`response-${i}`}>
                <circle
                  cx={xScale(v.vmr)}
                  cy={yScale(v.altitude)}
                  r={5}
                  fill={
                    v.measresp > 0.8
                      ? theme.palette.info.main
                      : theme.palette.error.main
                  }
                  stroke={theme.palette.primary.dark}
                />
              </g>
            );
          })}
        </Group>
      </svg>
    </Box>
  );
};
