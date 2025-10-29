import type {
  EventClickArg,
  EventSourceInput,
} from "@fullcalendar/core/index.js";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient, schemas } from "../odinApi/client";
import { L1ScanInfoPlot } from "./L1ScanInfoPlot";
import { OdinCalendar } from "./OdinCalendar";
import { L1BPlots } from "./plots/L1b";
import { OdinTrack, type TrackType } from "./plots/OdinTrack";

interface FreqmodeDay {
  day: Dayjs;
  FM: number;
}
type ScanInfoType = z.infer<typeof schemas.freqmode_info>;
type LogType = z.infer<typeof schemas.Log>;

const api = createApiClient("/");

function toCalendarEvents(response: ScanInfoType[]): EventSourceInput {
  if (response === undefined) return [];
  return response.map((entry) => ({
    title: `FM${entry.FreqMode} • ${entry.NumScan} scans`,
    start: entry.Date, // assuming ISO date string (YYYY-MM-DD)
    url: entry.URL,
    extendedProps: {
      backend: entry.Backend,
      freqmode: entry.FreqMode,
    },
    color: FREQMODE_COLOURS[entry.FreqMode ?? 0],
  }));
}

export default function CalendarView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingScans, setLoadingScans] = useState<boolean>(true);
  const [scaninfo, setScaninfo] = useState<ScanInfoType[]>([]);
  const [fmDay, setFmDay] = useState<FreqmodeDay>();
  const [log, setLog] = useState<LogType[]>();
  const [scanId, SetScanId] = useState<number>();
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  // const [hoverScanId, SetHoverScanId] = useState<number>();

  useEffect(() => {
    const year = currentMonth.format("YYYY");
    const month = currentMonth.format("MM");
    const day = currentMonth.format("DD");
    const getData = async () => {
      setLoading(true);
      try {
        const data = await api.getRest_apiv5period_infoYearMonthDay({
          params: { day: day, month: month, year: year },
          queries: { length: currentMonth.daysInMonth() },
        });
        setScaninfo(data.Data);
      } catch {
        console.error("error");
      }
      setLoading(false);
    };
    getData();
  }, [currentMonth]);

  useEffect(() => {
    const getData = async () => {
      setLoadingScans(true);
      if (fmDay) {
        try {
          const data = await api.getRest_apiv5freqmode_infoDateFreqmode({
            params: {
              date: fmDay.day.format("YYYY-MM-DD"),
              freqmode: fmDay.FM,
            },
          });
          setLog(data.Data);
        } catch (err) {
          console.error(err);
        }
      }
      setLoadingScans(false);
    };
    getData();
  }, [fmDay]);

  const handleClickedEvent = (event: EventClickArg) => {
    event.jsEvent.preventDefault();
    setFmDay({
      day: dayjs(event.event.start).utc(true),
      FM: event.event.extendedProps.freqmode,
    });
    SetScanId(undefined);
  };

  const toTrack = (input: LogType[]) => {
    const data = input.map((v) => {
      return { lat: v.LatStart, lon: v.LonStart, scanid: v.ScanID };
    });
    return data as TrackType[];
  };

  return (
    <Grid margin={2} spacing={2} container alignItems={"strech"}>
      <Grid size={{ xs: 12, md: 12, xl: 4 }}>
        <Paper>
          <OdinCalendar
            loading={loading}
            events={toCalendarEvents(scaninfo)}
            month={currentMonth}
            setMonth={setCurrentMonth}
            eventClick={handleClickedEvent}
          />
        </Paper>
      </Grid>
      <Grid
        size={{ xs: 12, md: 6, xl: 4 }}
        sx={{
          height: { xs: 420, xl: "auto" }, // fixed height when stacked, flexible when side by side
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <Paper
          sx={{
            position: "relative",
            padding: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <OdinTrack
            data={toTrack(log ?? [])}
            scanid={scanId}
            selectedScanid={SetScanId}
            loading={loadingScans}
          />
        </Paper>
      </Grid>
      <Grid
        size={{ xs: 12, md: 6, xl: 4 }}
        sx={{
          height: { xs: 420, xl: "auto" }, // fixed height when stacked, flexible when side by side
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <Paper
          sx={{
            position: "relative",
            padding: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <L1ScanInfoPlot
            data={log}
            scanid={scanId}
            selectedScanid={SetScanId}
          />
          {/* <FakeSVG/> */}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Paper>
          <L1BPlots scanid={scanId} freqmode={fmDay?.FM} />
        </Paper>
      </Grid>
    </Grid>
  );
}
