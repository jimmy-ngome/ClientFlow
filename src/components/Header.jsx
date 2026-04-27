import { Search, Plus, MapPin, Phone, Settings, CalendarDays, Users, Globe } from "lucide-react";

export default function Header({ search, onSearchChange, cityFilter, onCityFilterChange, websiteFilter, onWebsiteFilterChange, cities, stats, onNewClient, onOpenCallTracker, onOpenSettings, onOpenSchedule, onOpenFriends }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">CF</div>
        <span className="header-title">ClientFlow</span>
      </div>

      <div className="header-search">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Rechercher un client, entreprise..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-city-filter">
        <MapPin size={14} className="city-filter-icon" />
        <select
          value={cityFilter}
          onChange={e => onCityFilterChange(e.target.value)}
          className="city-filter-select"
        >
          <option value="">Toutes les villes</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      <div className="header-city-filter">
        <Globe size={14} className="city-filter-icon" />
        <select
          value={websiteFilter}
          onChange={e => onWebsiteFilterChange(e.target.value)}
          className="city-filter-select"
        >
          <option value="">Site web: tous</option>
          <option value="has_website">Avec site web</option>
          <option value="no_website">Pas de site web</option>
          <option value="ugly_website">Site web degueu</option>
          <option value="not_ugly">Site web OK</option>
        </select>
      </div>

      <div className="header-stats">
        {stats && (
          <>
            <div className="header-stat">
              <span className="header-stat-value">{stats.active || 0}</span>
              <span className="header-stat-label">Actifs</span>
            </div>
            <div className="header-stat">
              <span className="header-stat-value">
                {stats.pipelineValue ? `${(stats.pipelineValue / 1000).toFixed(0)}k` : "0"}
              </span>
              <span className="header-stat-label">Pipeline</span>
            </div>
            {stats.overdueFollowUps > 0 && (
              <div className="header-stat">
                <span className="header-stat-value" style={{ color: "var(--danger)" }}>
                  {stats.overdueFollowUps}
                </span>
                <span className="header-stat-label">En retard</span>
              </div>
            )}
          </>
        )}
      </div>

      <button className="btn-icon" onClick={onOpenFriends} title="Amis & Progression" style={{ flexShrink: 0 }}>
        <Users size={18} />
      </button>

      <button className="btn-icon" onClick={onOpenSchedule} title="Planning de l'équipe" style={{ flexShrink: 0 }}>
        <CalendarDays size={18} />
      </button>

      <button className="btn-icon" onClick={onOpenSettings} title="Paramètres" style={{ flexShrink: 0 }}>
        <Settings size={18} />
      </button>

      <button className="btn-icon" onClick={onOpenCallTracker} title="Compteur d'appels" style={{ flexShrink: 0 }}>
        <Phone size={18} />
      </button>

      <button className="btn-new-client" onClick={onNewClient}>
        <Plus size={16} />
        Nouveau
      </button>
    </header>
  );
}
