import FullCalendar, { type EventClickInfo, type EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { Box, Button, IconButton, LinearProgress, Stack, TextField, Typography, getContrastRatio, useMediaQuery, useTheme } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useMemo, useState, type CSSProperties } from "react";

dayjs.extend(utc);

export interface ObservationEvent {
  id?: string;
  start: string;
  title: string;
  color?: string;
  extendedProps?: Record<string, unknown>;
}

interface OdinCalendarProps {
  loading: boolean;
  events: ObservationEvent[];
  eventClick?: (event: EventClickInfo) => void;
  onSelect?: (event: ObservationEvent) => void;
  month: Dayjs;
  setMonth: (month: Dayjs) => void;
  selectedId?: string;
  minDate?: string;
  maxDate?: string;
  unavailable?: boolean;
}

/** Small screens use the same observations as the calendar in a touch/keyboard list. */
export function OdinCalendar({ loading, events, month, setMonth, eventClick, onSelect, selectedId, minDate, maxDate, unavailable = false }: OdinCalendarProps) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [list, setList] = useState(false);
  const [filter, setFilter] = useState("");
  const entries = useMemo(() => [...events].sort((a, b) => a.start.localeCompare(b.start)), [events]);
  const filtered = entries.filter((event) => `${event.start} ${event.title}`.toLowerCase().includes(filter.toLowerCase()));
  const calendarEvents: EventInput[] = useMemo(() => entries.map((event, index) => ({ ...event, id: event.id ?? String(index), allDay: true,
    contrastColor: event.color ? getContrastRatio("#ffffff", event.color) >= 4.5 ? "#ffffff" : "#000000" : undefined })), [entries]);
  const changeMonth = (next: Dayjs) => { if (next.isValid() && (!minDate || next.format("YYYY-MM") >= minDate.slice(0, 7)) && (!maxDate || next.format("YYYY-MM") <= maxDate.slice(0, 7))) { setFilter(""); setMonth(next.utc().startOf("month")); } };

  return <Stack spacing={2} data-color-scheme={theme.palette.mode} sx={{ p: 2, minWidth: 0 }} style={{
    "--fc-classic-background": theme.palette.background.paper, "--fc-classic-foreground": theme.palette.text.primary,
    "--fc-classic-muted-foreground": theme.palette.text.secondary, "--fc-classic-border": theme.palette.divider,
    "--fc-classic-primary": theme.palette.primary.main } as CSSProperties} aria-busy={loading}>
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <IconButton aria-label="Previous month" disabled={!!minDate && month.format("YYYY-MM") <= minDate.slice(0, 7)} onClick={() => changeMonth(month.subtract(1, "month"))}><ChevronLeft /></IconButton>
      <TextField label="Observation month (UTC)" type="month" size="small" value={month.format("YYYY-MM")} fullWidth
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate?.slice(0, 7), max: maxDate?.slice(0, 7) } }} onChange={(event) => changeMonth(dayjs.utc(`${event.target.value}-01`))} />
      <IconButton aria-label="Next month" disabled={!!maxDate && month.format("YYYY-MM") >= maxDate.slice(0, 7)} onClick={() => changeMonth(month.add(1, "month"))}><ChevronRight /></IconButton>
    </Stack>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">UTC day · frequency mode · stored scans</Typography>
      {!phone && <Button size="small" onClick={() => setList(!list)} aria-pressed={list}>{list ? "Calendar" : "List view"}</Button>}
    </Stack>
    {loading && <Box role="status"><LinearProgress /><Typography variant="body2" sx={{ mt: 1 }}>Loading observations…</Typography></Box>}
    {(phone || list) ? <>
      <TextField label="Find a day or frequency mode" size="small" value={filter} onChange={(event) => setFilter(event.target.value)} />
      <Box role="region" aria-label="Observation days and frequency modes" tabIndex={0} sx={{ maxHeight: 460, overflowY: "auto" }}>
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {!loading && filtered.map((event, index) => <Box component="li" key={event.id ?? `${event.start}-${index}`}>
            <Button fullWidth variant={selectedId === event.id ? "contained" : "outlined"} onClick={() => onSelect?.(event)}
              sx={{ justifyContent: "flex-start", textAlign: "left", gap: 1.5, py: 1, color: selectedId === event.id ? undefined : "text.primary" }}>
              <Box component="span" sx={{ width: 4, alignSelf: "stretch", bgcolor: event.color ?? "text.secondary", borderRadius: 1 }} />
              <Box component="span"><Typography component="span" variant="body2" sx={{ display: "block" }}>{dayjs.utc(event.start).format("D MMM YYYY")}</Typography>
                <Typography component="span" variant="body2" sx={{ display: "block", overflowWrap: "anywhere" }}>{event.title}</Typography></Box>
            </Button>
          </Box>)}
        </Stack>
        {!loading && !unavailable && !filtered.length && <Typography sx={{ py: 2 }} color="text.secondary" role="status">{events.length ? "No observations match your search." : "No observation records are stored for this month. Choose another month."}</Typography>}
      </Box>
    </> : <Box sx={{ minWidth: 0, opacity: loading ? 0.5 : 1, pointerEvents: loading ? "none" : "auto", "& .fc": { fontSize: 12 }, "& .fc-event": { cursor: "pointer", minHeight: 28 }, "& .fc-daygrid-event": { whiteSpace: "normal" }, "& .fc-event-title": { whiteSpace: "normal", overflowWrap: "anywhere" } }}>
      <FullCalendar key={month.format("YYYY-MM")} plugins={[themePlugin, dayGridPlugin, interactionPlugin]} timeZone="UTC" initialView="dayGridMonth"
        initialDate={month.format("YYYY-MM-01")} events={calendarEvents} height="auto" fixedWeekCount={false} firstDay={1} dayMaxEvents={4}
        eventClick={(event) => {
          event.jsEvent.preventDefault();
          if (onSelect) { const entry = entries.find((entry, index) => (entry.id ?? String(index)) === event.event.id); if (entry) onSelect(entry); }
          else eventClick?.(event);
        }} />
      {!loading && !unavailable && !events.length && <Typography variant="body2" sx={{ mt: 2 }} role="status">No observation records are stored for this month. Choose another month.</Typography>}
    </Box>}
  </Stack>;
}
