import { useState } from "react";
import { ArrowLeft, Trash2, Plus, Users } from "lucide-react";

export default function SettingsPage({ teamMembers, onBack, onMembersChange }) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        onMembersChange();
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/team-members/${id}`, { method: "DELETE" });
      onMembersChange();
    } catch {}
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="btn-icon" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <h1>Paramètres</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2 className="settings-section-title">
            <Users size={16} />
            Membres de l'équipe
          </h2>

          <form className="member-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              className="form-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nom du membre..."
            />
            <button type="submit" className="btn btn-primary" disabled={!newName.trim() || loading}>
              <Plus size={14} />
              Ajouter
            </button>
          </form>

          <div className="member-list">
            {teamMembers.map(member => (
              <div key={member.id} className="member-item">
                <span className="member-name">{member.name}</span>
                <button
                  className="btn-icon"
                  onClick={() => handleDelete(member.id)}
                  title="Supprimer"
                  style={{ color: "var(--danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <div className="member-empty">
                Aucun membre ajouté
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
