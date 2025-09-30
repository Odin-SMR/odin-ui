import type {
  EventClickArg,
  EventInput,
  EventSourceInput,
} from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import Grid from "@mui/material/Grid";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient as cloud, schemas } from "../odinApi/cloud_client";
import { L2ProductPlots } from "./L2ProductPlots";

// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type z from "zod";
import Box from "@mui/material/Box";
import { Track } from "./plots/TrackMap";

const cloud_api = cloud("/api");

const today = dayjs().utc().subtract(7, "week");

interface SelectedEvent {
  project: string;
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
        project: "all",
      },
      color: FREQMODE_COLOURS[c.freqmode] ?? "gray",
    };
  });

  return events;
}
type FreqModeDaysType = z.infer<typeof schemas.FreqModeDays>;
type ScansType = z.infer<typeof schemas.Scans>;

export function L2Calendar() {
  const [scanid, setScanid] = useState<number>();
  const [scans, setScans] = useState<ScansType>([]);
  const [scanCounts, setScanCounts] = useState<FreqModeDaysType>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>();
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(
    dayjs.utc().startOf("month")
  );

  useEffect(() => {
    const fetchData = async () => {
      const day = selectedEvent?.day;
      const fm = selectedEvent?.freqmode;
      if (day && fm) {
        console.log("params", day, fm);
        try {
          const data = await cloud_api.dayscans_scans_get({
            queries: {
              day: day,
              fm: fm,
            },
          });
          if (data.length >= 0) setScans(data);
        } catch {
          // setScans([]);
        }
      }
    };
    fetchData();
  }, [selectedEvent]);

  useEffect(() => {
    console.log(scans);
  }, [scans]);
  useEffect(() => {
    const fetchData = async () => {
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
    };
    fetchData();
  }, [currentMonth]);

  const handleClickedEvent = (event: EventClickArg) => {
    event.jsEvent.preventDefault();
    setSelectedEvent({
      day: dayjs(event.event.start).utc(true).format("YYYY-MM-DD"),
      freqmode: event.event.extendedProps.freqmode,
      project: "all",
    });
  };

  return (
    <Grid margin={2} spacing={2} container>
      <Grid size={{xs:12, xl:6 }}>
        {/* <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            views={["year", "month"]}
            label="Pick month"
            // value={dayjs(new Date(year, month))}
            // onChange={(newVal) => {
            //   if (newVal) gotoDate(newVal.year(), newVal.month());
            // }}
          />
        </LocalizationProvider> */}
        <Box
          sx={{
            "& .fc-event": {
              cursor: "pointer",
              borderRadius: 1,
              transition: "transform 120ms ease, box-shadow 120ms ease",
            },
            "& .fc-event:hover": {
              transform: "scale(1.03)",
              boxShadow: 6, // uses MUI shadow scale
            },
          }}
        >
          <FullCalendar
            timeZone="utc"
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={toCalendarEvents2(scanCounts)}
            height="auto"
            initialDate={today.toDate()}
            datesSet={(arg) => {
              setCurrentMonth(dayjs(arg.view.currentStart));
              console.log(
                dayjs(arg.view.currentStart).toISOString(),
                currentMonth.toISOString()
              );
            }}
            dayMaxEvents={6} // show "+1 more" if > 6
            eventClick={(arg) => {
              handleClickedEvent(arg);
            }}
          />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 3 }} sx={{ height: "585px" }}>
        <Track data={scans} scanid={scanid} selectedScanid={setScanid} />
      </Grid>
      {/* <Grid size={12}> */}
        <L2ProductPlots scanid={scanid ?? 0} day={selectedEvent?.day ?? "1976-10-09"} />
      {/* </Grid> */}
    </Grid>
  );
}
