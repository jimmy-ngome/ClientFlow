import { useState, useEffect } from "react";
import { X } from "lucide-react";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#22c55e",
];

export default function ProjectModal({ project, teamMembers = [], onSave, onClose }) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    city: "",
    assignedTo: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
    color: "#6366f1",
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || "",
        company: project.company || "",
        city: project.city || "",
        assignedTo: project.assignedTo || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        notes: project.notes || "",
        color: project.color || "#6366f1",
      });
    }
  }, [project]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      company: form.company.trim() || null,
      city: form.city.trim() || null,
      assignedTo: form.assignedTo || null,
      startDate: form.startDate,
      endDate: form.endDate || null,
      notes: form.notes.trim() || null,
      color: form.color,
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{project ? "Modifier le projet" : "Nouveau projet"}</h2>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Nom du projet *</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={e => updateField("name", e.target.value)}
                placeholder="Ex: Refonte site web"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Entreprise / Client</label>
              <input
                type="text"
                className="form-input"
                value={form.company}
                onChange={e => updateField("company", e.target.value)}
                placeholder="Nom du client"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ville</label>
              <input
                type="text"
                className="form-input"
                value={form.city}
                onChange={e => updateField("city", e.target.value)}
                placeholder="Ville"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date de début *</label>
              <input
                type="date"
                className="form-input"
                value={form.startDate}
                onChange={e => updateField("startDate", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date de fin</label>
              <input
                type="date"
                className="form-input"
                value={form.endDate}
                onChange={e => updateField("endDate", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigné à</label>
              <select
                className="form-select"
                value={form.assignedTo}
                onChange={e => updateField("assignedTo", e.target.value)}
              >
                <option value="">— Non assigné —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div className="pm-colors">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`pm-color-btn${form.color === c ? " active" : ""}`}
                    style={{ background: c }}
                    onClick={() => updateField("color", c)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={e => updateField("notes", e.target.value)}
                placeholder="Notes sur le projet..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary">
            {project ? "Enregistrer" : "Créer le projet"}
          </button>
        </div>
      </form>
    </div>
  );
}
