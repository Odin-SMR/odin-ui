import MoreVertIcon from "@mui/icons-material/MoreVert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Text } from "@visx/text";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { format } from "d3-format";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../../odinApi/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
interface L1BPlotProps {
  scanid: number | undefined;
  freqmode: number | undefined;
}

interface ToolTipValues {
  x: number;
  y: number;
  alt: number;
  Sza: number;
}

type L1BType = z.infer<typeof schemas.L1b>;
const api = createApiClient("/");
const margin = { top: 10, bottom: 50, left: 40, right: 20 };

export const L1BPlots = ({ freqmode, scanid }: L1BPlotProps) => {
  const theme = useTheme();
  const background =
    theme.palette.mode == "light"
      ? theme.palette.grey[300]
      : theme.palette.grey[600];
  const { parentRef, width, height } = useParentSize({ debounceTime: 150 });
  const [series, setSeries] = useState<L1BType>();
  const [hovered, setHovered] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const siTickFormat = format("~s");
  const mjdStart = dayjs.utc("1858-11-17T00:00:00.0Z");
  const msPerDay = 86400000;
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipOpen,
    tooltipTop = 0,
    tooltipLeft = 0,
  } = useTooltip<ToolTipValues>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  useEffect(() => {
    const getData = async () => {
      if (scanid && freqmode) {
        try {
          const data = await api.getRest_apiv5level1FreqmodeScannoL1b({
            params: { freqmode: freqmode, scanno: scanid },
          });
          setSeries(data.Data);
        } catch (err) {
          console.error(err);
        }
      } else {
        setSeries(undefined);
      }
    };
    getData();
  }, [freqmode, scanid]);

  const freq = series?.Frequency?.IFreqGrid?.map(
    (v) => (v ?? 0) + (series.Frequency?.LOFreq?.[0] ?? 0)
  );
  const index = Array.from({ length: freq?.length ?? 0 }, (_, i) => i);
  const spectra = series?.Spectrum;
  // if (spectra && freq) {
  const yScale = scaleLinear({
    domain: [
      Math.min(...(spectra ?? []).flatMap((v) => v)),
      Math.max(...(spectra ?? []).flatMap((v) => v)),
    ],
    range: [height - margin.bottom - margin.top, 0],
    // range: [height - margin.bottom - 0, 0],
    // nice: true,
  });
  const xScale = scaleLinear({
    domain: [freq?.[0] ?? 0, freq ? freq?.[freq.length - 1] : 0],
    range: [0, width - margin.right - margin.left],
    // nice: true,
  });

  const download = async () => {
    if (series) {
      const jsonString = JSON.stringify(series, null, 2); // pretty-print with indentation
      const blob = new Blob([jsonString], { type: "application/json" });
      // const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${series.ScanID?.[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card>
      <CardHeader
        title={`FM ${series?.FreqMode?.[0] ?? 0} Scanid: ${scanid ?? 0}`}
        subheader={`${mjdStart
          .add((series?.MJD?.[0] ?? 0) * msPerDay, "ms")
          .toISOString()}`}
        action={
          <IconButton
            aria-controls="menu"
            aria-haspopup="true"
            onClick={handleOpen}
          >
            <MoreVertIcon />
          </IconButton>
        }
      ></CardHeader>
      <Menu
        id="menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={download}>Download as json</MenuItem>
      </Menu>
      <CardContent ref={parentRef} sx={{ height: "420px", width: "100%" }}>
        <svg ref={containerRef} width="100%" height="100%">
          <rect width={width} height={height} fill={background} rx={14} />

          <Text
            x={10}
            y={height / 2}
            angle={-90}
            textAnchor="middle"
            verticalAnchor="middle"
            fontSize={10}
          >
            Brightness Temp. (K)
          </Text>

          <Text x={width / 2} y={height - 5} textAnchor="middle" fontSize={12}>
            Frequency (Hz)
          </Text>
          <Group top={margin.top} left={margin.left}>
            {scanid &&
              spectra &&
              freqmode &&
              spectra.map((spectrum, idx) => (
                <LinePath
                  key={idx}
                  data={index}
                  x={(d) => xScale(freq?.[d] ?? 0)}
                  y={(d) => yScale(spectrum[d])}
                  stroke="black"
                  strokeWidth={hovered === idx ? 3 : 0.5}
                  onMouseMove={(
                    event: React.MouseEvent<SVGLineElement, MouseEvent>
                  ) => {
                    const point = localPoint(event) ?? { x: 0, y: 0 };
                    setHovered(idx);
                    showTooltip({
                      tooltipLeft: point.x,
                      tooltipTop: point.y,
                      tooltipData: {
                        Sza: series.SunZD?.[idx] ?? 0,
                        alt: series.Altitude?.[idx] ?? 0,
                        x: point.x - margin.left,
                        y: point.y - margin.top,
                      },
                    });
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    hideTooltip();
                  }}
                />
              ))}
            <AxisLeft scale={yScale} />
            <AxisBottom
              top={height - margin.top - margin.bottom}
              scale={xScale}
              tickFormat={siTickFormat}
              tickLabelProps={() => ({
                // angle: -45,
                textAnchor: "end",
                dy: "0.25em",
                fontSize: 11,
              })}
            />
          </Group>
        </svg>
        {tooltipOpen && tooltipData && (
          <TooltipInPortal
            key={Math.random()}
            top={tooltipTop}
            left={tooltipLeft}
            style={{
              position: "absolute", // ensure it's layered
              backgroundColor: "rgba(0,0,0,0.85)",
              color: "white",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <div>
              {/* {format(".5s")(xScale.invert(tooltipData.x)).toString() + "Hz"}
              <br />
              {format(".3s")(yScale.invert(tooltipData.y)).toString() + "K"}
              <br /> */}
              Tangent alt.: {format(".3s")(tooltipData.alt).toString() + "m"}
              <br />
              SZA:{format(".3s")(tooltipData.Sza).toString() + "deg"}
              <br />
            </div>
          </TooltipInPortal>
        )}
      </CardContent>
    </Card>
  );
};
