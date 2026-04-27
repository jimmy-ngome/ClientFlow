import { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import Header from "./components/Header";
import Pipeline from "./components/Pipeline";
import ClientDetail from "./components/ClientDetail";
import ClientModal from "./components/ClientModal";
import CallTracker from "./components/CallTracker";
import SettingsPage from "./components/SettingsPage";
import GanttPage from "./components/GanttPage";
import GanttTeamPage from "./components/GanttTeamPage";
import SchedulePage from "./components/SchedulePage";
import ClientPage from "./components/ClientPage";
import FriendsPage from "./components/FriendsPage";

const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospects", color: "#6366f1" },
  { key: "a_rappeler", label: "À rappeler", color: "#f43f5e" },
  { key: "relancer_1_mois", label: "À relancer +1 mois", color: "#a855f7" },
  { key: "rdv_confirme", label: "RDV confirmé", color: "#10b981" },
  { key: "rdv_termine", label: "RDV terminé", color: "#06b6d4" },
  { key: "en_conversation", label: "En conversation", color: "#8b5cf6" },
  { key: "acompte", label: "Acompte envoyé", color: "#3b82f6" },
  { key: "en_cours_dev", label: "En cours de développement", color: "#7c3aed" },
  { key: "facturation", label: "Facturation finale", color: "#22c55e" },
  { key: "archive", label: "Archive", color: "#71717a" },
];

export { PIPELINE_STAGES };

export default function App() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [stats, setStats] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [showCallTracker, setShowCallTracker] = useState(false);
  const [currentPage, setCurrentPage] = useState("main");
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, hiding: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 2700);
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error("Erreur chargement clients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setAllTags(data);
    } catch (err) {
      console.error("Erreur chargement tags:", err);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team-members");
      const data = await res.json();
      setTeamMembers(data);
    } catch (err) {
      console.error("Erreur chargement membres:", err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Erreur chargement projets:", err);
    }
  }, []);

  const fetchScheduleEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule-events");
      const data = await res.json();
      setScheduleEvents(data);
    } catch (err) {
      console.error("Erreur chargement événements:", err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchStats();
    fetchTags();
    fetchTeamMembers();
    fetchProjects();
    fetchScheduleEvents();
  }, [fetchClients, fetchStats, fetchTags, fetchTeamMembers, fetchProjects, fetchScheduleEvents]);

  const cities = useMemo(() => {
    const set = new Set();
    for (const c of clients) {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [clients]);

  const filteredClients = useMemo(() => {
    let result = clients;
    if (cityFilter) {
      result = result.filter(c => c.city && c.city.trim() === cityFilter);
    }
    if (websiteFilter === "has_website") {
      result = result.filter(c => (c.websites || []).length > 0 && !c.noWebsite);
    } else if (websiteFilter === "no_website") {
      result = result.filter(c => c.noWebsite);
    } else if (websiteFilter === "ugly_website") {
      result = result.filter(c => c.uglyWebsite);
    } else if (websiteFilter === "not_ugly") {
      result = result.filter(c => !c.uglyWebsite);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    }
    return result;
  }, [clients, search, cityFilter, websiteFilter]);

  // --- Optimistic CRUD: update UI instantly, revert on error ---

  const updateClientStatus = useCallback(async (clientId, newStatus) => {
    let snapshot;
    setClients(prev => {
      snapshot = prev;
      return prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c);
    });
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => ({ ...prev, status: newStatus }));
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClients(prev => prev.map(c => c.id === clientId ? updated : c));
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(updated);
      }
      fetchStats();
    } catch {
      setClients(snapshot);
      if (selectedClient && selectedClient.id === clientId) {
        const orig = snapshot.find(c => c.id === clientId);
        if (orig) setSelectedClient(orig);
      }
      toast("Erreur lors du déplacement", "error");
    }
  }, [selectedClient, fetchStats, toast]);

  const updateClient = useCallback(async (clientId, data) => {
    let snapshot;
    setClients(prev => {
      snapshot = prev;
      return prev.map(c => c.id === clientId ? { ...c, ...data } : c);
    });
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => ({ ...prev, ...data }));
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClients(prev => prev.map(c => c.id === clientId ? updated : c));
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(updated);
      }
      fetchStats();
      toast("Client mis à jour");
      return updated;
    } catch {
      setClients(snapshot);
      if (selectedClient && selectedClient.id === clientId) {
        const orig = snapshot.find(c => c.id === clientId);
        if (orig) setSelectedClient(orig);
      }
      toast("Erreur lors de la mise à jour", "error");
      return null;
    }
  }, [selectedClient, fetchStats, toast]);

  const createClient = useCallback(async (data) => {
    const tempId = -Date.now();
    const optimistic = { id: tempId, ...data, status: data.status || "prospect", createdAt: new Date().toISOString() };
    setClients(prev => [optimistic, ...prev]);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const created = await res.json();
      setClients(prev => prev.map(c => c.id === tempId ? created : c));
      fetchStats();
      toast("Client créé");
      return created;
    } catch (err) {
      setClients(prev => prev.filter(c => c.id !== tempId));
      toast(err.message || "Erreur lors de la création", "error");
      return null;
    }
  }, [fetchStats, toast]);

  const deleteClient = useCallback(async (clientId) => {
    let snapshot;
    setClients(prev => {
      snapshot = prev;
      return prev.filter(c => c.id !== clientId);
    });
    const wasSelected = selectedClient && selectedClient.id === clientId;
    if (wasSelected) setSelectedClient(null);
    toast("Client supprimé");

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchStats();
    } catch {
      setClients(snapshot);
      if (wasSelected) {
        const orig = snapshot.find(c => c.id === clientId);
        if (orig) setSelectedClient(orig);
      }
      toast("Erreur lors de la suppression", "error");
    }
  }, [selectedClient, fetchStats, toast]);

  const createProject = useCallback(async (data) => {
    const tempId = -Date.now();
    const optimistic = { id: tempId, ...data, createdAt: new Date().toISOString() };
    setProjects(prev => [optimistic, ...prev]);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const created = await res.json();
      setProjects(prev => prev.map(p => p.id === tempId ? created : p));
      toast("Projet créé");
      return created;
    } catch (err) {
      setProjects(prev => prev.filter(p => p.id !== tempId));
      toast(err.message || "Erreur lors de la création", "error");
      return null;
    }
  }, [toast]);

  const updateProject = useCallback(async (projectId, data) => {
    let snapshot;
    setProjects(prev => {
      snapshot = prev;
      return prev.map(p => p.id === projectId ? { ...p, ...data } : p);
    });

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      toast("Projet mis à jour");
      return updated;
    } catch {
      setProjects(snapshot);
      toast("Erreur lors de la mise à jour", "error");
      return null;
    }
  }, [toast]);

  const deleteProject = useCallback(async (projectId) => {
    let snapshot;
    setProjects(prev => {
      snapshot = prev;
      return prev.filter(p => p.id !== projectId);
    });
    toast("Projet supprimé");

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setProjects(snapshot);
      toast("Erreur lors de la suppression", "error");
    }
  }, [toast]);

  const createScheduleEvent = useCallback(async (data) => {
    const tempId = -Date.now();
    const optimistic = { id: tempId, ...data, createdAt: new Date().toISOString() };
    setScheduleEvents(prev => [optimistic, ...prev]);
    toast("Événement créé");

    try {
      const res = await fetch("/api/schedule-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const created = await res.json();
      setScheduleEvents(prev => prev.map(e => e.id === tempId ? created : e));
      return created;
    } catch (err) {
      setScheduleEvents(prev => prev.filter(e => e.id !== tempId));
      toast(err.message || "Erreur lors de la création", "error");
      return null;
    }
  }, [toast]);

  const updateScheduleEvent = useCallback(async (eventId, data) => {
    let snapshot;
    setScheduleEvents(prev => {
      snapshot = prev;
      return prev.map(e => e.id === eventId ? { ...e, ...data } : e);
    });

    try {
      const res = await fetch(`/api/schedule-events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setScheduleEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    } catch {
      setScheduleEvents(snapshot);
      toast("Erreur lors de la mise à jour", "error");
    }
  }, [toast]);

  const deleteScheduleEvent = useCallback(async (eventId) => {
    let snapshot;
    setScheduleEvents(prev => {
      snapshot = prev;
      return prev.filter(e => e.id !== eventId);
    });
    toast("Événement supprimé");

    try {
      const res = await fetch(`/api/schedule-events/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setScheduleEvents(snapshot);
      toast("Erreur lors de la suppression", "error");
    }
  }, [toast]);

  const importICSEvents = useCallback(async (events) => {
    // Optimistic: add temp events immediately
    const tempEvents = events.map((e, i) => ({
      id: -(Date.now() + i),
      ...e,
      createdAt: new Date().toISOString(),
    }));
    setScheduleEvents(prev => [...tempEvents, ...prev]);

    try {
      const res = await fetch("/api/schedule-events/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      // Replace temp events with real ones from server
      const tempIds = new Set(tempEvents.map(e => e.id));
      setScheduleEvents(prev => [
        ...data.events,
        ...prev.filter(e => !tempIds.has(e.id)),
      ]);
      toast(`${data.imported} événements importés`);
    } catch (err) {
      // Remove temp events
      const tempIds = new Set(tempEvents.map(e => e.id));
      setScheduleEvents(prev => prev.filter(e => !tempIds.has(e.id)));
      toast(err.message || "Erreur lors de l'import", "error");
    }
  }, [toast]);

  const handleSaveClient = useCallback(async (data) => {
    if (editingClient) {
      const updated = await updateClient(editingClient.id, data);
      if (updated) {
        setShowModal(false);
        setEditingClient(null);
      }
    } else {
      const created = await createClient(data);
      if (created) {
        setShowModal(false);
      }
    }
  }, [editingClient, updateClient, createClient]);

  const handleEditClient = useCallback((client) => {
    setEditingClient(client);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingClient(null);
  }, []);

  const handleSelectClient = useCallback((client) => {
    setSelectedClient(client);
    setCurrentPage("client");
  }, []);

  const refreshClient = useCallback(async (clientId) => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      setClients(prev => prev.map(c => c.id === clientId ? data : c));
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(data);
      }
    } catch {}
  }, [selectedClient]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        Chargement...
      </div>
    );
  }

  return (
    <>
      <div className="app-bg" />
      <div className="app">
        {currentPage === "friends" ? (
          <FriendsPage
            teamMembers={teamMembers}
            onBack={() => setCurrentPage("main")}
            toast={toast}
          />
        ) : currentPage === "settings" ? (
          <SettingsPage
            teamMembers={teamMembers}
            onBack={() => setCurrentPage("main")}
            onMembersChange={fetchTeamMembers}
          />
        ) : currentPage === "gantt" ? (
          <GanttPage
            clients={clients}
            stages={PIPELINE_STAGES}
            projects={projects}
            teamMembers={teamMembers}
            onBack={() => setCurrentPage("main")}
            onSwitchView={() => setCurrentPage("gantt-team")}
            onCreateProject={createProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
            onRefreshClients={fetchClients}
            toast={toast}
          />
        ) : currentPage === "gantt-team" ? (
          <GanttTeamPage
            clients={clients}
            teamMembers={teamMembers}
            stages={PIPELINE_STAGES}
            onBack={() => setCurrentPage("main")}
            onSwitchView={() => setCurrentPage("gantt")}
          />
        ) : currentPage === "client" && selectedClient ? (
          <ClientPage
            client={selectedClient}
            stages={PIPELINE_STAGES}
            allTags={allTags}
            teamMembers={teamMembers}
            scheduleEvents={scheduleEvents}
            onBack={() => { setCurrentPage("main"); setSelectedClient(null); }}
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
            onEditClient={handleEditClient}
            onRefresh={refreshClient}
            toast={toast}
          />
        ) : currentPage === "schedule" ? (
          <SchedulePage
            clients={clients}
            teamMembers={teamMembers}
            projects={projects}
            scheduleEvents={scheduleEvents}
            onBack={() => setCurrentPage("main")}
            onCreateEvent={createScheduleEvent}
            onUpdateEvent={updateScheduleEvent}
            onDeleteEvent={deleteScheduleEvent}
            onImportICS={importICSEvents}
            toast={toast}
          />
        ) : (
          <>
            <Header
              search={search}
              onSearchChange={setSearch}
              cityFilter={cityFilter}
              onCityFilterChange={setCityFilter}
              websiteFilter={websiteFilter}
              onWebsiteFilterChange={setWebsiteFilter}
              cities={cities}
              stats={stats}
              onNewClient={() => setShowModal(true)}
              onOpenCallTracker={() => setShowCallTracker(true)}
              onOpenSettings={() => setCurrentPage("settings")}
              onOpenSchedule={() => setCurrentPage("schedule")}
              onOpenFriends={() => setCurrentPage("friends")}
            />
            <div className="app-content">
              <Pipeline
                clients={filteredClients}
                stages={PIPELINE_STAGES}
                onUpdateStatus={updateClientStatus}
                onSelectClient={handleSelectClient}
                selectedClientId={null}
              />
            </div>
          </>
        )}

        {showModal && (
          <ClientModal
            client={editingClient}
            stages={PIPELINE_STAGES}
            teamMembers={teamMembers}
            cities={cities}
            onSave={handleSaveClient}
            onClose={handleCloseModal}
          />
        )}

        {showCallTracker && (
          <CallTracker teamMembers={teamMembers} onClose={() => setShowCallTracker(false)} />
        )}

        {toasts.length > 0 && (
          <div className="toast-container">
            {toasts.map(t => (
              <div key={t.id} className={`toast ${t.type}${t.hiding ? " hiding" : ""}`}>
                {t.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
