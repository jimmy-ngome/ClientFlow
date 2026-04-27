import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Search, MapPin, Loader2, Star, ChevronRight } from "lucide-react";
import { PIPELINE_STAGES } from "../App";

export default function ClientModal({ client, stages, teamMembers = [], cities = [], onSave, onClose }) {
  const pipelineStages = stages || PIPELINE_STAGES;
  const [form, setForm] = useState({
    company: "",
    lastName: "",
    firstName: "",
    email: "",
    phones: [""],
    city: "",
    status: "prospect",
    estimatedBudget: "",
    firstContactDate: "",
    appointmentDate: "",
    appointmentTime: "",

    foundBy: "",
    contactedBy: "",
    developedBy: "",
    websites: [""],
    address: "",
    googleMapsUrl: "",
    notes: "",
    toCallback: false,
    noWebsite: false,
    uglyWebsite: false,
    reviewCount: "",
  });

  useEffect(() => {
    if (client) {
      const nameParts = (client.name || "").split(" ");
      const lastName = nameParts[0] || "";
      const firstName = nameParts.slice(1).join(" ") || "";
      setForm({
        company: client.company || "",
        lastName,
        firstName,
        email: client.email || "",
        phones: Array.isArray(client.phones) && client.phones.length > 0 ? client.phones : [""],
        city: client.city || "",
        status: client.status || "prospect",
        estimatedBudget: client.estimatedBudget || "",
        firstContactDate: client.firstContactDate || "",
        appointmentDate: client.appointmentDate || "",
        appointmentTime: client.appointmentTime || "",

        foundBy: client.foundBy || "",
        contactedBy: client.contactedBy || "",
        developedBy: client.developedBy || "",
        websites: Array.isArray(client.websites) && client.websites.length > 0 ? client.websites : [""],
        address: client.address || "",
        googleMapsUrl: client.googleMapsUrl || "",
        notes: client.notes || "",
        toCallback: client.toCallback || false,
        noWebsite: client.noWebsite || false,
        uglyWebsite: client.uglyWebsite || false,
        reviewCount: client.reviewCount || "",
      });
      setCitySearch(client.city || "");
    }
  }, [client]);

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResults, setLookupResults] = useState([]);

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResults([]);
    try {
      const res = await fetch(`/api/prospect-lookup?q=${encodeURIComponent(lookupQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Erreur lors de la recherche");
        return;
      }
      if (data.length === 1) {
        selectResult(data[0]);
      } else {
        setLookupResults(data);
      }
    } catch {
      setLookupError("Erreur réseau");
    } finally {
      setLookupLoading(false);
    }
  };

  const selectResult = (data) => {
    const noteParts = [];
    if (data.rating) noteParts.push(`Note Google: ${data.rating}/5`);
    if (data.reviewCount) noteParts.push(`Nombre d'avis: ${data.reviewCount}`);
    const autoNotes = noteParts.length > 0 ? noteParts.join(" — ") : "";

    setForm(prev => ({
      ...prev,
      company: data.name || prev.company,
      phones: data.phone ? [data.phone] : prev.phones,
      websites: data.website ? [data.website] : prev.websites,
      city: data.city || prev.city,
      address: data.address || prev.address,
      googleMapsUrl: data.googleMapsUrl || prev.googleMapsUrl,
      notes: autoNotes || prev.notes,
      noWebsite: !data.website ? true : prev.noWebsite,
      reviewCount: data.reviewCount || prev.reviewCount,
    }));
    setCitySearch(data.city || "");
    setLookupResults([]);
    setLookupQuery("");
  };

  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const cityRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setCityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );
  const exactMatch = cities.some(c => c.toLowerCase() === citySearch.toLowerCase());

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addPhone = () => {
    setForm(prev => ({ ...prev, phones: [...prev.phones, ""] }));
  };

  const updatePhone = (index, value) => {
    setForm(prev => {
      const phones = [...prev.phones];
      phones[index] = value;
      return { ...prev, phones };
    });
  };

  const removePhone = (index) => {
    setForm(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
  };

  const addWebsite = () => {
    setForm(prev => ({ ...prev, websites: [...prev.websites, ""] }));
  };

  const updateWebsite = (index, value) => {
    setForm(prev => {
      const websites = [...prev.websites];
      websites[index] = value;
      return { ...prev, websites };
    });
  };

  const removeWebsite = (index) => {
    setForm(prev => ({
      ...prev,
      websites: prev.websites.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { lastName, firstName, ...rest } = form;
    const name = [lastName, firstName].filter(Boolean).join(" ").trim();
    const data = {
      ...rest,
      name,
      estimatedBudget: form.estimatedBudget ? parseFloat(form.estimatedBudget) : null,
      phones: form.phones.filter(p => p.trim()),
      firstContactDate: form.firstContactDate || null,
      appointmentDate: form.appointmentDate || null,
      appointmentTime: form.appointmentTime || null,
      city: form.city.trim() || null,
      email: form.email.trim() || null,
      foundBy: form.foundBy || null,
      contactedBy: form.contactedBy || null,
      developedBy: form.developedBy || null,
      websites: form.websites.filter(w => w.trim()),
      address: form.address.trim() || null,
      googleMapsUrl: form.googleMapsUrl.trim() || null,
      noWebsite: form.noWebsite,
      uglyWebsite: form.uglyWebsite,
      reviewCount: form.reviewCount || null,
    };
    onSave(data);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{client ? "Modifier le client" : "Nouveau client"}</h2>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!client && (
            <div className="prospect-lookup">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} />
                Remplissage auto via Google Maps
              </label>
              <div className="prospect-lookup-row">
                <input
                  type="text"
                  className="form-input"
                  value={lookupQuery}
                  onChange={e => { setLookupQuery(e.target.value); setLookupError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleLookup(); } }}
                  placeholder="Nom du business ou lien Google Maps..."
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleLookup}
                  disabled={lookupLoading || !lookupQuery.trim()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {lookupLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                  {lookupLoading ? "Recherche..." : "Rechercher"}
                </button>
              </div>
              {lookupError && <div className="prospect-lookup-msg error">{lookupError}</div>}
              {lookupResults.length > 0 && (
                <div className="prospect-lookup-results">
                  <div className="prospect-lookup-hint">Plusieurs résultats — choisis le bon :</div>
                  {lookupResults.map((r) => (
                    <button
                      key={r.placeId}
                      type="button"
                      className="prospect-lookup-item"
                      onClick={() => selectResult(r)}
                    >
                      <div className="prospect-lookup-item-info">
                        <span className="prospect-lookup-item-name">{r.name}</span>
                        <span className="prospect-lookup-item-addr">{r.address}</span>
                      </div>
                      <div className="prospect-lookup-item-meta">
                        {r.rating && (
                          <span className="prospect-lookup-item-rating">
                            <Star size={11} /> {r.rating}{r.reviewCount ? ` (${r.reviewCount} avis)` : ""}
                          </span>
                        )}
                        <ChevronRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Entreprise *</label>
              <input
                type="text"
                className="form-input"
                value={form.company}
                onChange={e => updateField("company", e.target.value)}
                placeholder="Nom de l'entreprise"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nom</label>
              <input
                type="text"
                className="form-input"
                value={form.lastName}
                onChange={e => updateField("lastName", e.target.value)}
                placeholder="Nom"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input
                type="text"
                className="form-input"
                value={form.firstName}
                onChange={e => updateField("firstName", e.target.value)}
                placeholder="Prénom"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={e => updateField("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Téléphones</label>
              <div className="form-phones">
                {form.phones.map((phone, i) => (
                  <div key={i} className="form-phone-row">
                    <input
                      type="tel"
                      className="form-input"
                      value={phone}
                      onChange={e => updatePhone(i, e.target.value)}
                      placeholder="06 12 34 56 78"
                    />
                    {form.phones.length > 1 && (
                      <button type="button" className="btn-icon" onClick={() => removePhone(i)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost" onClick={addPhone} style={{ alignSelf: "flex-start", height: 28, fontSize: 12 }}>
                  <Plus size={12} /> Ajouter un numéro
                </button>
              </div>
            </div>

            <div className="form-group" ref={cityRef}>
              <label className="form-label">Ville</label>
              <div className="city-combo">
                <input
                  type="text"
                  className="form-input"
                  value={citySearch}
                  onChange={e => {
                    setCitySearch(e.target.value);
                    updateField("city", e.target.value);
                    setCityOpen(true);
                  }}
                  onFocus={() => setCityOpen(true)}
                  placeholder="Rechercher ou ajouter une ville"
                  autoComplete="off"
                />
                {cityOpen && (citySearch.trim() !== "" || cities.length > 0) && (
                  <div className="city-combo-dropdown">
                    {filteredCities.map(c => (
                      <div
                        key={c}
                        className={`city-combo-option${form.city === c ? " selected" : ""}`}
                        onMouseDown={() => {
                          updateField("city", c);
                          setCitySearch(c);
                          setCityOpen(false);
                        }}
                      >
                        {c}
                      </div>
                    ))}
                    {citySearch.trim() && !exactMatch && (
                      <div
                        className="city-combo-option city-combo-add"
                        onMouseDown={() => {
                          const trimmed = citySearch.trim();
                          updateField("city", trimmed);
                          setCitySearch(trimmed);
                          setCityOpen(false);
                        }}
                      >
                        <Plus size={12} />
                        Ajouter « {citySearch.trim()} »
                      </div>
                    )}
                    {filteredCities.length === 0 && !citySearch.trim() && (
                      <div className="city-combo-empty">Aucune ville enregistrée</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Statut</label>
              <select
                className="form-select"
                value={form.status}
                onChange={e => updateField("status", e.target.value)}
              >
                {pipelineStages.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Budget estimé (€)</label>
              <input
                type="number"
                className="form-input"
                value={form.estimatedBudget}
                onChange={e => updateField("estimatedBudget", e.target.value)}
                placeholder="5000"
                min="0"
                step="100"
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Sites web</label>
              <div className="form-phones">
                {form.websites.map((website, i) => (
                  <div key={i} className="form-phone-row">
                    <input
                      type="text"
                      className="form-input"
                      value={website}
                      onChange={e => updateWebsite(i, e.target.value)}
                      placeholder="www.example.com"
                    />
                    {form.websites.length > 1 && (
                      <button type="button" className="btn-icon" onClick={() => removeWebsite(i)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost" onClick={addWebsite} style={{ alignSelf: "flex-start", height: 28, fontSize: 12 }}>
                  <Plus size={12} /> Ajouter un site
                </button>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: "normal", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.noWebsite}
                    onChange={e => updateField("noWebsite", e.target.checked)}
                  />
                  Pas de site web
                </label>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: "normal", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.uglyWebsite}
                    onChange={e => updateField("uglyWebsite", e.target.checked)}
                  />
                  Site web degueu
                </label>
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">Adresse</label>
              <input
                type="text"
                className="form-input"
                value={form.address}
                onChange={e => updateField("address", e.target.value)}
                placeholder="12 Rue de la Paix, 75002 Paris"
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Page Google Maps</label>
              <input
                type="url"
                className="form-input"
                value={form.googleMapsUrl}
                onChange={e => updateField("googleMapsUrl", e.target.value)}
                placeholder="https://www.google.com/maps/place/..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date de rendez-vous</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="date"
                  className="form-input"
                  value={form.appointmentDate}
                  onChange={e => updateField("appointmentDate", e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="time"
                  className="form-input"
                  value={form.appointmentTime}
                  onChange={e => updateField("appointmentTime", e.target.value)}
                  style={{ width: 110 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Trouvé par</label>
              <select
                className="form-select"
                value={form.foundBy}
                onChange={e => updateField("foundBy", e.target.value)}
              >
                <option value="">—</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Contacté par</label>
              <select
                className="form-select"
                value={form.contactedBy}
                onChange={e => updateField("contactedBy", e.target.value)}
              >
                <option value="">—</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Développé par</label>
              <select
                className="form-select"
                value={form.developedBy}
                onChange={e => updateField("developedBy", e.target.value)}
              >
                <option value="">—</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.toCallback}
                  onChange={e => updateField("toCallback", e.target.checked)}
                />
                À rappeler
              </label>
            </div>

            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={e => updateField("notes", e.target.value)}
                placeholder="Notes sur le client..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            {client ? "Enregistrer" : "Créer le client"}
          </button>
        </div>
      </form>
    </div>
  );
}
