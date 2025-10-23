import type {
  EventClickArg,
  EventInput,
  EventSourceInput,
} from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import Grid from "@mui/material/Grid";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient as cloud, schemas } from "../odinApi/cloud_client";
import { L2ProductPlots } from "./L2ProductPlots";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useParams } from "react-router-dom";
import type z from "zod";
import { Track } from "./plots/TrackMap";

const cloud_api = cloud("/api");

const today = dayjs().utc();

interface SelectedEvent {
  freqmode: number;
  day: string;
}

function toCalendarEvents2(cal: FreqModeDaysType): EventSourceInput {
  const events = cal.map<EventInput>((c) => {
    return {
      title: `FM${c.freqmode} • ${c.count} scans`,
      allDay: true,
      start: c.day,
      extendedProps: {
        count: c.count,
        freqmode: c.freqmode,
      },
      color: FREQMODE_COLOURS[c.freqmode] ?? "gray",
    };
  });

  return events;
}
type FreqModeDaysType = z.infer<typeof schemas.FreqModeDays>;
type ScansType = z.infer<typeof schemas.Scans>;

export function L2Calendar() {
  const { year, month } = useParams<{
    year: string;
    month: string;
    day: string;
    fm: string;
  }>();
  const startday = dayjs.utc(
    `${year ? year : today.year()}-${month ? month : today.month() + 1}-01`
  );

  const calref = useRef<FullCalendar>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingEvent, setLoadingEvent] = useState<boolean>(true);
  const [scanid, setScanid] = useState<number>();
  const [scans, setScans] = useState<ScansType>([]);
  const [scanCounts, setScanCounts] = useState<FreqModeDaysType>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>();
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(startday);

  // const handleClick = async () => {
  //   try {
  //     const url =
  //       "https://odin-smr.org/l2/project=ALL-Meso-v3.0.0/freq_mode=13/inv_mode=meso/product=H2O-557GHz-45to100km/year=2018/month=01/43b69ac7672b4c3bb31283d15a042846-0.parquet";
  //     const res = await fetch(url, { method: "GET" });
  //     if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  //     const blob = await res.blob();
  //     console.log("File size (bytes):", blob.size);
  //   } catch {
  //     console.log("error");
  //   }
  // };

  useEffect(() => {
    const date = dayjs.utc(selectedEvent?.day);
    const fm = selectedEvent?.freqmode;
    const fetchData = async () => {
      setLoadingEvent(true);
      setScanid(undefined);
      if (date && fm) {
        try {
          const data = await cloud_api.dayscans_scans_get({
            queries: {
              day: date.format("YYYY-MM-DD"),
              fm: fm,
            },
          });
          if (data.length >= 0) setScans(data);
        } catch {
          // setScans([]);
        }
      }
      setLoadingEvent(false);
    };
    fetchData();
  }, [selectedEvent]);

  useEffect(() => {
    const fetchData = async () => {
      setScanCounts([]);
      setLoading(true);
      try {
        const data = await cloud_api.l2_calendar_calendar_get({
          queries: {
            month: currentMonth.month() + 1,
            year: currentMonth.year(),
          },
        });
        setScanCounts(data);
      } catch {
        setScanCounts([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentMonth]);

  const handleClickedEvent = (event: EventClickArg) => {
    setScanid(undefined);
    event.jsEvent.preventDefault();
    setSelectedEvent({
      day: dayjs(event.event.start).utc(true).format("YYYY-MM-DD"),
      freqmode: event.event.extendedProps.freqmode,
    });
  };

  return (
    <Grid container padding={1} spacing={1} alignItems="stretch">
      <Grid size={{ xs: 12, xl: 6 }}>
        <Paper>
          <Grid
            container
            size={12}
            sx={{ margin: 0, padding: 2 }}
            justifyContent="center"
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                // timezone="UTC"
                sx={{ margin: 2 }}
                views={["year", "month"]}
                label="Select month"
                disabled={loading}
                defaultValue={currentMonth}
                // value={dayjs(new Date(year, month))}
                onAccept={(newVal) => {
                  if (newVal) {
                    const day = newVal.utc().startOf("month");
                    setCurrentMonth(day);
                    const calendarApi = calref.current?.getApi();
                    if (calendarApi) calendarApi.gotoDate(day.toISOString());
                  }
                }}
              />
            </LocalizationProvider>
            <Grid
              container
              sx={{
                position: "relative",
                filter: loading ? "blur(1px)" : "none",
              }}
              aria-busy={loading}
              aria-live="polite"
            >
              <FullCalendar
                ref={calref}
                timeZone="utc"
                plugins={[dayGridPlugin, interactionPlugin]}
                headerToolbar={false}
                initialView="dayGridMonth"
                events={toCalendarEvents2(scanCounts)}
                height="auto"
                initialDate={currentMonth.toDate()}
                dayMaxEvents={6}
                eventClick={(arg) => {
                  handleClickedEvent(arg);
                }}
              />
              <Backdrop
                open={loading}
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: (t) => t.zIndex.modal + 1,
                  // color: "#fff",
                }}
              >
                <CircularProgress color="inherit" />
              </Backdrop>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      <Grid
        size={{ xs: 12, xl: 6 }}
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
          <Track data={scans} scanid={scanid} selectedScanid={setScanid} />
          <Backdrop
            open={loadingEvent}
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: (theme) => theme.zIndex.drawer + 1,
              bgcolor: "rgba(0, 0, 0, 0.3)", // semi-transparent gray
            }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </Paper>
      </Grid>
      <L2ProductPlots
        scanid={scanid ?? 0}
        day={selectedEvent?.day ?? "1976-10-09"}
      />
    </Grid>
  );
}
