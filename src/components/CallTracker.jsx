import { useState, useMemo } from "react";
import { X, Phone, PhoneOff, Clock, CalendarCheck, Minus, Plus, RotateCcw, User } from "lucide-react";

const COUNTER_TYPES = [
  { key: "calls", label: "Appels", icon: Phone, color: "#6366f1" },
  { key: "refus", label: "Refus", icon: PhoneOff, color: "#ef4444" },
  { key: "attente", label: "En attente", icon: Clock, color: "#f59e0b" },
  { key: "rdv", label: "RDV pris", icon: CalendarCheck, color: "#10b981" },
];

const EMPTY_COUNTERS = { calls: 0, refus: 0, attente: 0, rdv: 0 };

function loadStore() {
  try {
    const stored = localStorage.getItem("callflow-counters-v2");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === new Date().toISOString().split("T")[0]) {
        return parsed;
      }
    }
  } catch {}
  return { date: new Date().toISOString().split("T")[0], byMember: {} };
}

function saveStore(store) {
  localStorage.setItem("callflow-counters-v2", JSON.stringify(store));
}

export default function CallTracker({ teamMembers = [], onClose }) {
  const [store, setStore] = useState(loadStore);
  const [selectedMember, setSelectedMember] = useState("");

  const counters = selectedMember && store.byMember[selectedMember]
    ? store.byMember[selectedMember]
    : EMPTY_COUNTERS;

  const totalByMember = useMemo(() => {
    const result = {};
    for (const [name, c] of Object.entries(store.byMember)) {
      result[name] = c.calls + c.refus + c.attente + c.rdv;
    }
    return result;
  }, [store]);

  const updateMemberCounters = (fn) => {
    if (!selectedMember) return;
    setStore(prev => {
      const current = prev.byMember[selectedMember] || { ...EMPTY_COUNTERS };
      const updated = fn(current);
      const next = { ...prev, byMember: { ...prev.byMember, [selectedMember]: updated } };
      saveStore(next);
      return next;
    });
  };

  const increment = (key) => {
    updateMemberCounters(c => ({ ...c, [key]: c[key] + 1 }));
  };

  const decrement = (key) => {
    updateMemberCounters(c => c[key] <= 0 ? c : ({ ...c, [key]: c[key] - 1 }));
  };

  const resetCounters = () => {
    if (!selectedMember) return;
    setStore(prev => {
      const next = { ...prev, byMember: { ...prev.byMember, [selectedMember]: { ...EMPTY_COUNTERS } } };
      saveStore(next);
      return next;
    });
  };

  const totalCounters = counters.calls + counters.refus + counters.attente + counters.rdv;

  const globalTotal = useMemo(() => {
    let t = 0;
    for (const c of Object.values(store.byMember)) {
      t += c.calls + c.refus + c.attente + c.rdv;
    }
    return t;
  }, [store]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal call-tracker-modal">
        <div className="modal-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Phone size={18} />
            Compteur d'appels
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="ct-member-selector">
            <User size={14} className="ct-member-selector-icon" />
            <select
              className="form-select ct-member-select"
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
            >
              <option value="">-- Selectionner un membre --</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {!selectedMember ? (
            <div className="ct-no-member">
              Selectionnez un membre de l'equipe pour commencer a compter
            </div>
          ) : (
            <>
              <div className="ct-counters-grid">
                {COUNTER_TYPES.map(ct => {
                  const Icon = ct.icon;
                  const pct = totalCounters > 0 ? Math.round((counters[ct.key] / totalCounters) * 100) : 0;
                  return (
                    <div key={ct.key} className="ct-counter-card" style={{ "--counter-color": ct.color }}>
                      <div className="ct-counter-header">
                        <Icon size={16} style={{ color: ct.color }} />
                        <span className="ct-counter-label">{ct.label}</span>
                      </div>
                      <div className="ct-counter-value">{counters[ct.key]}</div>
                      <div className="ct-counter-bar-track">
                        <div className="ct-counter-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="ct-counter-pct">{pct}%</div>
                      <div className="ct-counter-actions">
                        <button
                          className="ct-counter-btn minus"
                          onClick={() => decrement(ct.key)}
                          disabled={counters[ct.key] <= 0}
                        >
                          <Minus size={16} />
                        </button>
                        <button
                          className="ct-counter-btn plus"
                          onClick={() => increment(ct.key)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ct-counters-footer">
                <div className="ct-counters-total">
                  Total {selectedMember} : <strong>{totalCounters}</strong>
                </div>
                <button className="btn btn-ghost ct-reset-btn" onClick={resetCounters}>
                  <RotateCcw size={13} />
                  Reinitialiser
                </button>
              </div>
            </>
          )}

          {Object.keys(store.byMember).length > 0 && (
            <div className="ct-summary">
              <div className="ct-summary-title">Recapitulatif du jour</div>
              <div className="ct-summary-table">
                <div className="ct-summary-header">
                  <span>Membre</span>
                  {COUNTER_TYPES.map(ct => {
                    const Icon = ct.icon;
                    return <span key={ct.key} title={ct.label}><Icon size={12} style={{ color: ct.color }} /></span>;
                  })}
                  <span>Total</span>
                </div>
                {Object.entries(store.byMember).map(([name, c]) => {
                  const memberTotal = totalByMember[name] || 0;
                  if (memberTotal === 0) return null;
                  return (
                    <div
                      key={name}
                      className={`ct-summary-row${name === selectedMember ? " active" : ""}`}
                      onClick={() => setSelectedMember(name)}
                    >
                      <span className="ct-summary-name">{name}</span>
                      {COUNTER_TYPES.map(ct => (
                        <span key={ct.key} className="ct-summary-val">{c[ct.key]}</span>
                      ))}
                      <span className="ct-summary-val total">{memberTotal}</span>
                    </div>
                  );
                })}
                {Object.keys(store.byMember).length > 1 && (
                  <div className="ct-summary-row ct-summary-total-row">
                    <span className="ct-summary-name">Total equipe</span>
                    {COUNTER_TYPES.map(ct => {
                      const sum = Object.values(store.byMember).reduce((s, c) => s + c[ct.key], 0);
                      return <span key={ct.key} className="ct-summary-val">{sum}</span>;
                    })}
                    <span className="ct-summary-val total">{globalTotal}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
