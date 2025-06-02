import type {
  EventClickArg,
  EventSourceInput,
} from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import Grid from "@mui/material/Grid";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient, schemas } from "../odinApi/client";
import { L1ScanInfoPlot } from "./L1ScanInfoPlot";
import { L1BPlots } from "./plots/L1b";
import { Track } from "./plots/SatelliteTrackMap";

interface DatasetRange {
  start: Dayjs;
  days: number;
}
interface FreqmodeDay {
  day: Dayjs;
  FM: number;
}
type ScanInfoType = z.infer<typeof schemas.freqmode_info>;
type LogType = z.infer<typeof schemas.Log>;

const api = createApiClient("https://odin-smr.org/");
const breakpoints = { xs: 12, sm: 6, md: 4, lg: 3, xl: 3 };

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

const today = dayjs().subtract(1, "month");

export default function CalendarView() {
  const [range, setRange] = useState<DatasetRange>({ start: today, days: 10 });
  const [scaninfo, setScaninfo] = useState<ScanInfoType[]>([]);
  const [fmDay, setFmDay] = useState<FreqmodeDay>();
  const [log, setLog] = useState<LogType[]>();
  const [scanId, SetScanId] = useState<number>();
  // const [hoverScanId, SetHoverScanId] = useState<number>();

  useEffect(() => {
    const year = range.start.format("YYYY");
    const month = range.start.format("MM");
    const day = range.start.format("DD");
    const getData = async () => {
      try {
        const data = await api.getRest_apiv5period_infoYearMonthDay({
          params: { day: day, month: month, year: year },
          queries: { length: range.days },
        });
        setScaninfo(data.Data);
      } catch {
        console.error("error");
      }
    };
    getData();
  }, [range]);

  useEffect(() => {
    const getData = async () => {
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
    };
    getData();
  }, [fmDay]);
  const events = toCalendarEvents(scaninfo);

  const handleUpdateDate = (date: Dayjs) => {
    const start = date.subtract(-6, "days");
    const numDays = date.daysInMonth() + 12;
    setRange({ start: start.utc(true), days: numDays });
  };

  const handleClickedEvent = (event: EventClickArg) => {
    event.jsEvent.preventDefault();
    setFmDay({
      day: dayjs(event.event.start).utc(true),
      FM: event.event.extendedProps.freqmode,
    });
    SetScanId(undefined);
  };

  return (
    <Grid margin={2} spacing={2} container>
      <Grid size={breakpoints}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          initialDate={today.toDate()}
          datesSet={(arg) => handleUpdateDate(dayjs(arg.start))}
          dayMaxEvents={6} // show "+1 more" if > 6
          eventClick={(arg) => {
            handleClickedEvent(arg);
          }}
        />
      </Grid>
      <Grid size={breakpoints} sx={{ height: "585px" }}>
        <Track data={log} selectedScanid={SetScanId} />
      </Grid>
      <Grid size={breakpoints} height={"40vh"}>
        <L1ScanInfoPlot data={log} selectedScanid={SetScanId} />
      </Grid>
      <Grid size={breakpoints} height={"40vh"}>
        <L1BPlots scanid={scanId} freqmode={fmDay?.FM} />
      </Grid>
    </Grid>
  );
}
