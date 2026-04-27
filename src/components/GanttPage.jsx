import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, ZoomIn, ZoomOut, Calendar, MapPin, Plus, User, Trash2, Edit3 } from "lucide-react";
import { PIPELINE_STAGES } from "../App";
import ProjectModal from "./ProjectModal";

const ZOOM_LEVELS = [
  { key: "day", label: "Jours", colWidth: 44 },
  { key: "week", label: "Semaines", colWidth: 56 },
  { key: "month", label: "Mois", colWidth: 80 },
];

const ROW_HEIGHT = 56;

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
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStageColor(status) {
  const stage = PIPELINE_STAGES.find(s => s.key === status);
  return stage ? stage.color : "#71717a";
}

function getStageLabel(status) {
  const stage = PIPELINE_STAGES.find(s => s.key === status);
  return stage ? stage.label : status;
}

function fmtShort(d) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const TRAVAUX_EN_COURS = ["rdv_confirme", "rdv_termine", "acompte", "facturation"];

export default function GanttPage({
  clients, stages, projects = [], teamMembers = [],
  onBack, onSwitchView,
  onCreateProject, onUpdateProject, onDeleteProject,
  onRefreshClients, toast,
}) {
  const [zoom, setZoom] = useState(0);
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("en_cours");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [popover, setPopover] = useState(null); // { item, x, y }
  const scrollRef = useRef(null);
  const sidebarRef = useRef(null);
  const todayRef = useRef(null);

  const zoomLevel = ZOOM_LEVELS[zoom];
  const colWidth = zoomLevel.colWidth;

  // Sync sidebar scroll with timeline
  useEffect(() => {
    const timeline = scrollRef.current;
    const sidebar = sidebarRef.current;
    if (!timeline || !sidebar) return;
    const onScroll = () => { sidebar.scrollTop = timeline.scrollTop; };
    timeline.addEventListener("scroll", onScroll);
    return () => timeline.removeEventListener("scroll", onScroll);
  }, []);

  // Build unified items: clients (from pipeline) + manual projects
  const ganttItems = useMemo(() => {
    // Client-based items
    let clientItems = clients
      .filter(c => c.firstContactDate || c.createdAt)
      .map(c => {
        const startStr = c.firstContactDate || c.createdAt;
        const start = new Date(startStr.includes("T") ? startStr : startStr + "T00:00:00");
        const end = c.appointmentDate
          ? new Date(c.appointmentDate.includes("T") ? c.appointmentDate : c.appointmentDate + "T00:00:00")
          : null;
        return {
          id: `client-${c.id}`,
          type: "client",
          name: c.company || c.name || "—",
          subtitle: c.name,
          city: c.city,
          status: c.status,
          color: getStageColor(c.status),
          assignedTo: c.developedBy || c.contactedBy || null,
          ganttStart: start,
          ganttEnd: end,
          raw: c,
        };
      });

    if (filterStatus === "en_cours") {
      clientItems = clientItems.filter(c => TRAVAUX_EN_COURS.includes(c.status));
    } else if (filterStatus && filterStatus !== "all_and_projects") {
      clientItems = clientItems.filter(c => c.status === filterStatus);
    }

    // Project-based items
    let projectItems = projects.map(p => {
      const start = new Date(p.startDate.includes("T") ? p.startDate : p.startDate + "T00:00:00");
      const end = p.endDate
        ? new Date(p.endDate.includes("T") ? p.endDate : p.endDate + "T00:00:00")
        : null;
      return {
        id: `project-${p.id}`,
        type: "project",
        name: p.name,
        subtitle: p.company || null,
        city: p.city,
        status: null,
        color: p.color || "#6366f1",
        assignedTo: p.assignedTo,
        ganttStart: start,
        ganttEnd: end,
        raw: p,
      };
    });

    let all = [...clientItems, ...projectItems];

    // Filter by assignee
    if (filterAssignee) {
      all = all.filter(item => item.assignedTo === filterAssignee);
    }

    // Sort
    if (sortBy === "date") {
      all.sort((a, b) => a.ganttStart - b.ganttStart);
    } else if (sortBy === "status") {
      const order = PIPELINE_STAGES.map(s => s.key);
      all.sort((a, b) => {
        const ai = a.status ? order.indexOf(a.status) : 999;
        const bi = b.status ? order.indexOf(b.status) : 999;
        return ai - bi;
      });
    } else if (sortBy === "assignee") {
      all.sort((a, b) => (a.assignedTo || "zzz").localeCompare(b.assignedTo || "zzz", "fr"));
    } else {
      all.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
    }

    return all;
  }, [clients, projects, filterStatus, filterAssignee, sortBy]);

  // Unique assignees for the filter
  const allAssignees = useMemo(() => {
    const set = new Set();
    for (const c of clients) {
      if (c.developedBy) set.add(c.developedBy);
      if (c.contactedBy) set.add(c.contactedBy);
    }
    for (const p of projects) {
      if (p.assignedTo) set.add(p.assignedTo);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [clients, projects]);

  // Build columns & month groups
  const { timeStart, timeEnd, columns, monthGroups } = useMemo(() => {
    if (ganttItems.length === 0) {
      const now = new Date();
      return { timeStart: addDays(now, -30), timeEnd: addDays(now, 30), columns: [], monthGroups: [] };
    }

    const startDates = ganttItems.map(c => c.ganttStart);
    const endDates = ganttItems.filter(c => c.ganttEnd).map(c => c.ganttEnd);
    const minDate = new Date(Math.min(...startDates));
    const now = new Date();
    const maxEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : now;
    const latestDate = maxEnd > now ? maxEnd : now;

    let tStart, tEnd;
    if (zoomLevel.key === "day") {
      tStart = addDays(startOfWeek(minDate), -7);
      tEnd = addDays(latestDate, 14);
    } else if (zoomLevel.key === "week") {
      tStart = startOfWeek(addDays(minDate, -14));
      tEnd = addDays(latestDate, 28);
    } else {
      tStart = startOfMonth(addDays(minDate, -30));
      tEnd = addDays(latestDate, 60);
    }

    const cols = [];
    let cursor = new Date(tStart);
    while (cursor <= tEnd) {
      cols.push(new Date(cursor));
      if (zoomLevel.key === "day") cursor = addDays(cursor, 1);
      else if (zoomLevel.key === "week") cursor = addDays(cursor, 7);
      else cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const groups = [];
    let currentMonth = -1, currentYear = -1;
    cols.forEach((col, i) => {
      const m = col.getMonth(), y = col.getFullYear();
      if (m !== currentMonth || y !== currentYear) {
        groups.push({ month: m, year: y, startIdx: i, count: 1 });
        currentMonth = m; currentYear = y;
      } else {
        groups[groups.length - 1].count++;
      }
    });

    return { timeStart: tStart, timeEnd: tEnd, columns: cols, monthGroups: groups };
  }, [ganttItems, zoomLevel]);

  const totalDays = daysBetween(timeStart, timeEnd) || 1;
  const totalWidth = columns.length * colWidth;

  function getBarPos(item) {
    const start = daysBetween(timeStart, item.ganttStart);
    const endDate = item.ganttEnd || new Date();
    const duration = Math.max(1, daysBetween(item.ganttStart, endDate));
    const left = (start / totalDays) * totalWidth;
    const width = Math.max(24, (duration / totalDays) * totalWidth);
    return { left, width };
  }

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = todayRef.current.offsetLeft - containerWidth / 2;
    }
  }, [zoom, ganttItems.length]);

  const todayOffset = (daysBetween(timeStart, new Date()) / totalDays) * totalWidth;

  // Project CRUD handlers
  const handleSaveProject = useCallback(async (data) => {
    if (editingProject) {
      await onUpdateProject(editingProject.id, data);
    } else {
      await onCreateProject(data);
    }
    setShowProjectModal(false);
    setEditingProject(null);
  }, [editingProject, onCreateProject, onUpdateProject]);

  const handleEditProject = useCallback((project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  }, []);

  const handleDeleteProject = useCallback(async (projectId) => {
    if (confirm("Supprimer ce projet ?")) {
      await onDeleteProject(projectId);
    }
  }, [onDeleteProject]);

  // Inline assignee change for clients
  const handleAssignClient = useCallback(async (clientId, memberName) => {
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developedBy: memberName || null }),
      });
      if (toast) toast("Assignation mise à jour");
      if (onRefreshClients) onRefreshClients();
    } catch {
      if (toast) toast("Erreur", "error");
    }
  }, [toast]);

  const handleAssignProject = useCallback(async (projectId, memberName) => {
    await onUpdateProject(projectId, { assignedTo: memberName || null });
  }, [onUpdateProject]);

  // Open popover on bar click
  const handleBarClick = useCallback((e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      item,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
  }, []);

  // Save dates from popover
  const handlePopoverSave = useCallback(async (item, startDate, endDate) => {
    if (item.type === "project") {
      await onUpdateProject(item.raw.id, { startDate, endDate: endDate || null });
    } else {
      try {
        await fetch(`/api/clients/${item.raw.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstContactDate: startDate,
            appointmentDate: endDate || null,
          }),
        });
        if (onRefreshClients) onRefreshClients();
        if (toast) toast("Dates mises à jour");
      } catch {
        if (toast) toast("Erreur", "error");
      }
    }
    setPopover(null);
  }, [onUpdateProject, onRefreshClients, toast]);

  return (
    <div className="gc-page">
      {/* Top bar */}
      <div className="gc-topbar">
        <div className="gc-topbar-left">
          <button className="btn-icon" onClick={onBack}><ArrowLeft size={18} /></button>
          <h1>Planning des travaux</h1>
          <span className="gc-count">{ganttItems.length} projet{ganttItems.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="gc-topbar-right">
          <button
            className="btn btn-primary"
            style={{ height: 30, fontSize: 11, gap: 4, padding: "0 12px" }}
            onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
          >
            <Plus size={14} /> Projet
          </button>

          <div className="gantt-view-tabs">
            <button className="gantt-view-tab active">Calendrier</button>
            <button className="gantt-view-tab" onClick={onSwitchView}>Equipe</button>
          </div>

          <select className="form-select gc-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="en_cours">Travaux en cours</option>
            <option value="">Tous les statuts</option>
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <select className="form-select gc-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">Toutes les personnes</option>
            {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select className="form-select gc-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date">Tri par date</option>
            <option value="status">Tri par statut</option>
            <option value="assignee">Tri par personne</option>
            <option value="name">Tri par nom</option>
          </select>

          <div className="gc-zoom">
            <button className="btn-icon" onClick={() => setZoom(z => Math.max(0, z - 1))} disabled={zoom === 0}><ZoomIn size={15} /></button>
            <span className="gc-zoom-label">{zoomLevel.label}</span>
            <button className="btn-icon" onClick={() => setZoom(z => Math.min(ZOOM_LEVELS.length - 1, z + 1))} disabled={zoom === ZOOM_LEVELS.length - 1}><ZoomOut size={15} /></button>
          </div>
        </div>
      </div>

      {ganttItems.length === 0 ? (
        <div className="gc-empty">
          <Calendar size={40} strokeWidth={1} />
          <p>Aucun travail en cours</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
          >
            <Plus size={14} /> Ajouter un projet
          </button>
        </div>
      ) : (
        <div className="gc-body">
          {/* Sidebar */}
          <div className="gc-sidebar" ref={sidebarRef}>
            <div className="gc-sidebar-hdr" style={{ height: 68 }}>
              <span>Projets</span>
            </div>
            {ganttItems.map((item, i) => (
              <div key={item.id} className={`gc-sidebar-row${i % 2 === 0 ? " even" : ""}`}>
                <div className="gc-sidebar-dot" style={{ background: item.color }} />
                <div className="gc-sidebar-info">
                  <div className="gc-sidebar-company">
                    {item.type === "project" && <span className="gc-sidebar-badge">Projet</span>}
                    {item.name}
                  </div>
                  <div className="gc-sidebar-meta">
                    {item.status && (
                      <span className="gc-sidebar-status" style={{ color: item.color }}>{getStageLabel(item.status)}</span>
                    )}
                    {item.assignedTo && (
                      <span className="gc-sidebar-assignee"><User size={9} /> {item.assignedTo}</span>
                    )}
                    {item.city && (
                      <span className="gc-sidebar-city"><MapPin size={9} /> {item.city}</span>
                    )}
                  </div>
                </div>
                {item.type === "project" && (
                  <div className="gc-sidebar-actions">
                    <button className="btn-icon" onClick={() => handleEditProject(item.raw)} title="Modifier"><Edit3 size={12} /></button>
                    <button className="btn-icon" onClick={() => handleDeleteProject(item.raw.id)} title="Supprimer" style={{ color: "var(--danger)" }}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="gc-timeline-scroll" ref={scrollRef}>
            <div className="gc-timeline" style={{ width: totalWidth }}>
              {/* Dual header */}
              <div className="gc-header-months">
                {monthGroups.map((g, i) => (
                  <div key={i} className="gc-month-cell" style={{ width: g.count * colWidth }}>
                    {MONTH_NAMES[g.month]} {g.year}
                  </div>
                ))}
              </div>
              <div className="gc-header-cols">
                {columns.map((col, i) => {
                  const isToday = zoomLevel.key === "day" && col.toDateString() === new Date().toDateString();
                  const isWeekend = zoomLevel.key === "day" && (col.getDay() === 0 || col.getDay() === 6);
                  return (
                    <div
                      key={i}
                      className={`gc-col-header${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}`}
                      style={{ width: colWidth, minWidth: colWidth }}
                    >
                      {zoomLevel.key === "day" ? (
                        <>
                          <span className="gc-col-day-name">{col.toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                          <span className="gc-col-day-num">{col.getDate()}</span>
                        </>
                      ) : zoomLevel.key === "week" ? (
                        <span>{fmtShort(col)}</span>
                      ) : (
                        <span>{MONTH_NAMES[col.getMonth()].slice(0, 3)}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              <div className="gc-rows">
                <div className="gc-grid">
                  {columns.map((col, i) => {
                    const isToday = zoomLevel.key === "day" && col.toDateString() === new Date().toDateString();
                    const isWeekend = zoomLevel.key === "day" && (col.getDay() === 0 || col.getDay() === 6);
                    return (
                      <div
                        key={i}
                        className={`gc-grid-col${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}`}
                        style={{ width: colWidth, minWidth: colWidth }}
                      />
                    );
                  })}
                </div>

                {ganttItems.map((_, i) => (
                  <div key={i} className={`gc-row-bg${i % 2 === 0 ? " even" : ""}`} style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }} />
                ))}

                <div className="gc-today-line" ref={todayRef} style={{ left: todayOffset }} />

                {ganttItems.map((item, i) => {
                  const { left, width } = getBarPos(item);
                  const hasEnd = !!item.ganttEnd;
                  const isPast = item.ganttEnd && item.ganttEnd < new Date();
                  return (
                    <div
                      key={item.id}
                      className={`gc-bar${hasEnd ? " has-end" : ""}${isPast ? " past" : ""}${item.type === "project" ? " project" : ""}`}
                      style={{
                        top: i * ROW_HEIGHT + 10,
                        left,
                        width,
                        "--bar-color": item.color,
                      }}
                      title={`${item.name}${item.assignedTo ? ` — ${item.assignedTo}` : ""}\n${fmtShort(item.ganttStart)} → ${item.ganttEnd ? fmtShort(item.ganttEnd) : "en cours"}`}
                      onClick={(e) => handleBarClick(e, item)}
                    >
                      <div className="gc-bar-fill" />
                      <div className="gc-bar-content">
                        {item.assignedTo && (
                          <span className="gc-bar-avatar" title={item.assignedTo}>
                            {item.assignedTo.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="gc-bar-name">{item.name}</span>
                        <span className="gc-bar-dates">
                          {fmtShort(item.ganttStart)} → {item.ganttEnd ? fmtShort(item.ganttEnd) : "..."}
                        </span>
                      </div>
                      {hasEnd && <div className="gc-bar-end-marker" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="gc-legend">
        {PIPELINE_STAGES.filter(s => !filterStatus || filterStatus !== "en_cours" || TRAVAUX_EN_COURS.includes(s.key)).map(s => (
          <div key={s.key} className="gc-legend-item">
            <div className="gc-legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
        <div className="gc-legend-sep" />
        <div className="gc-legend-item">
          <div className="gc-legend-marker" />
          <span>Projet manuel</span>
        </div>
        <div className="gc-legend-item">
          <div className="gc-legend-diamond" />
          <span>Date de fin</span>
        </div>
      </div>

      {/* Date popover */}
      {popover && (
        <DatePopover
          item={popover.item}
          x={popover.x}
          y={popover.y}
          onSave={handlePopoverSave}
          onClose={() => setPopover(null)}
        />
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          teamMembers={teamMembers}
          onSave={handleSaveProject}
          onClose={() => { setShowProjectModal(false); setEditingProject(null); }}
        />
      )}
    </div>
  );
}

/* ---- Inline DatePopover component ---- */
function DatePopover({ item, x, y, onSave, onClose }) {
  const isProject = item.type === "project";
  const startLabel = isProject ? "Date de début" : "Premier contact";
  const endLabel = isProject ? "Date de fin" : "Date de rendue";

  const rawStart = isProject ? item.raw.startDate : (item.raw.firstContactDate || "");
  const rawEnd = isProject ? (item.raw.endDate || "") : (item.raw.appointmentDate || "");

  const [startDate, setStartDate] = useState(rawStart);
  const [endDate, setEndDate] = useState(rawEnd);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Clamp position to viewport
  const style = {
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - 220),
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(item, startDate, endDate);
  };

  return (
    <div className="gc-popover" ref={ref} style={style}>
      <div className="gc-popover-title">{item.name}</div>
      <form onSubmit={handleSubmit}>
        <div className="gc-popover-field">
          <label>{startLabel}</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
        </div>
        <div className="gc-popover-field">
          <label>{endLabel}</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="gc-popover-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
