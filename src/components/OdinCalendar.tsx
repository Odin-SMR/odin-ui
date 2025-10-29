import type {
  EventClickArg,
  EventSourceInput,
} from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRef } from "react";

dayjs.extend(utc);

interface OdinCalendarProps {
  loading: boolean;
  events: EventSourceInput;
  eventClick: (event: EventClickArg) => void;
  month: Dayjs;
  setMonth: (month: Dayjs) => void;
}

export function OdinCalendar({
  loading,
  events,
  month,
  setMonth,
  eventClick,
}: OdinCalendarProps) {
  const calref = useRef<FullCalendar>(null);

  return (
    <Grid
      container
      size={12}
      sx={{ margin: 0, padding: 2 }}
      justifyContent="center"
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          timezone="UTC"
          sx={{ margin: 2 }}
          views={["year", "month"]}
          label="Select month"
          disabled={loading}
          defaultValue={month}
          // value={dayjs(new Date(year, month))}
          onAccept={(newVal) => {
            if (newVal) {
              const day = newVal.startOf("month");
              setMonth(day);
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
          events={events}
          height="auto"
          initialDate={month.toDate()}
          dayMaxEvents={6}
          eventClick={eventClick}
          fixedWeekCount={false}
        />
        <Backdrop
          open={loading}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: (t) => t.zIndex.modal + 1,
          }}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Grid>
    </Grid>
  );
}
