import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { BarStack } from "@visx/shape";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { useState } from "react";
import {
  FREQMODE_COLOURS,
  FREQMODE_INFO_TEXT,
  FREQMODES,
} from "../definitions";
import {
  useFrequencyModeData,
  type TotalResponse,
  type YearResponse,
} from "../hooks/Level1Stats";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";

export type GroupedRow = {
  group: number; // month/year
} & Record<string, number>;

type Props = {
  year: number | null;
  level2: GroupedRow[];
};

function isTotalResponse(
  data: TotalResponse | YearResponse
): data is TotalResponse {
  return "Years" in data;
}

function transformData(
  data: TotalResponse | YearResponse
): { group: number; [key: string]: number }[] {
  if (isTotalResponse(data)) {
    const years = data.Years;
    const result = years.map((year) => {
      const row: { group: number; [key: string]: number } = { group: year };
      for (const key in data.Data) {
        const pair = data.Data[key].find(([y]) => y === year);
        row[key] = pair?.[1] ?? 0;
      }
      return row;
    });
    return result;
  } else {
    const months = data.Months;
    const result = months.map((month) => {
      const row: { group: number; [key: string]: number } = { group: month };
      for (const key in data.Data) {
        const pair = data.Data[key].find(([y]) => y === month);
        row[key] = pair?.[1] ?? 0;
      }
      return row;
    });
    return result;
  }
}

function getKeys(data: TotalResponse | YearResponse): number[] {
  if (isTotalResponse(data)) {
    return data.Years;
  } else {
    return data.Months;
  }
}

export default function StackedBarPlotCompare({ year, level2 }: Props) {
  const theme = useTheme();
  const { parentRef, width, height } = useParentSize();
  const [hovered, setHovered] = useState<{ group: number; key: string } | null>(
    null
  );
  const { series: data } = useFrequencyModeData(year);

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  const margin = { top: 20, bottom: 40, left: 60, right: 20 };
  const background =
    theme.palette.mode == "light"
      ? theme.palette.grey[300]
      : theme.palette.grey[600];
  const stroke =
    theme.palette.mode == "light"
      ? theme.palette.grey[600]
      : theme.palette.grey[300];

  const rows = transformData(data);
  const keys = Object.keys(rows[0]).filter((r) => r !== "group");

  const getCount = (fm: string) => {
    return (group: number) => {
      const picked = data.Data[fm]?.find((v) => {
        return v[0] === group;
      });
      return picked ? picked[1] : 0;
    };
  };

  const xScale = scaleBand<number>({
    domain: getKeys(data),
    padding: 0.2,
    range: [0, width - margin.left - margin.right],
  });

  const maxCount = Math.max(
    ...getKeys(data).map((group) =>
      keys.reduce((sum, fm) => sum + getCount(fm)(group), 0)
    )
  );

  const yScale = scaleLinear<number>({
    domain: [0, maxCount],
    nice: true,
    range: [height - margin.top - margin.bottom, 0],
  });

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<{
      key: string;
      group: number;
      valueL1: number;
      valueL2: number;
      ratio: number | null;
      freq: string;
      spec: string;
    }>();

  return (
    <Box
      ref={parentRef}
      sx={{ height: "100%", width: "100%", position: "relative" }}
    >
      <svg ref={containerRef} width={width} height={height}>
        <rect fill={background} width={width} height={height} rx={5} />
        {height > margin.top + margin.bottom && (
          <Group top={margin.top} left={margin.left}>
            <BarStack<GroupedRow, string>
              data={rows}
              keys={keys}
              x={(d) => d.group}
              xScale={xScale}
              yScale={yScale}
              color={(key) => FREQMODE_COLOURS[key]}
            >
              {(barStacks) =>
                barStacks.map((barStack) =>
                  barStack.bars.map((bar) => {
                    const datum = bar.bar.data; // typed as GroupedRow
                    const group = datum.group;

                    return (
                      <rect
                        key={`${barStack.key}-${bar.index}`}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width / 2}
                        height={bar.height}
                        fill={bar.color}
                        stroke="white"
                        strokeWidth={
                          hovered &&
                          hovered.group === group &&
                          hovered.key === bar.key
                            ? 3
                            : 1
                        }
                        onMouseMove={(
                          event: React.MouseEvent<SVGRectElement, MouseEvent>
                        ) => {
                          const datum = bar.bar.data; // GroupedRow
                          const group = datum.group;
                          const key = bar.key;

                          // Look up counts from both datasets
                          const l1Datum = rows.find((d) => d.group === group);
                          const l2Datum = level2.find((d) => d.group === group);

                          const valueL1 = l1Datum?.[key] ?? 0;
                          const valueL2 = l2Datum?.[key] ?? 0;

                          const ratio = valueL1 > 0 ? valueL2 / valueL1 : null;

                          const point = localPoint(event) ?? { x: 0, y: 0 };

                          setHovered({ group, key });

                          showTooltip({
                            tooltipLeft: point.x,
                            tooltipTop: point.y,
                            tooltipData: {
                              key,
                              group,
                              valueL1,
                              valueL2,
                              ratio,
                              freq: FREQMODE_INFO_TEXT[+key][0],
                              spec: FREQMODE_INFO_TEXT[+key][1],
                            },
                          });
                        }}
                        onMouseLeave={() => {
                          setHovered(null);
                          hideTooltip();
                        }}
                      />
                    );
                  })
                )
              }
            </BarStack>
            <BarStack<GroupedRow, string>
              data={level2}
              keys={FREQMODES.map(String)}
              x={(d) => d.group}
              xScale={xScale}
              yScale={yScale}
              color={(key) => FREQMODE_COLOURS[key]}
            >
              {(barStacks) =>
                barStacks.map((barStack) =>
                  barStack.bars.map((bar) => {
                    const datum = bar.bar.data;
                    const group = datum.group;

                    return (
                      <rect
                        key={`${barStack.key}-${bar.index}`}
                        x={bar.x + bar.width / 2}
                        y={bar.y}
                        width={bar.width / 2}
                        height={bar.height}
                        fill={bar.color}
                        stroke="white"
                        strokeWidth={
                          hovered &&
                          hovered.group === group &&
                          hovered.key === bar.key
                            ? 3
                            : 1
                        }
                        onMouseMove={(
                          event: React.MouseEvent<SVGRectElement, MouseEvent>
                        ) => {
                          const datum = bar.bar.data; // GroupedRow
                          const group = datum.group;
                          const key = bar.key;

                          const l1Datum = rows.find((d) => d.group === group);
                          const l2Datum = level2.find((d) => d.group === group);

                          const valueL1 = l1Datum?.[key] ?? 0;
                          const valueL2 = l2Datum?.[key] ?? 0;

                          const ratio = valueL1 > 0 ? valueL2 / valueL1 : null;

                          const point = localPoint(event) ?? { x: 0, y: 0 };

                          setHovered({ group, key });

                          showTooltip({
                            tooltipLeft: point.x,
                            tooltipTop: point.y,
                            tooltipData: {
                              key,
                              group,
                              valueL1,
                              valueL2,
                              ratio,
                              freq: FREQMODE_INFO_TEXT[+key][0],
                              spec: FREQMODE_INFO_TEXT[+key][1],
                            },
                          });
                        }}
                        onMouseLeave={() => {
                          setHovered(null);
                          hideTooltip();
                        }}
                      />
                    );
                  })
                )
              }
            </BarStack>
          </Group>
        )}
        <AxisBottom
          scale={xScale}
          top={height - margin.bottom}
          left={margin.left}
          stroke={stroke}
          tickStroke={stroke}
          tickLabelProps={{
            fill: stroke,
          }}
        />
        <AxisLeft
          stroke={stroke}
          tickStroke={stroke}
          tickLabelProps={{
            fill: stroke,
          }}
          scale={yScale}
          top={margin.top}
          left={margin.left}
        />
      </svg>
      {tooltipData && (
        <TooltipInPortal
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
        >
          <div>
            <strong>Month:</strong> {tooltipData.group}
            <br />
            <strong>FreqMode:</strong> {tooltipData.key}
            <br />
            <strong>L1 count:</strong> {tooltipData.valueL1}
            <br />
            <strong>L2 count:</strong> {tooltipData.valueL2}
            <br />
            <strong>L1 / L2:</strong>{" "}
            {tooltipData.ratio !== null
              ? `${(tooltipData.ratio * 100).toFixed(1)} %`
              : "—"}
            <br />
            <strong>Range:</strong> {tooltipData.freq}
            <br />
            <strong>Species:</strong> {tooltipData.spec}
          </div>
        </TooltipInPortal>
      )}
    </Box>
  );
}
