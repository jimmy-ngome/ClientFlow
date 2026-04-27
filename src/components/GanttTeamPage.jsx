import { useState, useMemo, useRef, useEffect } from "react";
import { ArrowLeft, ZoomIn, ZoomOut, Users, ChevronDown, ChevronRight } from "lucide-react";
import { PIPELINE_STAGES } from "../App";

const ZOOM_LEVELS = [
  { key: "day", label: "Jours", days: 1 },
  { key: "week", label: "Semaines", days: 7 },
  { key: "month", label: "Mois", days: 30 },
];

const COL_WIDTH = { day: 36, week: 48, month: 64 };

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatMonth(d) {
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function getStageColor(status) {
  const stage = PIPELINE_STAGES.find(s => s.key === status);
  return stage ? stage.color : "#71717a";
}

function getStageLabel(status) {
  const stage = PIPELINE_STAGES.find(s => s.key === status);
  return stage ? stage.label : status;
}

function getStageProgress(status) {
  const idx = PIPELINE_STAGES.findIndex(s => s.key === status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / PIPELINE_STAGES.length) * 100);
}

export default function GanttTeamPage({ clients, teamMembers, stages, onBack, onSwitchView }) {
  const [zoom, setZoom] = useState(1);
  const [filterMember, setFilterMember] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const scrollRef = useRef(null);
  const todayRef = useRef(null);

  const zoomLevel = ZOOM_LEVELS[zoom];
  const colWidth = COL_WIDTH[zoomLevel.key];

  // Group clients by team member
  const memberGroups = useMemo(() => {
    const groups = {};

    // Initialize with all team members
    for (const m of teamMembers) {
      groups[m.name] = { name: m.name, clients: [] };
    }

    // Assign clients to members based on roles
    for (const c of clients) {
      if (!(c.firstContactDate || c.createdAt)) continue;

      const startStr = c.firstContactDate || c.createdAt;
      const start = new Date(startStr.includes("T") ? startStr : startStr + "T00:00:00");
      const enriched = { ...c, ganttStart: start };

      const assignedMembers = new Set();
      for (const role of ["foundBy", "contactedBy", "developedBy"]) {
        if (c[role] && c[role].trim()) {
          assignedMembers.add(c[role].trim());
        }
      }

      for (const memberName of assignedMembers) {
        if (!groups[memberName]) {
          groups[memberName] = { name: memberName, clients: [] };
        }
        // Determine the role(s) for this member
        const roles = [];
        if (c.foundBy === memberName) roles.push("foundBy");
        if (c.contactedBy === memberName) roles.push("contactedBy");
        if (c.developedBy === memberName) roles.push("developedBy");
        groups[memberName].clients.push({ ...enriched, roles });
      }
    }

    let result = Object.values(groups);

    if (filterMember) {
      result = result.filter(g => g.name === filterMember);
    }

    // Sort members by number of clients desc
    result.sort((a, b) => b.clients.length - a.clients.length);

    // Sort clients within each group by start date
    for (const g of result) {
      g.clients.sort((a, b) => a.ganttStart - b.ganttStart);
    }

    return result;
  }, [clients, teamMembers, filterMember]);

  // All visible clients for timeline calculation
  const allClients = useMemo(() => {
    return memberGroups.flatMap(g => g.clients);
  }, [memberGroups]);

  // Timeline range
  const { timeStart, timeEnd, columns } = useMemo(() => {
    if (allClients.length === 0) {
      const now = new Date();
      return { timeStart: addDays(now, -30), timeEnd: addDays(now, 30), columns: [] };
    }

    const dates = allClients.map(c => c.ganttStart);
    const minDate = new Date(Math.min(...dates));
    const now = new Date();

    let tStart, tEnd;
    if (zoomLevel.key === "day") {
      tStart = addDays(minDate, -3);
      tEnd = addDays(now, 14);
    } else if (zoomLevel.key === "week") {
      tStart = startOfWeek(addDays(minDate, -7));
      tEnd = addDays(now, 28);
    } else {
      tStart = startOfMonth(addDays(minDate, -15));
      tEnd = addDays(now, 60);
    }

    const cols = [];
    let cursor = new Date(tStart);
    while (cursor <= tEnd) {
      cols.push(new Date(cursor));
      if (zoomLevel.key === "day") {
        cursor = addDays(cursor, 1);
      } else if (zoomLevel.key === "week") {
        cursor = addDays(cursor, 7);
      } else {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }

    return { timeStart: tStart, timeEnd: tEnd, columns: cols };
  }, [allClients, zoomLevel]);

  const totalDays = daysBetween(timeStart, timeEnd) || 1;
  const totalWidth = columns.length * colWidth;

  function getBarStyle(client) {
    const start = daysBetween(timeStart, client.ganttStart);
    const now = new Date();
    const duration = Math.max(1, daysBetween(client.ganttStart, now));
    const left = (start / totalDays) * totalWidth;
    const width = Math.max(8, (duration / totalDays) * totalWidth);
    return { left, width };
  }

  const toggleCollapse = (name) => {
    setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      const todayPos = todayRef.current.offsetLeft;
      scrollRef.current.scrollLeft = todayPos - containerWidth / 2;
    }
  }, [zoom, allClients.length]);

  const todayOffset = (daysBetween(timeStart, new Date()) / totalDays) * totalWidth;

  // Build sidebar + rows in sync
  const rows = useMemo(() => {
    const result = [];
    for (const group of memberGroups) {
      const isCollapsed = collapsed[group.name];
      result.push({ type: "member", name: group.name, count: group.clients.length, isCollapsed });
      if (!isCollapsed) {
        for (const c of group.clients) {
          result.push({ type: "client", client: c, memberName: group.name });
        }
      }
    }
    return result;
  }, [memberGroups, collapsed]);

  return (
    <div className="gantt-page">
      <div className="gantt-header">
        <div className="gantt-header-left">
          <button className="btn-icon" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>Avancement Equipe</h1>
        </div>
        <div className="gantt-controls">
          <div className="gantt-view-tabs">
            <button className="gantt-view-tab" onClick={onSwitchView}>
              Timeline clients
            </button>
            <button className="gantt-view-tab active">
              Equipe
            </button>
          </div>

          <select
            className="form-select gantt-filter-select"
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
          >
            <option value="">Tous les membres</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          <div className="gantt-zoom-controls">
            <button
              className="btn-icon"
              onClick={() => setZoom(z => Math.max(0, z - 1))}
              disabled={zoom === 0}
              title="Zoom avant"
            >
              <ZoomIn size={16} />
            </button>
            <span className="gantt-zoom-label">{zoomLevel.label}</span>
            <button
              className="btn-icon"
              onClick={() => setZoom(z => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
              disabled={zoom === ZOOM_LEVELS.length - 1}
              title="Zoom arriere"
            >
              <ZoomOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {allClients.length === 0 && !filterMember ? (
        <div className="gantt-empty">
          Aucun client assigne a un membre d'equipe
        </div>
      ) : (
        <div className="gantt-container">
          {/* Left: member names + client names */}
          <div className="gantt-sidebar">
            <div className="gantt-sidebar-header">Equipe / Projets</div>
            {rows.map((row, i) => {
              if (row.type === "member") {
                return (
                  <div
                    key={`m-${row.name}`}
                    className="gantt-sidebar-group"
                    onClick={() => toggleCollapse(row.name)}
                  >
                    <span className="gantt-sidebar-toggle">
                      {row.isCollapsed
                        ? <ChevronRight size={14} />
                        : <ChevronDown size={14} />
                      }
                    </span>
                    <Users size={13} className="gantt-sidebar-group-icon" />
                    <span className="gantt-sidebar-group-name">{row.name}</span>
                    <span className="gantt-sidebar-group-count">{row.count}</span>
                  </div>
                );
              }
              const c = row.client;
              const progress = getStageProgress(c.status);
              const color = getStageColor(c.status);
              return (
                <div key={`c-${row.memberName}-${c.id}`} className="gantt-sidebar-row gantt-sidebar-row-indent">
                  <div className="gantt-sidebar-client-info">
                    <div className="gantt-sidebar-company">{c.company || "—"}</div>
                    <div className="gantt-sidebar-meta">
                      <span className="gantt-sidebar-stage" style={{ color }}>{getStageLabel(c.status)}</span>
                      <span className="gantt-sidebar-progress-text">{progress}%</span>
                    </div>
                  </div>
                  <div className="gantt-sidebar-progress-bar">
                    <div className="gantt-sidebar-progress-fill" style={{ width: `${progress}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: timeline */}
          <div className="gantt-timeline-wrapper" ref={scrollRef}>
            <div className="gantt-timeline" style={{ width: totalWidth }}>
              {/* Column headers */}
              <div className="gantt-timeline-header">
                {columns.map((col, i) => {
                  const isToday = zoomLevel.key === "day" &&
                    col.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={i}
                      className={`gantt-col-header${isToday ? " today" : ""}`}
                      style={{ width: colWidth, minWidth: colWidth }}
                    >
                      {zoomLevel.key === "day"
                        ? col.getDate()
                        : zoomLevel.key === "week"
                          ? formatDate(col)
                          : formatMonth(col)
                      }
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              <div className="gantt-rows">
                {/* Grid lines */}
                <div className="gantt-grid-lines">
                  {columns.map((col, i) => {
                    const isToday = zoomLevel.key === "day" &&
                      col.toDateString() === new Date().toDateString();
                    const isWeekend = zoomLevel.key === "day" &&
                      (col.getDay() === 0 || col.getDay() === 6);
                    return (
                      <div
                        key={i}
                        className={`gantt-grid-col${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}`}
                        style={{ width: colWidth, minWidth: colWidth }}
                      />
                    );
                  })}
                </div>

                {/* Today marker */}
                <div
                  className="gantt-today-line"
                  ref={todayRef}
                  style={{ left: todayOffset }}
                />

                {/* Bars */}
                {rows.map((row, i) => {
                  if (row.type === "member") {
                    return (
                      <div key={`m-${row.name}`} className="gantt-row gantt-row-group" style={{ height: 40 }} />
                    );
                  }
                  const c = row.client;
                  const { left, width } = getBarStyle(c);
                  const color = getStageColor(c.status);
                  const progress = getStageProgress(c.status);
                  return (
                    <div key={`c-${row.memberName}-${c.id}`} className="gantt-row" style={{ height: 46 }}>
                      <div
                        className="gantt-bar gantt-bar-team"
                        style={{
                          left,
                          width,
                          backgroundColor: color + "18",
                          borderColor: color,
                        }}
                        title={`${c.company || c.name}\n${getStageLabel(c.status)} (${progress}%)\n${c.ganttStart.toLocaleDateString("fr-FR")} - aujourd'hui`}
                      >
                        {/* Progress fill inside bar */}
                        <div
                          className="gantt-bar-progress"
                          style={{ width: `${progress}%`, backgroundColor: color + "40" }}
                        />
                        <span className="gantt-bar-label" style={{ color }}>
                          {c.company || c.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="gantt-legend">
        {PIPELINE_STAGES.map(s => (
          <div key={s.key} className="gantt-legend-item">
            <div className="gantt-legend-dot" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
