import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Clock, User,
  Building2, CalendarDays, Phone, Trash2, Edit3, Upload
} from "lucide-react";

const MEMBER_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#3b82f6",
];

const EVENT_TYPES = [
  { key: "event", label: "Événement" },
  { key: "meeting", label: "Réunion" },
  { key: "call", label: "Appel" },
  { key: "task", label: "Tâche" },
  { key: "break", label: "Pause" },
];

const DAY_NAMES_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const SHORT_LABELS = {
  appointment: "RDV",
  followup: "Relance",
  project: "Projet",
  event: "Évt",
  meeting: "Réunion",
  call: "Appel",
  task: "Tâche",
  break: "Pause",
};

const HOUR_START = 7;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const HOUR_HEIGHT = 60; // px per hour

function parseICS(text) {
  // Unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) continue;
      const key = line.slice(0, colonIdx).split(";")[0];
      const value = line.slice(colonIdx + 1);

      if (key === "SUMMARY") current.summary = value;
      else if (key === "DESCRIPTION") current.description = value;
      else if (key === "LOCATION") current.location = value.replace(/\\,/g, ",").replace(/\\n/g, "\n");
      else if (key === "DTSTART") current.dtstart = value;
      else if (key === "DTEND") current.dtend = value;
    }
  }

  return events.map((e) => {
    const start = parseICSDate(e.dtstart);
    const end = parseICSDate(e.dtend);
    const date = start ? formatICSDateKey(start) : null;
    const startTime = start ? formatICSTime(start) : null;
    const endTime = end ? formatICSTime(end) : null;
    const isAllDay = e.dtstart && e.dtstart.length === 8; // DATE only, no time

    const descParts = [];
    if (e.description) descParts.push(e.description.replace(/\\n/g, "\n").replace(/\\,/g, ","));
    if (e.location) descParts.push("Lieu: " + e.location);

    return {
      title: e.summary || "Sans titre",
      description: descParts.join("\n") || null,
      date,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime,
    };
  }).filter((e) => e.date);
}

function parseICSDate(str) {
  if (!str) return null;
  // Handle YYYYMMDD (all-day) or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const clean = str.replace(/[^0-9TZ]/g, "");
  if (clean.length < 8) return null;
  const y = parseInt(clean.slice(0, 4));
  const m = parseInt(clean.slice(4, 6)) - 1;
  const d = parseInt(clean.slice(6, 8));
  if (clean.length >= 15) {
    const hh = parseInt(clean.slice(9, 11));
    const mm = parseInt(clean.slice(11, 13));
    const ss = parseInt(clean.slice(13, 15));
    if (clean.endsWith("Z")) {
      return new Date(Date.UTC(y, m, d, hh, mm, ss));
    }
    return new Date(y, m, d, hh, mm, ss);
  }
  return new Date(y, m, d);
}

function formatICSDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatICSTime(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getMemberColor(name, members) {
  const idx = members.findIndex((m) => m.name === name);
  return MEMBER_COLORS[idx >= 0 ? idx % MEMBER_COLORS.length : 0];
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str.includes("T") ? str : str + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function snapToQuarter(minutes) {
  return Math.round(minutes / 15) * 15;
}

function minutesToTime(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function SchedulePage({
  clients,
  teamMembers,
  projects,
  scheduleEvents = [],
  onBack,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onImportICS,
  toast,
}) {
  const [currentDate, setCurrentDate] = useState(() => getWeekStart(new Date()));
  const [filterMember, setFilterMember] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalDate, setModalDate] = useState(null);
  const [modalTime, setModalTime] = useState(null);
  const [popover, setPopover] = useState(null);
  const [importData, setImportData] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [selectedEventIds, setSelectedEventIds] = useState(new Set());
  const [lassoRect, setLassoRect] = useState(null); // { x, y, w, h } in grid px
  const dragRef = useRef({ active: false, moved: false });
  const lassoRef = useRef({ active: false, moved: false });
  const fileInputRef = useRef(null);
  const popoverRef = useRef(null);
  const gridScrollRef = useRef(null);
  const gridRef = useRef(null);
  const dayColRefs = useRef([]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const events = parseICS(text);
      setImportData({ fileName: file.name, events, assignedTo: teamMembers[0]?.name || "", color: "#6366f1" });
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [teamMembers]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentDate, i)),
    [currentDate]
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Scroll to 8h on mount
  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = (8 - HOUR_START) * HOUR_HEIGHT;
    }
  }, []);

  // Current time indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowIndicator = useMemo(() => {
    const todayCol = weekDays.findIndex((d) => isSameDay(d, today));
    if (todayCol < 0) return null;
    const minutes = now.getHours() * 60 + now.getMinutes();
    const top = ((minutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;
    if (top < 0 || top > (HOUR_END - HOUR_START) * HOUR_HEIGHT) return null;
    return { col: todayCol, top };
  }, [now, weekDays, today]);

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopover(null);
      }
    }
    if (popover) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [popover]);

  // Build all events
  const allEvents = useMemo(() => {
    const events = [];

    for (const c of clients) {
      if (c.appointmentDate) {
        const member = c.developedBy || c.contactedBy || c.foundBy;
        if (member) {
          events.push({
            id: `apt-${c.id}`,
            title: `RDV - ${c.company || c.name}`,
            shortLabel: "RDV",
            date: c.appointmentDate,
            startTime: null,
            endTime: null,
            member,
            type: "appointment",
            color: getMemberColor(member, teamMembers),
            icon: "calendar",
            source: "client",
          });
        }
      }
      if (c.followUpDate) {
        const member = c.contactedBy || c.developedBy || c.foundBy;
        if (member) {
          events.push({
            id: `fup-${c.id}`,
            title: `Relance - ${c.company || c.name}`,
            shortLabel: "Relance",
            date: c.followUpDate,
            startTime: null,
            endTime: null,
            member,
            type: "followup",
            color: getMemberColor(member, teamMembers),
            icon: "phone",
            source: "client",
          });
        }
      }
    }

    for (const p of projects) {
      if (p.assignedTo && p.startDate) {
        events.push({
          id: `proj-${p.id}`,
          title: p.name,
          shortLabel: "Projet",
          date: p.startDate,
          startTime: null,
          endTime: null,
          member: p.assignedTo,
          type: "project",
          color: p.color || getMemberColor(p.assignedTo, teamMembers),
          icon: "building",
          source: "project",
        });
      }
    }

    for (const e of scheduleEvents) {
      events.push({
        id: `evt-${e.id}`,
        realId: e.id,
        title: e.title,
        shortLabel: SHORT_LABELS[e.type] || SHORT_LABELS.event,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        member: e.assignedTo,
        type: e.type || "event",
        color: e.color || getMemberColor(e.assignedTo, teamMembers),
        icon: "clock",
        source: "custom",
        description: e.description,
      });
    }

    if (filterMember) {
      return events.filter((e) => e.member === filterMember);
    }
    return events;
  }, [clients, projects, scheduleEvents, teamMembers, filterMember]);

  // Split events: timed vs all-day
  const { timedByDate, allDayByDate } = useMemo(() => {
    const timed = {};
    const allDay = {};
    for (const e of allEvents) {
      const key = e.date;
      if (e.startTime) {
        if (!timed[key]) timed[key] = [];
        timed[key].push(e);
      } else {
        if (!allDay[key]) allDay[key] = [];
        allDay[key].push(e);
      }
    }
    return { timedByDate: timed, allDayByDate: allDay };
  }, [allEvents]);

  // Check if there are any all-day events this week
  const hasAllDay = useMemo(() => {
    return weekDays.some((d) => {
      const key = formatDateKey(d);
      return allDayByDate[key] && allDayByDate[key].length > 0;
    });
  }, [weekDays, allDayByDate]);

  // Week label
  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getFullYear()} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
  }, [weekDays]);

  const memberEventCounts = useMemo(() => {
    const counts = {};
    for (const e of allEvents) {
      counts[e.member] = (counts[e.member] || 0) + 1;
    }
    return counts;
  }, [allEvents]);

  const goToday = useCallback(() => setCurrentDate(getWeekStart(new Date())), []);
  const goPrev = useCallback(() => setCurrentDate((d) => addDays(d, -7)), []);
  const goNext = useCallback(() => setCurrentDate((d) => addDays(d, 7)), []);

  const handleSlotClick = useCallback((day, hour) => {
    if (lassoRef.current.moved) return;
    setSelectedEventIds(new Set());
    setModalDate(formatDateKey(day));
    setModalTime(formatHour(hour));
    setEditingEvent(null);
    setShowModal(true);
  }, []);

  const handleAllDayClick = useCallback((day) => {
    setModalDate(formatDateKey(day));
    setModalTime(null);
    setEditingEvent(null);
    setShowModal(true);
  }, []);

  const handleEventClick = useCallback((e, event) => {
    e.stopPropagation();
    setPopover(event);
  }, []);

  const handleEditEvent = useCallback(() => {
    if (!popover || popover.source !== "custom") return;
    const original = scheduleEvents.find((e) => e.id === popover.realId);
    if (original) {
      setEditingEvent(original);
      setModalDate(original.date);
      setModalTime(original.startTime || null);
      setShowModal(true);
    }
    setPopover(null);
  }, [popover, scheduleEvents]);

  const handleDeleteEvent = useCallback(async () => {
    if (!popover || popover.source !== "custom" || !popover.realId) return;
    await onDeleteEvent(popover.realId);
    setPopover(null);
  }, [popover, onDeleteEvent]);

  const handleSaveEvent = useCallback(
    async (data) => {
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, data);
      } else {
        await onCreateEvent(data);
      }
      setShowModal(false);
      setEditingEvent(null);
    },
    [editingEvent, onCreateEvent, onUpdateEvent]
  );

  // --- Drag & Drop ---
  const handleDragStart = useCallback((e, event) => {
    if (event.source !== "custom") return;
    e.preventDefault();
    e.stopPropagation();

    const grid = gridScrollRef.current;
    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    const colRects = dayColRefs.current.map((el) => el?.getBoundingClientRect());

    const startMin = event.startTime ? timeToMinutes(event.startTime) : null;
    const endMin = event.endTime ? timeToMinutes(event.endTime) : null;
    const duration = startMin != null && endMin != null ? endMin - startMin : 60;

    const drag = dragRef.current;
    drag.active = false;
    drag.moved = false;
    drag.event = event;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.gridRect = gridRect;
    drag.colRects = colRects;
    drag.duration = duration;
    drag.isTimed = !!event.startTime;

    const onMove = (ev) => {
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      if (!drag.active && Math.abs(dx) + Math.abs(dy) < 6) return;
      drag.active = true;
      drag.moved = true;

      // Find which column mouse is over
      let colIdx = -1;
      for (let i = 0; i < drag.colRects.length; i++) {
        const r = drag.colRects[i];
        if (r && ev.clientX >= r.left && ev.clientX <= r.right) {
          colIdx = i;
          break;
        }
      }
      if (colIdx < 0) return;

      const newDate = formatDateKey(weekDays[colIdx]);

      if (drag.isTimed) {
        const scrollEl = gridScrollRef.current;
        const yInGrid = ev.clientY - drag.gridRect.top + scrollEl.scrollTop;
        const rawMin = (yInGrid / HOUR_HEIGHT) * 60 + HOUR_START * 60;
        const snappedStart = snapToQuarter(Math.max(HOUR_START * 60, Math.min(rawMin, HOUR_END * 60 - drag.duration)));
        const snappedEnd = snappedStart + drag.duration;

        setDragPreview({
          eventId: drag.event.id,
          colIdx,
          date: newDate,
          startTime: minutesToTime(snappedStart),
          endTime: minutesToTime(snappedEnd),
          top: ((snappedStart - HOUR_START * 60) / 60) * HOUR_HEIGHT,
          height: (drag.duration / 60) * HOUR_HEIGHT,
          color: drag.event.color,
          title: drag.event.title,
        });
      } else {
        setDragPreview({
          eventId: drag.event.id,
          colIdx,
          date: newDate,
          startTime: null,
          endTime: null,
          color: drag.event.color,
          title: drag.event.title,
        });
      }
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.classList.remove("sc-dragging");

      const wasDragging = drag.active;
      const evt = drag.event;
      drag.active = false;

      if (!wasDragging || !evt.realId) {
        setDragPreview(null);
        return;
      }

      // Use setState callback to read the latest dragPreview value
      setDragPreview((current) => {
        if (current && evt.realId) {
          const original = scheduleEvents.find((e) => e.id === evt.realId);
          if (original && (current.date !== original.date || current.startTime !== original.startTime)) {
            onUpdateEvent(evt.realId, {
              title: original.title,
              description: original.description,
              assignedTo: original.assignedTo,
              date: current.date,
              startTime: current.startTime,
              endTime: current.endTime,
              color: original.color,
              type: original.type,
            });
          }
        }
        return null;
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "grabbing";
    document.body.classList.add("sc-dragging");
  }, [weekDays, scheduleEvents, onUpdateEvent]);

  const handleEventClickSafe = useCallback((e, event) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    handleEventClick(e, event);
  }, [handleEventClick]);

  // --- Lasso selection ---
  const handleLassoStart = useCallback((e) => {
    // Only left click, not on events
    if (e.button !== 0) return;
    const grid = gridRef.current;
    const scroll = gridScrollRef.current;
    if (!grid || !scroll) return;

    const gridRect = grid.getBoundingClientRect();
    const startX = e.clientX - gridRect.left;
    const startY = e.clientY - gridRect.top + scroll.scrollTop;

    const lasso = lassoRef.current;
    lasso.active = false;
    lasso.moved = false;
    lasso.startX = startX;
    lasso.startY = startY;
    lasso.gridRect = gridRect;

    const onMove = (ev) => {
      const dx = ev.clientX - (gridRect.left + startX);
      const dy = ev.clientY - (gridRect.top + startY - scroll.scrollTop);
      if (!lasso.active && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < 8) return;
      lasso.active = true;
      lasso.moved = true;

      const curX = ev.clientX - gridRect.left;
      const curY = ev.clientY - gridRect.top + scroll.scrollTop;

      const rx = Math.min(startX, curX);
      const ry = Math.min(startY, curY);
      const rw = Math.abs(curX - startX);
      const rh = Math.abs(curY - startY);

      setLassoRect({ x: rx, y: ry, w: rw, h: rh });

      // Calculate which custom timed events are within the lasso
      const colRects = dayColRefs.current.map((el) => el?.getBoundingClientRect());
      const selected = new Set();

      for (const evt of allEvents) {
        if (evt.source !== "custom" || !evt.startTime) continue;
        // Find which column this event is in
        const evtDateKey = evt.date;
        let colIdx = -1;
        for (let i = 0; i < weekDays.length; i++) {
          if (formatDateKey(weekDays[i]) === evtDateKey) {
            colIdx = i;
            break;
          }
        }
        if (colIdx < 0) continue;

        const colRect = colRects[colIdx];
        if (!colRect) continue;

        // Event pixel bounds (relative to grid)
        const evStartMin = timeToMinutes(evt.startTime);
        const evEndMin = evt.endTime ? timeToMinutes(evt.endTime) : evStartMin + 60;
        const evTop = ((evStartMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
        const evBottom = ((evEndMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
        const evLeft = colRect.left - gridRect.left;
        const evRight = colRect.right - gridRect.left;

        // Check rectangle overlap
        if (rx < evRight && rx + rw > evLeft && ry < evBottom && ry + rh > evTop) {
          selected.add(evt.id);
        }
      }

      setSelectedEventIds(selected);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("sc-lasso-active");
      setLassoRect(null);
      lasso.active = false;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [allEvents, weekDays]);

  const handleDeleteSelected = useCallback(async () => {
    const customIds = [];
    for (const evtId of selectedEventIds) {
      const evt = allEvents.find((e) => e.id === evtId);
      if (evt && evt.source === "custom" && evt.realId) {
        customIds.push(evt.realId);
      }
    }
    for (const id of customIds) {
      await onDeleteEvent(id);
    }
    setSelectedEventIds(new Set());
    toast(`${customIds.length} événement(s) supprimé(s)`);
  }, [selectedEventIds, allEvents, onDeleteEvent, toast]);

  // Escape to deselect
  useEffect(() => {
    if (selectedEventIds.size === 0) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setSelectedEventIds(new Set());
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedEventIds]);

  function renderEventIcon(event, size = 11) {
    switch (event.icon) {
      case "phone": return <Phone size={size} />;
      case "building": return <Building2 size={size} />;
      case "calendar": return <CalendarDays size={size} />;
      default: return <Clock size={size} />;
    }
  }

  // Calculate position for a timed event
  function getEventStyle(event) {
    const startMin = timeToMinutes(event.startTime);
    const endMin = event.endTime ? timeToMinutes(event.endTime) : startMin + 60;
    const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);
    return { top: `${top}px`, height: `${height}px` };
  }

  return (
    <div className="schedule-page">
      {/* Header */}
      <div className="schedule-header">
        <div className="schedule-header-left">
          <button className="btn-icon" onClick={onBack} title="Retour">
            <ArrowLeft size={18} />
          </button>
          <h1>Planning de l'équipe</h1>
        </div>

        <div className="schedule-nav">
          <button className="btn-icon" onClick={goPrev} title="Semaine précédente">
            <ChevronLeft size={18} />
          </button>
          <button className="schedule-today-btn" onClick={goToday}>
            Aujourd'hui
          </button>
          <button className="btn-icon" onClick={goNext} title="Semaine suivante">
            <ChevronRight size={18} />
          </button>
          <span className="schedule-week-label">{weekLabel}</span>
        </div>

        <div className="schedule-header-right">
          <select
            className="form-select schedule-filter"
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
          >
            <option value="">Tous les membres</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          <button
            className="btn schedule-import-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Importer un fichier .ics"
          >
            <Upload size={14} />
            Import .ics
          </button>

          <button
            className="btn schedule-add-btn"
            onClick={() => {
              setModalDate(formatDateKey(new Date()));
              setModalTime("09:00");
              setEditingEvent(null);
              setShowModal(true);
            }}
          >
            <Plus size={14} />
            Événement
          </button>
        </div>
      </div>

      <div className="schedule-body">
        {/* Sidebar */}
        <div className="schedule-sidebar">
          <div className="schedule-sidebar-title">Membres</div>
          {teamMembers.map((m) => (
            <button
              key={m.id}
              className={`schedule-member-chip${filterMember === m.name ? " active" : ""}`}
              onClick={() => setFilterMember((prev) => (prev === m.name ? "" : m.name))}
            >
              <span className="schedule-member-dot" style={{ background: getMemberColor(m.name, teamMembers) }} />
              <span className="schedule-member-name">{m.name}</span>
              {memberEventCounts[m.name] > 0 && (
                <span className="schedule-member-count">{memberEventCounts[m.name]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="schedule-calendar">
          {/* Day headers */}
          <div className="sc-header-row">
            <div className="sc-gutter-header" />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className={`sc-day-header${isToday ? " today" : ""}`}>
                  <span className="sc-day-name">{DAY_NAMES_SHORT[i]}</span>
                  <span className={`sc-day-num${isToday ? " today" : ""}`}>{day.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* All-day section */}
          {hasAllDay && (
            <div className="sc-allday-row">
              <div className="sc-gutter sc-allday-label">Journée</div>
              {weekDays.map((day, i) => {
                const key = formatDateKey(day);
                const events = allDayByDate[key] || [];
                const hasGhost = dragPreview && !dragPreview.startTime && dragPreview.colIdx === i;
                return (
                  <div
                    key={i}
                    className={`sc-allday-cell${hasGhost ? " sc-drop-target" : ""}`}
                    onClick={() => handleAllDayClick(day)}
                  >
                    {events.map((event) => {
                      const isDragging = dragPreview?.eventId === event.id;
                      const isDraggable = event.source === "custom";
                      return (
                        <div
                          key={event.id}
                          className={`sc-allday-event${isDraggable ? " draggable" : ""}${isDragging ? " dragging" : ""}`}
                          style={{ background: event.color + "22", borderLeftColor: event.color }}
                          onClick={(e) => handleEventClickSafe(e, event)}
                          onMouseDown={isDraggable ? (e) => handleDragStart(e, event) : undefined}
                        >
                          <span className="sc-event-tag" style={{ background: event.color + "33", color: event.color }}>{event.shortLabel}</span>
                          <span className="sc-allday-event-icon" style={{ color: event.color }}>
                            {renderEventIcon(event, 10)}
                          </span>
                          <span className="sc-allday-event-title">{event.title}</span>
                          <span className="sc-allday-event-member">{event.member}</span>
                        </div>
                      );
                    })}
                    {hasGhost && (
                      <div className="sc-allday-event sc-drag-ghost-allday" style={{ background: dragPreview.color + "30", borderLeftColor: dragPreview.color }}>
                        <span className="sc-allday-event-title">{dragPreview.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Time grid */}
          <div className="sc-grid-scroll" ref={gridScrollRef}>
            <div className="sc-grid" ref={gridRef} style={{ height: `${(HOUR_END - HOUR_START) * HOUR_HEIGHT}px` }} onMouseDown={handleLassoStart}>
              {/* Hour gutter + lines */}
              <div className="sc-gutter-col">
                {HOURS.map((h) => (
                  <div key={h} className="sc-gutter-label" style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}>
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, colIdx) => {
                const key = formatDateKey(day);
                const events = timedByDate[key] || [];
                const isToday = isSameDay(day, today);

                return (
                  <div key={colIdx} className={`sc-day-col${isToday ? " today" : ""}`} ref={(el) => { dayColRefs.current[colIdx] = el; }}>
                    {/* Hour slot lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="sc-hour-slot"
                        style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                        onClick={() => handleSlotClick(day, h)}
                      />
                    ))}

                    {/* Timed events */}
                    {events.map((event) => {
                      const style = getEventStyle(event);
                      const isDragging = dragPreview?.eventId === event.id;
                      const isDraggable = event.source === "custom";
                      const isSelected = selectedEventIds.has(event.id);
                      return (
                        <div
                          key={event.id}
                          className={`sc-timed-event${isDraggable ? " draggable" : ""}${isDragging ? " dragging" : ""}${isSelected ? " selected" : ""}`}
                          style={{
                            ...style,
                            "--ev-color": event.color,
                            borderLeftColor: event.color,
                            background: event.color + "18",
                          }}
                          onClick={(e) => handleEventClickSafe(e, event)}
                          onMouseDown={isDraggable ? (e) => handleDragStart(e, event) : undefined}
                        >
                          <span className="sc-event-tag" style={{ background: event.color + "33", color: event.color }}>{event.shortLabel}</span>
                          <div className="sc-timed-event-detail">
                            <div className="sc-timed-event-time">
                              {event.startTime}
                              {event.endTime && ` - ${event.endTime}`}
                            </div>
                            <div className="sc-timed-event-title">{event.title}</div>
                            <div className="sc-timed-event-member">
                              <span className="schedule-member-dot small" style={{ background: event.color }} />
                              {event.member}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Drag preview ghost */}
                    {dragPreview && dragPreview.colIdx === colIdx && dragPreview.startTime && (
                      <div
                        className="sc-timed-event sc-drag-ghost"
                        style={{
                          top: `${dragPreview.top}px`,
                          height: `${dragPreview.height}px`,
                          borderLeftColor: dragPreview.color,
                          background: dragPreview.color + "30",
                          "--ev-color": dragPreview.color,
                        }}
                      >
                        <div className="sc-timed-event-detail">
                          <div className="sc-timed-event-time">
                            {dragPreview.startTime} - {dragPreview.endTime}
                          </div>
                          <div className="sc-timed-event-title">{dragPreview.title}</div>
                        </div>
                      </div>
                    )}

                    {/* Now indicator */}
                    {nowIndicator && nowIndicator.col === colIdx && (
                      <div className="sc-now-line" style={{ top: `${nowIndicator.top}px` }}>
                        <div className="sc-now-dot" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Lasso selection rectangle */}
              {lassoRect && (
                <div
                  className="sc-lasso-rect"
                  style={{
                    left: `${lassoRect.x}px`,
                    top: `${lassoRect.y}px`,
                    width: `${lassoRect.w}px`,
                    height: `${lassoRect.h}px`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selection action bar */}
      {selectedEventIds.size > 0 && (
        <div className="sc-selection-bar">
          <span className="sc-selection-bar-count">{selectedEventIds.size} sélectionné(s)</span>
          <button className="btn btn-sm btn-danger" onClick={handleDeleteSelected}>
            <Trash2 size={12} /> Supprimer
          </button>
          <button className="btn btn-sm" onClick={() => setSelectedEventIds(new Set())}>
            <X size={12} /> Désélectionner
          </button>
          <span className="sc-selection-bar-hint">Échap pour annuler</span>
        </div>
      )}

      {/* Popover */}
      {popover && (
        <div className="schedule-popover-overlay" onClick={() => setPopover(null)}>
          <div className="schedule-popover" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
            <div className="schedule-popover-header">
              <div className="schedule-popover-color" style={{ background: popover.color }} />
              <div className="schedule-popover-title">{popover.title}</div>
              <button className="btn-icon" onClick={() => setPopover(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="schedule-popover-body">
              <div className="schedule-popover-row">
                <CalendarDays size={13} />
                <span>
                  {parseDate(popover.date)?.toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </span>
              </div>
              {popover.startTime && (
                <div className="schedule-popover-row">
                  <Clock size={13} />
                  <span>{popover.startTime}{popover.endTime && ` - ${popover.endTime}`}</span>
                </div>
              )}
              <div className="schedule-popover-row">
                <User size={13} />
                <span>{popover.member}</span>
              </div>
              {popover.description && (
                <div className="schedule-popover-desc">{popover.description}</div>
              )}
              <div className="schedule-popover-source">
                {popover.source === "client" && "Depuis pipeline client"}
                {popover.source === "project" && "Depuis projets"}
                {popover.source === "custom" && "Événement personnalisé"}
              </div>
            </div>
            {popover.source === "custom" && (
              <div className="schedule-popover-actions">
                <button className="btn btn-sm" onClick={handleEditEvent}>
                  <Edit3 size={12} /> Modifier
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleDeleteEvent}>
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <EventModal
          date={modalDate}
          time={modalTime}
          event={editingEvent}
          teamMembers={teamMembers}
          onSave={handleSaveEvent}
          onClose={() => { setShowModal(false); setEditingEvent(null); }}
        />
      )}

      {/* Import ICS Modal */}
      {importData && (
        <ImportICSModal
          data={importData}
          teamMembers={teamMembers}
          onUpdate={setImportData}
          onConfirm={async (filteredEvents) => {
            const events = filteredEvents.map((e) => ({
              ...e,
              assignedTo: importData.assignedTo,
              color: importData.color,
              type: "event",
            }));
            await onImportICS(events);
            setImportData(null);
          }}
          onClose={() => setImportData(null)}
        />
      )}
    </div>
  );
}

function EventModal({ date, time, event, teamMembers, onSave, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [assignedTo, setAssignedTo] = useState(event?.assignedTo || (teamMembers[0]?.name || ""));
  const [eventDate, setEventDate] = useState(date || event?.date || "");
  const [startTime, setStartTime] = useState(event?.startTime || time || "");
  const [endTime, setEndTime] = useState(event?.endTime || "");
  const [type, setType] = useState(event?.type || "event");
  const [color, setColor] = useState(event?.color || "#6366f1");
  const [saving, setSaving] = useState(false);

  // Auto-set end time 1h after start
  useEffect(() => {
    if (startTime && !endTime && !event) {
      const [h, m] = startTime.split(":").map(Number);
      setEndTime(`${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }, [startTime, endTime, event]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo || !eventDate) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      assignedTo,
      date: eventDate,
      startTime: startTime || null,
      endTime: endTime || null,
      type,
      color,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? "Modifier l'événement" : "Nouvel événement"}</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Réunion d'équipe, Appel client..." autoFocus required />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={eventDate}
                onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Heure début</label>
              <input type="time" className="form-input" value={startTime}
                onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Heure fin</label>
              <input type="time" className="form-input" value={endTime}
                onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Membre assigné *</label>
              <select className="form-select" value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)} required>
                <option value="">Sélectionner...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div className="schedule-color-picker">
                {MEMBER_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`schedule-color-swatch${color === c ? " active" : ""}`}
                    style={{ background: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Notes, détails..." />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary"
              disabled={saving || !title.trim() || !assignedTo || !eventDate}>
              {saving ? "Enregistrement..." : event ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportICSModal({ data, teamMembers, onUpdate, onConfirm, onClose }) {
  const [importing, setImporting] = useState(false);
  const [weeks, setWeeks] = useState(3);

  // Find the earliest date to calculate week cutoff
  const firstDate = useMemo(() => {
    const dates = data.events.map((e) => e.date).filter(Boolean).sort();
    return dates.length > 0 ? dates[0] : null;
  }, [data.events]);

  const filteredEvents = useMemo(() => {
    if (!firstDate || weeks === 0) return data.events;
    const start = new Date(firstDate + "T00:00:00");
    const cutoff = new Date(start);
    cutoff.setDate(cutoff.getDate() + weeks * 7);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    return data.events.filter((e) => e.date < cutoffStr);
  }, [data.events, firstDate, weeks]);

  const uniqueTitles = useMemo(() => {
    const map = {};
    for (const e of filteredEvents) {
      map[e.title] = (map[e.title] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredEvents]);

  const dateRange = useMemo(() => {
    const dates = filteredEvents.map((e) => e.date).filter(Boolean).sort();
    if (dates.length === 0) return null;
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [filteredEvents]);

  const handleConfirm = async () => {
    if (!data.assignedTo) return;
    setImporting(true);
    await onConfirm(filteredEvents);
    setImporting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal schedule-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2><Upload size={18} /> Import .ics</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="ics-import-info">
            <div className="ics-import-stat">
              <span className="ics-import-stat-num">{filteredEvents.length}</span>
              <span>événements à importer</span>
              {filteredEvents.length !== data.events.length && (
                <span className="ics-import-total">sur {data.events.length} au total</span>
              )}
            </div>
            <div className="ics-import-file">{data.fileName}</div>
            {dateRange && (
              <div className="ics-import-range">
                Du {dateRange.from} au {dateRange.to}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Limiter l'import aux</label>
            <div className="ics-weeks-selector">
              {[1, 2, 3, 4, 6, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`ics-weeks-btn${weeks === w ? " active" : ""}`}
                  onClick={() => setWeeks(w)}
                >
                  {w} sem.
                </button>
              ))}
              <button
                type="button"
                className={`ics-weeks-btn${weeks === 0 ? " active" : ""}`}
                onClick={() => setWeeks(0)}
              >
                Tout
              </button>
            </div>
          </div>

          <div className="ics-import-preview">
            <div className="form-label" style={{ marginBottom: 6 }}>Aperçu des cours/événements :</div>
            <div className="ics-import-list">
              {uniqueTitles.slice(0, 15).map(([title, count]) => (
                <div key={title} className="ics-import-item">
                  <span className="ics-import-item-title">{title}</span>
                  <span className="ics-import-item-count">{count}x</span>
                </div>
              ))}
              {uniqueTitles.length > 15 && (
                <div className="ics-import-item" style={{ opacity: 0.6 }}>
                  ... et {uniqueTitles.length - 15} autres
                </div>
              )}
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Assigner à *</label>
              <select
                className="form-select"
                value={data.assignedTo}
                onChange={(e) => onUpdate({ ...data, assignedTo: e.target.value })}
                required
              >
                <option value="">Sélectionner un membre...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div className="schedule-color-picker">
                {MEMBER_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`schedule-color-swatch${data.color === c ? " active" : ""}`}
                    style={{ background: c }}
                    onClick={() => onUpdate({ ...data, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={importing || !data.assignedTo || filteredEvents.length === 0}
              onClick={handleConfirm}
            >
              {importing ? "Import en cours..." : `Importer ${filteredEvents.length} événements`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
