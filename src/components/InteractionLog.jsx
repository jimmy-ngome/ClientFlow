import { useState, useEffect, useCallback } from "react";
import { Mail, Phone, Calendar, FileText, MessageSquare, MoreHorizontal, Plus, Trash2 } from "lucide-react";

const TYPE_CONFIG = {
  email: { icon: Mail, label: "Email", color: "#3b82f6" },
  call: { icon: Phone, label: "Appel", color: "#10b981" },
  meeting: { icon: Calendar, label: "Réunion", color: "#8b5cf6" },
  note: { icon: FileText, label: "Note", color: "#f59e0b" },
  quote: { icon: MessageSquare, label: "Devis", color: "#06b6d4" },
  other: { icon: MoreHorizontal, label: "Autre", color: "#71717a" },
};

export default function InteractionLog({ clientId, teamMembers = [], toast }) {
  const [interactions, setInteractions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "call", summary: "", date: new Date().toISOString().split("T")[0], performedBy: "" });

  const fetchInteractions = useCallback(async () => {
    try {
      const res = await fetch(`/api/interactions?clientId=${clientId}`);
      const data = await res.json();
      setInteractions(data);
    } catch {}
  }, [clientId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.summary.trim()) return;

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, ...form }),
      });
      if (res.ok) {
        setForm({ type: "call", summary: "", date: new Date().toISOString().split("T")[0], performedBy: "" });
        setShowForm(false);
        fetchInteractions();
        toast?.("Interaction ajoutée");
      }
    } catch {
      toast?.("Erreur", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/interactions/${id}`, { method: "DELETE" });
      fetchInteractions();
    } catch {}
  };

  return (
    <div>
      <div className="detail-section-title" style={{ justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={12} /> Interactions ({interactions.length})
        </span>
        <button
          className="btn-icon"
          onClick={() => setShowForm(!showForm)}
          style={{ width: 24, height: 24 }}
        >
          <Plus size={14} />
        </button>
      </div>

      {showForm && (
        <form className="interaction-form" onSubmit={handleAdd}>
          <div className="interaction-form-row">
            <select
              className="form-select"
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
            >
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <select
            className="form-select"
            value={form.performedBy}
            onChange={e => setForm(prev => ({ ...prev, performedBy: e.target.value }))}
            style={{ height: 34, fontSize: 12 }}
          >
            <option value="">Effectué par...</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
          <textarea
            className="form-textarea"
            value={form.summary}
            onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))}
            placeholder="Résumé de l'interaction..."
            required
          />
          <div className="interaction-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ height: 30, fontSize: 12 }}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" style={{ height: 30, fontSize: 12 }}>
              Ajouter
            </button>
          </div>
        </form>
      )}

      <div className="interaction-list">
        {interactions.map(inter => {
          const config = TYPE_CONFIG[inter.type] || TYPE_CONFIG.other;
          const Icon = config.icon;

          return (
            <div key={inter.id} className="interaction-item">
              <div className="interaction-icon" style={{ backgroundColor: config.color + "20", color: config.color }}>
                <Icon size={14} />
              </div>
              <div className="interaction-content">
                <div className="interaction-type" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="interaction-summary">{inter.summary}</div>
                {inter.performedBy && (
                  <div className="interaction-date" style={{ color: "var(--accent-light)" }}>
                    {inter.performedBy}
                  </div>
                )}
                <div className="interaction-date">
                  {new Date(inter.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <button
                className="btn-icon interaction-delete"
                onClick={() => handleDelete(inter.id)}
                style={{ width: 24, height: 24 }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}

        {interactions.length === 0 && !showForm && (
          <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: 16 }}>
            Aucune interaction
          </div>
        )}
      </div>
    </div>
  );
}
