import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft, Edit3, Trash2, Mail, Phone, Building2, MapPin,
  DollarSign, Calendar, Globe, UserSearch, UserCheck, Code,
  PhoneCall, StickyNote, Tag, MessageCircle, X, Plus,
  Clock, FileText, MessageSquare, MoreHorizontal, ChevronDown, ChevronUp
} from "lucide-react";

const INTERACTION_TYPES = {
  email: { icon: Mail, label: "Email", color: "#3b82f6" },
  call: { icon: Phone, label: "Appel", color: "#10b981" },
  meeting: { icon: Calendar, label: "Réunion", color: "#8b5cf6" },
  note: { icon: FileText, label: "Note", color: "#f59e0b" },
  quote: { icon: MessageSquare, label: "Devis", color: "#06b6d4" },
  other: { icon: MoreHorizontal, label: "Autre", color: "#71717a" },
};

const EVENT_TYPES = {
  first_contact: { icon: UserSearch, label: "Premier contact", color: "#6366f1" },
  appointment: { icon: Calendar, label: "Rendez-vous", color: "#10b981" },
  follow_up: { icon: PhoneCall, label: "Relance prévue", color: "#f59e0b" },
  schedule_event: { icon: Clock, label: "Événement planifié", color: "#8b5cf6" },
};

export default function ClientPage({
  client, stages, allTags, teamMembers, scheduleEvents,
  onBack, onUpdateClient, onDeleteClient, onEditClient, onRefresh, toast
}) {
  const [notes, setNotes] = useState(client.notes || "");
  const [notesTimer, setNotesTimer] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: "call", summary: "", date: new Date().toISOString().split("T")[0], performedBy: ""
  });
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [timelineVisible, setTimelineVisible] = useState(() => window.innerWidth > 768);

  useEffect(() => {
    setNotes(client.notes || "");
  }, [client.id]);

  const fetchInteractions = useCallback(async () => {
    try {
      const res = await fetch(`/api/interactions?clientId=${client.id}`);
      const data = await res.json();
      setInteractions(data);
    } catch {}
  }, [client.id]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const handleNotesChange = useCallback((value) => {
    setNotes(value);
    if (notesTimer) clearTimeout(notesTimer);
    const timer = setTimeout(() => {
      onUpdateClient(client.id, { notes: value });
    }, 1000);
    setNotesTimer(timer);
  }, [client.id, onUpdateClient, notesTimer]);

  const handleStatusChange = useCallback((e) => {
    onUpdateClient(client.id, { status: e.target.value });
  }, [client.id, onUpdateClient]);

  const handleToggleCallback = useCallback(() => {
    onUpdateClient(client.id, { toCallback: !client.toCallback });
  }, [client.id, client.toCallback, onUpdateClient]);

  const handleDelete = useCallback(() => {
    if (confirm("Supprimer ce client ?")) {
      onDeleteClient(client.id);
      onBack();
    }
  }, [client.id, onDeleteClient, onBack]);

  const handleAddTag = useCallback(async (tagId) => {
    try {
      await fetch(`/api/clients/${client.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      onRefresh(client.id);
    } catch {}
  }, [client.id, onRefresh]);

  const handleRemoveTag = useCallback(async (tagId) => {
    try {
      await fetch(`/api/clients/${client.id}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      onRefresh(client.id);
    } catch {}
  }, [client.id, onRefresh]);

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!interactionForm.summary.trim()) return;
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, ...interactionForm }),
      });
      if (res.ok) {
        setInteractionForm({ type: "call", summary: "", date: new Date().toISOString().split("T")[0], performedBy: "" });
        setShowInteractionForm(false);
        fetchInteractions();
        toast?.("Interaction ajoutée");
      }
    } catch {
      toast?.("Erreur", "error");
    }
  };

  const handleDeleteInteraction = async (id) => {
    try {
      await fetch(`/api/interactions/${id}`, { method: "DELETE" });
      fetchInteractions();
    } catch {}
  };

  const phones = Array.isArray(client.phones) ? client.phones : [];
  const clientTagIds = (client.tags || []).map(t => t.id);
  const availableTags = allTags.filter(t => !clientTagIds.includes(t.id));
  const currentStage = stages.find(s => s.key === client.status);

  // Build timeline: merge interactions + key dates + schedule events
  const timelineItems = useMemo(() => {
    const items = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add interactions
    for (const inter of interactions) {
      const config = INTERACTION_TYPES[inter.type] || INTERACTION_TYPES.other;
      items.push({
        id: `inter-${inter.id}`,
        interactionId: inter.id,
        date: inter.date,
        type: "interaction",
        subType: inter.type,
        icon: config.icon,
        color: config.color,
        label: config.label,
        summary: inter.summary,
        performedBy: inter.performedBy,
        isFuture: new Date(inter.date + "T00:00:00") > today,
      });
    }

    // Add first contact date
    if (client.firstContactDate) {
      items.push({
        id: "first-contact",
        date: client.firstContactDate,
        type: "milestone",
        icon: EVENT_TYPES.first_contact.icon,
        color: EVENT_TYPES.first_contact.color,
        label: "Premier contact",
        summary: `Premier contact avec ${client.company || client.name || "le client"}`,
        isFuture: new Date(client.firstContactDate + "T00:00:00") > today,
      });
    }

    // Add appointment date
    if (client.appointmentDate) {
      items.push({
        id: "appointment",
        date: client.appointmentDate,
        type: "milestone",
        icon: EVENT_TYPES.appointment.icon,
        color: EVENT_TYPES.appointment.color,
        label: "Rendez-vous",
        summary: `Rendez-vous ${client.company ? `avec ${client.company}` : ""}${client.appointmentTime ? ` à ${client.appointmentTime}` : ""}`,
        isFuture: new Date(client.appointmentDate + "T00:00:00") > today,
      });
    }

    // Add follow-up date
    if (client.followUpDate) {
      items.push({
        id: "follow-up",
        date: client.followUpDate,
        type: "milestone",
        icon: EVENT_TYPES.follow_up.icon,
        color: EVENT_TYPES.follow_up.color,
        label: "Relance prévue",
        summary: "Date de relance programmée",
        isFuture: new Date(client.followUpDate + "T00:00:00") > today,
      });
    }

    // Add related schedule events (match by client name or company)
    if (scheduleEvents && scheduleEvents.length > 0) {
      const clientName = (client.name || "").toLowerCase();
      const clientCompany = (client.company || "").toLowerCase();

      for (const evt of scheduleEvents) {
        const title = (evt.title || "").toLowerCase();
        const desc = (evt.description || "").toLowerCase();
        const matches = (clientName && (title.includes(clientName) || desc.includes(clientName))) ||
          (clientCompany && (title.includes(clientCompany) || desc.includes(clientCompany)));

        if (matches) {
          items.push({
            id: `sched-${evt.id}`,
            date: evt.date,
            type: "schedule",
            icon: EVENT_TYPES.schedule_event.icon,
            color: evt.color || EVENT_TYPES.schedule_event.color,
            label: evt.title,
            summary: evt.description || `${evt.startTime || ""} ${evt.endTime ? `- ${evt.endTime}` : ""}`.trim(),
            performedBy: evt.assignedTo,
            isFuture: new Date(evt.date + "T00:00:00") > today,
          });
        }
      }
    }

    // Sort: future first (ascending), then past (descending)
    items.sort((a, b) => {
      const dateA = new Date(a.date + "T00:00:00");
      const dateB = new Date(b.date + "T00:00:00");
      if (a.isFuture && b.isFuture) return dateA - dateB;
      if (a.isFuture && !b.isFuture) return -1;
      if (!a.isFuture && b.isFuture) return 1;
      return dateB - dateA;
    });

    return items;
  }, [interactions, client, scheduleEvents]);

  const visibleTimeline = showAllTimeline ? timelineItems : timelineItems.slice(0, 8);

  const formatDate = (dateStr) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric"
    });
  };

  const formatDateShort = (dateStr) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "numeric", month: "short"
    });
  };

  return (
    <div className="client-page">
      {/* Header bar */}
      <div className="cp-header">
        <button className="cp-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>

        <div className="cp-header-center">
          <div className="cp-status-badge" style={{ backgroundColor: currentStage?.color + "20", color: currentStage?.color }}>
            {currentStage?.label || client.status}
          </div>
        </div>

        <div className="cp-header-actions">
          <button
            className={`btn btn-sm ${client.toCallback ? "btn-danger" : "btn-ghost"}`}
            onClick={handleToggleCallback}
          >
            <PhoneCall size={14} />
            {client.toCallback ? "À rappeler" : "Rappel"}
          </button>
          <button className="btn-icon" onClick={() => onEditClient(client)} title="Modifier">
            <Edit3 size={16} />
          </button>
          <button className="btn-icon" onClick={handleDelete} title="Supprimer" style={{ color: "var(--danger)" }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="cp-content">
        {/* Left: Client info */}
        <div className="cp-sidebar">
          {/* Identity */}
          <div className="cp-identity">
            <div className="cp-avatar">
              {(client.company || client.name || "?").charAt(0).toUpperCase()}
            </div>
            <h1 className="cp-company">{client.company || "Sans entreprise"}</h1>
            {client.name && <p className="cp-name">{client.name}</p>}
          </div>

          {/* Status */}
          <div className="cp-card">
            <div className="cp-card-title">
              <MessageCircle size={12} /> Statut
            </div>
            <select
              className="detail-status-select"
              value={client.status}
              onChange={handleStatusChange}
            >
              {stages.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Quick Info */}
          <div className="cp-card">
            <div className="cp-quick-grid">
              <div className="cp-quick-item">
                <Code size={14} className="cp-quick-icon" />
                <div>
                  <div className="cp-quick-label">Développé par</div>
                  <div className={`cp-quick-value${!client.developedBy ? " empty" : ""}`}>
                    {client.developedBy || "Non assigné"}
                  </div>
                </div>
              </div>
              <div className="cp-quick-item">
                <Calendar size={14} className="cp-quick-icon" />
                <div>
                  <div className="cp-quick-label">Date de rendue</div>
                  <div className={`cp-quick-value${!client.appointmentDate ? " empty" : ""}`}>
                    {client.appointmentDate ? formatDateShort(client.appointmentDate) + (client.appointmentTime ? ` ${client.appointmentTime}` : "") : "Non définie"}
                  </div>
                </div>
              </div>
              <div className="cp-quick-item">
                <DollarSign size={14} className="cp-quick-icon" />
                <div>
                  <div className="cp-quick-label">Budget estimé</div>
                  <div className={`cp-quick-value${!client.estimatedBudget ? " empty" : ""}`}>
                    {client.estimatedBudget ? `${client.estimatedBudget.toLocaleString("fr-FR")} €` : "Non défini"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="cp-card">
            <div className="cp-card-title">
              <Phone size={12} /> Contact
            </div>
            {client.email && (
              <div className="cp-field">
                <Mail size={14} className="cp-field-icon" />
                <div>
                  <div className="cp-field-label">Email</div>
                  <a href={`mailto:${client.email}`} className="cp-field-link">{client.email}</a>
                </div>
              </div>
            )}
            {phones.map((phone, i) => (
              <div key={i} className="cp-field">
                <Phone size={14} className="cp-field-icon" />
                <div>
                  <div className="cp-field-label">Téléphone{phones.length > 1 ? ` ${i + 1}` : ""}</div>
                  <a href={`tel:${phone}`} className="cp-field-link">{phone}</a>
                </div>
              </div>
            ))}
            {client.city && (
              <div className="cp-field">
                <MapPin size={14} className="cp-field-icon" />
                <div>
                  <div className="cp-field-label">Ville</div>
                  <div className="cp-field-value">{client.city}</div>
                </div>
              </div>
            )}
          </div>

          {/* Sites web */}
          {((client.websites || []).length > 0 || client.noWebsite || client.uglyWebsite) && (
            <div className="cp-card">
              <div className="cp-card-title">
                <Globe size={12} /> Sites web
              </div>
              {(client.websites || []).map((site, i) => (
                <div key={i} className="cp-field">
                  <Globe size={14} className="cp-field-icon" />
                  <div>
                    <a
                      href={site.startsWith("http") ? site : `https://${site}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-field-link"
                    >
                      {site}
                    </a>
                  </div>
                </div>
              ))}
              {client.noWebsite && (
                <div className="cp-field">
                  <Globe size={14} className="cp-field-icon" style={{ opacity: 0.4 }} />
                  <div className="cp-field-value" style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Pas de site web</div>
                </div>
              )}
              {client.uglyWebsite && (
                <div className="cp-field">
                  <Globe size={14} className="cp-field-icon" style={{ color: "var(--warning, #f59e0b)" }} />
                  <div className="cp-field-value" style={{ color: "var(--warning, #f59e0b)" }}>Site web degueu</div>
                </div>
              )}
            </div>
          )}

          {/* Team */}
          <div className="cp-card">
            <div className="cp-card-title">
              <UserCheck size={12} /> Équipe
            </div>
            {client.foundBy && (
              <div className="cp-field">
                <UserSearch size={14} className="cp-field-icon" />
                <div>
                  <div className="cp-field-label">Trouvé par</div>
                  <div className="cp-field-value">{client.foundBy}</div>
                </div>
              </div>
            )}
            {client.contactedBy && (
              <div className="cp-field">
                <Phone size={14} className="cp-field-icon" />
                <div>
                  <div className="cp-field-label">Contacté par</div>
                  <div className="cp-field-value">{client.contactedBy}</div>
                </div>
              </div>
            )}
            {client.developedBy && (
              <div className="cp-field">
                <Code size={14} className="cp-field-icon" />
                <div>
                  <div className="cp-field-label">Développé par</div>
                  <div className="cp-field-value">{client.developedBy}</div>
                </div>
              </div>
            )}
            {!client.foundBy && !client.contactedBy && !client.developedBy && (
              <div className="cp-empty">Aucun membre assigné</div>
            )}
          </div>

          {/* Tags */}
          <div className="cp-card">
            <div className="cp-card-title">
              <Tag size={12} /> Tags
            </div>
            <div className="detail-tags">
              {(client.tags || []).map(tag => (
                <span
                  key={tag.id}
                  className="detail-tag"
                  style={{ backgroundColor: tag.color + "20", color: tag.color }}
                >
                  {tag.name}
                  <span className="tag-remove" onClick={() => handleRemoveTag(tag.id)}>
                    <X size={10} />
                  </span>
                </span>
              ))}
            </div>
            {availableTags.length > 0 && (
              <div className="tag-selector-wrapper" style={{ marginTop: 8 }}>
                <div className="tag-selector">
                  {availableTags.map(tag => (
                    <span
                      key={tag.id}
                      className="tag-option"
                      style={{ backgroundColor: tag.color + "15", color: tag.color }}
                      onClick={() => handleAddTag(tag.id)}
                    >
                      + {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="cp-card">
            <div className="cp-card-title">
              <StickyNote size={12} /> Notes
            </div>
            <textarea
              className="detail-notes"
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Ajouter des notes..."
            />
          </div>
        </div>

        {/* Timeline toggle (mobile only) */}
        <button
          className={`cp-timeline-mobile-toggle${!timelineVisible ? " cp-timeline-mobile-toggle--bottom" : ""}`}
          onClick={() => setTimelineVisible(!timelineVisible)}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} />
            Chronologie
          </span>
          {timelineVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Right: Timeline */}
        <div className={`cp-main${!timelineVisible ? " cp-main-hidden" : ""}`}>
          <div className="cp-timeline-header">
            <h2 className="cp-timeline-title">
              <Clock size={16} />
              Chronologie
            </h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => { setTimelineVisible(true); setShowInteractionForm(!showInteractionForm); }}
              >
                <Plus size={14} />
                Ajouter
              </button>
            </div>
          </div>

          {/* Interaction form */}
          {timelineVisible && showInteractionForm && (
            <form className="cp-interaction-form" onSubmit={handleAddInteraction}>
              <div className="cp-form-row">
                <select
                  className="form-select"
                  value={interactionForm.type}
                  onChange={e => setInteractionForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  {Object.entries(INTERACTION_TYPES).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="form-input"
                  value={interactionForm.date}
                  onChange={e => setInteractionForm(prev => ({ ...prev, date: e.target.value }))}
                />
                <select
                  className="form-select"
                  value={interactionForm.performedBy}
                  onChange={e => setInteractionForm(prev => ({ ...prev, performedBy: e.target.value }))}
                >
                  <option value="">Effectué par...</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="form-textarea"
                value={interactionForm.summary}
                onChange={e => setInteractionForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Résumé de l'interaction..."
                required
              />
              <div className="cp-form-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowInteractionForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Ajouter
                </button>
              </div>
            </form>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <>
              <div className="cp-timeline">
                {visibleTimeline.length === 0 && (
                  <div className="cp-empty" style={{ padding: 40 }}>
                    Aucun événement dans la chronologie
                  </div>
                )}

                {visibleTimeline.map((item, idx) => {
                  const Icon = item.icon;
                  const isFirst = idx === 0;
                  const prevItem = idx > 0 ? visibleTimeline[idx - 1] : null;
                  const showFutureDivider = item.isFuture && isFirst;
                  const showPastDivider = !item.isFuture && prevItem?.isFuture;

                  return (
                    <div key={item.id}>
                      {showFutureDivider && (
                        <div className="cp-timeline-divider future">
                          <span>À venir</span>
                        </div>
                      )}
                      {showPastDivider && (
                        <div className="cp-timeline-divider past">
                          <span>Passé</span>
                        </div>
                      )}
                      <div className={`cp-timeline-item${item.isFuture ? " future" : ""}`}>
                        <div className="cp-timeline-line">
                          <div
                            className="cp-timeline-dot"
                            style={{ backgroundColor: item.color + "30", borderColor: item.color }}
                          >
                            <Icon size={12} style={{ color: item.color }} />
                          </div>
                          {idx < visibleTimeline.length - 1 && <div className="cp-timeline-connector" />}
                        </div>
                        <div className="cp-timeline-content">
                          <div className="cp-timeline-meta">
                            <span className="cp-timeline-type" style={{ color: item.color }}>
                              {item.label}
                            </span>
                            <span className="cp-timeline-date">
                              {formatDate(item.date)}
                            </span>
                          </div>
                          {item.summary && (
                            <div className="cp-timeline-summary">{item.summary}</div>
                          )}
                          {item.performedBy && (
                            <div className="cp-timeline-performer">
                              <UserCheck size={10} />
                              {item.performedBy}
                            </div>
                          )}
                          {item.interactionId && (
                            <button
                              className="cp-timeline-delete"
                              onClick={() => handleDeleteInteraction(item.interactionId)}
                              title="Supprimer"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {timelineItems.length > 8 && (
                <button
                  className="cp-timeline-toggle"
                  onClick={() => setShowAllTimeline(!showAllTimeline)}
                >
                  {showAllTimeline ? (
                    <><ChevronUp size={14} /> Voir moins</>
                  ) : (
                    <><ChevronDown size={14} /> Voir tout ({timelineItems.length} événements)</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
