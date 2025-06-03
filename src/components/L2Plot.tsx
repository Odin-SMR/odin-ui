import { Box, useTheme } from "@mui/material";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneY } from "@visx/curve";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { format } from "d3-format";
import type z from "zod";
import type { schemas } from "../odinApi/client";
import { Text } from "@visx/text";

type L2 = z.infer<typeof schemas.L2>;

interface L2PlotProps {
  data: L2;
}

export const L2Plot = ({ data }: L2PlotProps) => {
  const theme = useTheme();
  const background =
    theme.palette.mode == "light"
      ? theme.palette.grey[300]
      : theme.palette.grey[600];
  const { parentRef, width, height } = useParentSize();
  const margin = { top: 30, bottom: 50, left: 40, right: 20 };

  const plotdata = (data.Altitude ?? []).map((v, i) => ({
    altitude: v,
    apriori: (data.Apriori?.[i] ?? NaN) * 1e6,
    vmr: (data.VMR?.[i] ?? NaN) * 1e6,
    err: (data.ErrorTotal?.[i] ?? NaN) * 1e6,
  }));

  const siTickFormat = format("~s");

  const vmrMin = Math.min(...plotdata.map((v) => v.vmr));
  const vmrMax = Math.max(...plotdata.map((v) => v.vmr));
  const aprMin = Math.min(...plotdata.map((v) => v.apriori));
  const aprMax = Math.max(...plotdata.map((v) => v.apriori));
  const xScale = scaleLinear<number>({
    domain: [Math.min(vmrMin, aprMin), Math.max(vmrMax, aprMax)],
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
    <Box ref={parentRef} height="inherit">
      <svg width={width} height={height}>
        <rect width={width} height={height} fill={background} rx={14} />
        <Text x={width / 2} y={margin.top/2} textAnchor="middle" fontSize={12}>
          {data.Product}
        </Text>

        <Text
          x={5}
          y={height / 2}
          angle={-90}
          textAnchor="middle"
          verticalAnchor="middle"
          fontSize={10}
        >
          Altitude (m)
        </Text>

        <Text x={width / 2} y={height - 5} textAnchor="middle" fontSize={12}>
          VMR (ppmv)
        </Text>
        <Group top={margin.top} left={margin.left}>
          <LinePath
            data={plotdata}
            x={(d) => xScale(d.apriori)}
            y={(d) => yScale(d.altitude)}
            stroke="gray"
            curve={curveMonotoneY}
          />
          <LinePath
            data={plotdata}
            x={(d) => xScale(d.vmr)}
            y={(d) => yScale(d.altitude)}
            stroke="black"
            strokeWidth={2}
            curve={curveMonotoneY}
          />
          {plotdata.map((d, i) => {
            const y = yScale(d.altitude);
            const x0 = xScale(d.vmr - d.err);
            const x1 = xScale(d.vmr + d.err);
            return (
              <line
                key={`err-${i}`}
                x1={x0}
                x2={x1}
                y1={y}
                y2={y}
                stroke="black"
                strokeWidth={1}
              />
            );
          })}

          <AxisLeft scale={yScale} tickFormat={siTickFormat} />
          <AxisBottom
            scale={xScale}
            top={height - margin.bottom - margin.top}
            tickFormat={siTickFormat}
            numTicks={5}
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
