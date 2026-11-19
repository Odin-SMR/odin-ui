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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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

const parseMonth = (value: string) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return undefined;
  const [year, month] = value.split("-").map(Number);
  if (year < 1) return undefined;
  // Setting the year explicitly also preserves years 0001–0099: Date's string
  // parser otherwise interprets some of those as twentieth-century years.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, 1);
  date.setUTCHours(0, 0, 0, 0);
  return dayjs.utc(date);
};

/** Small screens use the same observations as the calendar in a touch/keyboard list. */
export function OdinCalendar({ loading, events, month, setMonth, eventClick, onSelect, selectedId, minDate, maxDate, unavailable = false }: OdinCalendarProps) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [list, setList] = useState(false);
  const [filter, setFilter] = useState("");
  const monthKey = month.format("YYYY-MM");
  const monthEditKey = `${monthKey}/${selectedId ?? ""}`;
  const [monthDraft, setMonthDraft] = useState(monthKey);
  const [nativeMonth, setNativeMonth] = useState(true);
  const [monthSubmitted, setMonthSubmitted] = useState(false);
  const monthEdited = useRef<string | undefined>(undefined);
  const monthInputRef = useCallback((input: HTMLInputElement | null) => {
    if (input) setNativeMonth(input.type === "month");
  }, []);
  useEffect(() => {
    setMonthDraft(monthKey);
    setMonthSubmitted(false);
    monthEdited.current = undefined;
  }, [monthKey, selectedId]);
  const entries = useMemo(() => [...events].sort((a, b) => a.start.localeCompare(b.start)), [events]);
  const filtered = entries.filter((event) => `${event.start} ${event.title}`.toLowerCase().includes(filter.toLowerCase()));
  const calendarEvents: EventInput[] = useMemo(() => entries.map((event, index) => ({ ...event, id: event.id ?? String(index), allDay: true,
    contrastColor: event.color ? getContrastRatio("#ffffff", event.color) >= 4.5 ? "#ffffff" : "#000000" : undefined })), [entries]);
  const monthError = (value: string) => {
    if (!parseMonth(value)) return "Enter a valid month as YYYY-MM (01–12).";
    if (minDate && value < minDate.slice(0, 7)) return `Choose ${minDate.slice(0, 7)} or a later month.`;
    if (maxDate && value > maxDate.slice(0, 7)) return `Choose ${maxDate.slice(0, 7)} or an earlier month.`;
    return undefined;
  };
  const changeMonth = (next: Dayjs) => {
    const value = next.utc().format("YYYY-MM");
    if (!next.isValid() || monthError(value)) return;
    setFilter("");
    setMonthSubmitted(false);
    monthEdited.current = undefined;
    // The parent may decline a month with no coverage. Keep its committed value
    // unless it supplies a new month; a valid draft alone is not a selection.
    setMonthDraft(monthKey);
    if (value !== monthKey) setMonth(next.utc().date(1).startOf("day"));
  };
  const submitMonth = (value: string) => {
    const next = parseMonth(value);
    if (!next || monthError(value)) { setMonthSubmitted(true); return; }
    changeMonth(next);
  };
  const error = monthSubmitted ? monthError(monthDraft) : undefined;

  return <Stack spacing={2} data-color-scheme={theme.palette.mode} sx={{ p: 2, minWidth: 0 }} style={{
    "--fc-classic-background": theme.palette.background.paper, "--fc-classic-foreground": theme.palette.text.primary,
    "--fc-classic-muted-foreground": theme.palette.text.secondary, "--fc-classic-border": theme.palette.divider,
    "--fc-classic-primary": theme.palette.primary.main } as CSSProperties} aria-busy={loading}>
    <Box sx={{ display: "grid", gap: 1, alignItems: "start", gridTemplateColumns: nativeMonth ? "auto minmax(0, 1fr) auto" : { xs: "1fr 1fr", sm: "auto minmax(0, 1fr) auto" } }}>
      <IconButton aria-label="Previous month" disabled={monthKey <= (minDate?.slice(0, 7) ?? "0001-01")} onClick={() => changeMonth(month.subtract(1, "month"))}
        sx={{ gridArea: nativeMonth ? "1 / 1" : { xs: "2 / 1", sm: "1 / 1" }, justifySelf: "start", mt: nativeMonth ? "4px" : { xs: 0, sm: "4px" } }}><ChevronLeft /></IconButton>
      <TextField label="Observation month (UTC)" type="month" size="small" value={monthDraft} fullWidth inputRef={monthInputRef}
        sx={{ gridRow: 1, gridColumn: nativeMonth ? "2" : { xs: "1 / -1", sm: "2" } }}
        error={!!error} helperText={error ?? (!nativeMonth ? "Enter YYYY-MM (for example 2016-02), then press Enter or Tab." : undefined)}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate?.slice(0, 7), max: maxDate?.slice(0, 7), placeholder: "YYYY-MM" } }}
        onChange={(event) => {
          const value = event.target.value;
          monthEdited.current = monthEditKey;
          setMonthDraft(value); setMonthSubmitted(false);
          // Native pickers report a complete month. Text fallbacks need a draft
          // until Enter/blur so typing cannot trigger intermediate API requests.
          if (event.target.type === "month" && parseMonth(value) && !monthError(value)) submitMonth(value);
        }}
        // Route focus can blur this field before the effect resets its draft.
        // Submit only an edit made against the still-current month and selection.
        onBlur={() => { if (monthEdited.current === monthEditKey) submitMonth(monthDraft); }}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); if (monthEdited.current === monthEditKey) submitMonth(monthDraft); }
          if (event.key === "Escape") { setMonthDraft(monthKey); setMonthSubmitted(false); monthEdited.current = undefined; }
        }} />
      <IconButton aria-label="Next month" disabled={monthKey >= (maxDate?.slice(0, 7) ?? "9999-12")} onClick={() => changeMonth(month.add(1, "month"))}
        sx={{ gridArea: nativeMonth ? "1 / 3" : { xs: "2 / 2", sm: "1 / 3" }, justifySelf: "end", mt: nativeMonth ? "4px" : { xs: 0, sm: "4px" } }}><ChevronRight /></IconButton>
    </Box>
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
