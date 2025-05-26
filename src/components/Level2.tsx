import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { Box } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { useLevel1, type L1Response } from "../hooks/Level1";
import { FREQMODE_COLOURS } from "../definitions";
import type { EventClickArg } from "@fullcalendar/core/index.js";
import { useL1FreqmodeInfo } from "../hooks/Level1FreqModeInfo";

interface DatasetRange {
  start: Dayjs;
  days: number;
}

function toCalendarEvents(response: L1Response | undefined) {
  if (response === undefined) return [];
  return response.Data.map((entry) => ({
    title: `FM${entry.FreqMode} • ${entry.NumScan} scans`,
    start: entry.Date, // assuming ISO date string (YYYY-MM-DD)
    url: entry.URL,
    extendedProps: {
      backend: entry.Backend,
    },
    color: FREQMODE_COLOURS[entry.FreqMode],
  }));
}

const today = dayjs().subtract(1, "month");

export default function CalendarView() {
  const [range, setRange] = useState<DatasetRange>({ start: today, days: 10 });
  const [url, setUrl] = useState<string>();
  const { series } = useLevel1(range?.start, range?.days);
  const { series: data } = useL1FreqmodeInfo(url);
  const events = toCalendarEvents(series);

  const handleUpdateDate = (date: Dayjs) => {
    const start = date.subtract(-6, "days");
    const numDays = date.daysInMonth() + 12;
    setRange({ start: start, days: numDays });
  };

  const handleClickedEvent = (event: EventClickArg) => {
    event.jsEvent.preventDefault();
    console.log(event.event.extendedProps);
    setUrl(event.event.url);
  };

  useEffect(()=>{console.log(data)},[data])
  return (
    <Box sx={{ padding: 2 }}>
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
    </Box>
  );
}
