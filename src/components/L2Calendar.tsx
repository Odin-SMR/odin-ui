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
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient } from "../odinApi/client";
import { Level2PlotInfo, type ScanInfo } from "./Leve2PlotInfo";
import { L2ProductPlots } from "./L2ProductPlots";

interface DatasetRange {
  start: Dayjs;
  end: Dayjs;
}

interface ProjectsMap {
  project: string;
  count: number;
}

const api = createApiClient("https://odin-smr.org/");

const today = dayjs().utc().subtract(7, "week");

interface ProjectDef {
  project: string;
  freqmode: number;
}

interface SelectedEvent {
  project: string;
  freqmode: number;
  day: string;
}

function toCalendarEvents(
  cal: Record<string, Record<string, ProjectsMap>>
): EventSourceInput {
  const events: EventSourceInput = [];

  for (const [date, fmCounts] of Object.entries(cal)) {
    for (const [fmStr, count] of Object.entries(fmCounts)) {
      const fm = parseInt(fmStr, 10);

      events.push({
        title: `FM${fm} • ${count.count} scans`,
        start: date, // already in "YYYY-MM-DD" format
        allDay: true,
        extendedProps: {
          count: count.count,
          freqmode: fm,
          project: count.project,
        },

        color: FREQMODE_COLOURS[fm] ?? "gray",
      });
    }
  }

  return events;
}

export function L2Calendar() {
  const [range, setRange] = useState<DatasetRange>();
  const [projects, setProjects] = useState<ProjectDef[]>([]);
  const [scaninfo, setScaninfo] = useState<ScanInfo[]>([]);
  const [scan, setScan] = useState<ScanInfo>();
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Step 1: Fetch project names
        const data = await api.getRest_apiv5level2projects();
        const projectNames = data.Data.map((v) => v.Name).filter(
          (v) => v !== undefined
        );

        const allProjects: ProjectDef[] = [];
        for (const name of projectNames) {
          const projectData = await api.getRest_apiv5level2Project({
            params: { project: name },
          });
          const projects = projectData.Data.map((p) => ({
            project: name,
            freqmode: p.FreqMode ?? 0,
          }));
          allProjects.push(...projects);
        }

        setProjects(allProjects);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const getAllScanInfo = async () => {
      if (!range || projects.length === 0) return;

      try {
        const results = await Promise.all(
          projects.map((project) =>
            api
              .getRest_apiv5level2ProjectFreqmodescans({
                params: {
                  project: project.project,
                  freqmode: project.freqmode,
                },
                queries: {
                  limit: 1000000,
                  start_time: range.start.format("YYYY-MM-DD"),
                  end_time: range.end.format("YYYY-MM-DD"),
                },
              })
              .then((res) =>
                res.Data.map(
                  (v) =>
                    ({
                      datetime: dayjs(v.Date).utc(true),
                      FM: project.freqmode,
                      project: project.project,
                      scanid: v.ScanID,
                    } as ScanInfo)
                )
              )
              .catch((err) => {
                console.error(`Failed for ${project.project}`, err);
                return []; // fallback so Promise.all doesn't reject
              })
          )
        );
        // Flatten array of arrays
        const allScans = results.flat();
        setScaninfo(allScans);
      } catch (err) {
        console.error("Unexpected error during scaninfo fetch", err);
      }
    };

    getAllScanInfo();
  }, [range, projects]);

  const cal = scaninfo.reduce((aqq, v) => {
    const day = dayjs(v.datetime).format("YYYY-MM-DD");
    const fm = v.FM;

    // Create day entry if it doesn't exist
    if (!aqq[day]) {
      aqq[day] = {};
    }

    // Create FM/Project combo key
    const key = `${fm}`;
    aqq[day][key] = {
      count: (aqq[day][key]?.count ?? 0) + 1,
      project: v.project,
    };

    return aqq;
  }, {} as Record<string, Record<string, ProjectsMap>>);

  const handleUpdateDate = (start: Dayjs, end: Dayjs) => {
    setRange({ start: start, end: end });
    setSelectedEvent(undefined);
    setScan(undefined);
  };

  const handleClickedEvent = (event: EventClickArg) => {
    setScan(undefined);
    event.jsEvent.preventDefault();
    setSelectedEvent({
      day: dayjs(event.event.start).utc(true).format("YYYY-MM-DD"),
      freqmode: event.event.extendedProps.freqmode,
      project: event.event.extendedProps.project,
    });
  };

  const displayData = scaninfo.filter(
    (v) =>
      v.datetime.format("YYYY-MM-DD") === selectedEvent?.day &&
      v.FM === selectedEvent?.freqmode &&
      v.project === selectedEvent?.project
  );

  return (
    <Grid margin={2} spacing={2} container>
      <Grid size={12}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={toCalendarEvents(cal)}
          height="auto"
          initialDate={today.toDate()}
          datesSet={(arg) =>
            handleUpdateDate(
              dayjs(arg.start).utc(true),
              dayjs(arg.end).utc(true)
            )
          }
          dayMaxEvents={6} // show "+1 more" if > 6
          eventClick={(arg) => {
            handleClickedEvent(arg);
          }}
        />
      </Grid>
      <Grid size={12} height={140}>
        <Level2PlotInfo data={displayData} handleSelectedScan={setScan} />
      </Grid>
      <Grid size={12}>
        <L2ProductPlots scan={scan} />
      </Grid>
    </Grid>
  );
}
