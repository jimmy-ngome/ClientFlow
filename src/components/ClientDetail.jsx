import { useState, useEffect, useCallback } from "react";
import {
  X, Edit3, Trash2, Mail, Phone, Building2, MapPin,
  DollarSign, Calendar, Globe, UserSearch, UserCheck, Code,
  PhoneCall, StickyNote, Tag, MessageCircle, ChevronDown, ChevronUp
} from "lucide-react";
import InteractionLog from "./InteractionLog";

export default function ClientDetail({
  client, stages, allTags, teamMembers, onClose, onUpdateClient, onDeleteClient,
  onEditClient, onRefresh, toast
}) {
  const [notes, setNotes] = useState(client.notes || "");
  const [notesTimer, setNotesTimer] = useState(null);
  const [showTimeline, setShowTimeline] = useState(() => window.innerWidth > 768);

  useEffect(() => {
    setNotes(client.notes || "");
  }, [client.id]);

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
    }
  }, [client.id, onDeleteClient]);

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

  const phones = Array.isArray(client.phones) ? client.phones : [];
  const clientTagIds = (client.tags || []).map(t => t.id);
  const availableTags = allTags.filter(t => !clientTagIds.includes(t.id));

  return (
    <div className="detail-overlay">
      <div className="detail-backdrop" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-header">
          <div className="detail-header-info">
            <h2>{client.company || "Sans entreprise"}</h2>
            {client.name && <p>{client.name}</p>}
          </div>
          <div className="detail-actions">
            <button className="btn-icon" onClick={() => onEditClient(client)} title="Modifier">
              <Edit3 size={16} />
            </button>
            <button className="btn-icon" onClick={handleDelete} title="Supprimer" style={{ color: "var(--danger)" }}>
              <Trash2 size={16} />
            </button>
            <button className="btn-icon" onClick={onClose} title="Fermer">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="detail-body">
          {/* Status */}
          <div className="detail-section">
            <div className="detail-section-title">
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

          {/* Quick info: développeur + date de rendue */}
          <div className="detail-quick-info">
            <div className="detail-quick-item">
              <Code size={14} className="detail-quick-icon" />
              <div className="detail-quick-content">
                <div className="detail-quick-label">Développé par</div>
                <div className={`detail-quick-value${!client.developedBy ? " empty" : ""}`}>
                  {client.developedBy || "Non assigné"}
                </div>
              </div>
            </div>
            <div className="detail-quick-item">
              <Calendar size={14} className="detail-quick-icon" />
              <div className="detail-quick-content">
                <div className="detail-quick-label">Date de rendue</div>
                <div className={`detail-quick-value${!client.appointmentDate ? " empty" : ""}`}>
                  {client.appointmentDate
                    ? new Date(client.appointmentDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + (client.appointmentTime ? ` à ${client.appointmentTime}` : "")
                    : "Non définie"}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="detail-section">
            <div className="detail-section-title">
              <Phone size={12} /> Contact
            </div>

            {client.email && (
              <div className="detail-field">
                <Mail size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Email</div>
                  <div className="detail-field-value">
                    <a href={`mailto:${client.email}`}>{client.email}</a>
                  </div>
                </div>
              </div>
            )}

            {phones.length > 0 && phones.map((phone, i) => (
              <div key={i} className="detail-field">
                <Phone size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Téléphone {phones.length > 1 ? i + 1 : ""}</div>
                  <div className="detail-field-value">
                    <a href={`tel:${phone}`}>{phone}</a>
                  </div>
                </div>
              </div>
            ))}

            {client.city && (
              <div className="detail-field">
                <MapPin size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Ville</div>
                  <div className="detail-field-value">{client.city}</div>
                </div>
              </div>
            )}

          </div>

          {/* Sites web */}
          {((client.websites || []).length > 0 || client.noWebsite || client.uglyWebsite) && (
            <div className="detail-section">
              <div className="detail-section-title">
                <Globe size={12} /> Sites web
              </div>
              {(client.websites || []).map((site, i) => (
                <div key={i} className="detail-field">
                  <Globe size={14} className="detail-field-icon" />
                  <div className="detail-field-content">
                    <div className="detail-field-value">
                      <a href={site.startsWith("http") ? site : `https://${site}`} target="_blank" rel="noopener noreferrer">
                        {site}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {client.noWebsite && (
                <div className="detail-field">
                  <Globe size={14} className="detail-field-icon" style={{ opacity: 0.4 }} />
                  <div className="detail-field-content">
                    <div className="detail-field-value" style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Pas de site web</div>
                  </div>
                </div>
              )}
              {client.uglyWebsite && (
                <div className="detail-field">
                  <Globe size={14} className="detail-field-icon" style={{ color: "var(--warning, #f59e0b)" }} />
                  <div className="detail-field-content">
                    <div className="detail-field-value" style={{ color: "var(--warning, #f59e0b)" }}>Site web degueu</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Business Info */}
          <div className="detail-section">
            <div className="detail-section-title">
              <DollarSign size={12} /> Business
            </div>

            <div className="detail-field">
              <DollarSign size={14} className="detail-field-icon" />
              <div className="detail-field-content">
                <div className="detail-field-label">Budget estimé</div>
                <div className={`detail-field-value${!client.estimatedBudget ? " empty" : ""}`}>
                  {client.estimatedBudget ? `${client.estimatedBudget.toLocaleString("fr-FR")} €` : "Non défini"}
                </div>
              </div>
            </div>

            {client.firstContactDate && (
              <div className="detail-field">
                <Calendar size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Premier contact</div>
                  <div className="detail-field-value">
                    {new Date(client.firstContactDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
            )}

            {client.appointmentDate && (
              <div className="detail-field">
                <Calendar size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Date de rendez-vous</div>
                  <div className="detail-field-value">
                    {new Date(client.appointmentDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}{client.appointmentTime ? ` à ${client.appointmentTime}` : ""}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Team */}
          <div className="detail-section">
            <div className="detail-section-title">
              <UserCheck size={12} /> Équipe
            </div>

            {client.foundBy && (
              <div className="detail-field">
                <UserSearch size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Trouvé par</div>
                  <div className="detail-field-value">{client.foundBy}</div>
                </div>
              </div>
            )}

            {client.contactedBy && (
              <div className="detail-field">
                <Phone size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Contacté par</div>
                  <div className="detail-field-value">{client.contactedBy}</div>
                </div>
              </div>
            )}

            {client.developedBy && (
              <div className="detail-field">
                <Code size={14} className="detail-field-icon" />
                <div className="detail-field-content">
                  <div className="detail-field-label">Développé par</div>
                  <div className="detail-field-value">{client.developedBy}</div>
                </div>
              </div>
            )}
          </div>

          {/* Callback */}
          <div className="detail-section">
            <button
              className={`btn ${client.toCallback ? "btn-danger" : "btn-secondary"}`}
              onClick={handleToggleCallback}
              style={{ width: "100%" }}
            >
              <PhoneCall size={14} />
              {client.toCallback ? "Marquer comme rappelé" : "À rappeler"}
            </button>
          </div>

          {/* Tags */}
          <div className="detail-section">
            <div className="detail-section-title">
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
              <div className="tag-selector-wrapper">
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
          <div className="detail-section">
            <div className="detail-section-title">
              <StickyNote size={12} /> Notes
            </div>
            <textarea
              className="detail-notes"
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Ajouter des notes..."
            />
          </div>

          {/* Interactions */}
          <button
            className="timeline-toggle"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MessageCircle size={12} /> Frise chronologique
            </span>
            {showTimeline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showTimeline && (
            <div className="detail-section">
              <InteractionLog clientId={client.id} teamMembers={teamMembers} toast={toast} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
