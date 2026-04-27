import { Building2, Phone, PhoneCall, Code, Calendar, Globe, Search } from "lucide-react";

export default function ClientCard({ client, isSelected, stageColor, onDragStart, onDragEnd, onClick }) {
  const phones = Array.isArray(client.phones) ? client.phones : [];
  const websites = Array.isArray(client.websites) ? client.websites : [];
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(client.company || client.name || "")}`;

  return (
    <div
      className={`client-card${isSelected ? " selected" : ""}`}
      draggable
      onDragStart={e => onDragStart(e, client)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="card-company">
        <Building2 size={12} className="card-company-icon" />
        <span className="card-company-name">{client.company || "Sans entreprise"}</span>
      </div>

      {client.name && (
        <div className="card-contact">{client.name}</div>
      )}

      <div className="card-links">
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="card-link card-link-google"
          onClick={e => e.stopPropagation()}
          title="Rechercher sur Google"
        >
          <Search size={9} />
          Google
        </a>
        {websites.length > 0 && (
          <a
            href={websites[0].startsWith("http") ? websites[0] : `https://${websites[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card-link card-link-website"
            onClick={e => e.stopPropagation()}
            title={websites[0]}
          >
            <Globe size={9} />
            Site web
          </a>
        )}
      </div>

      <div className="card-meta">
        {client.tags && client.tags.length > 0 && client.tags.slice(0, 2).map(tag => (
          <span
            key={tag.id}
            className="card-tag"
            style={{
              backgroundColor: tag.color + "20",
              color: tag.color,
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      {(client.developedBy || client.appointmentDate) && (
        <div className="card-project-info">
          {client.developedBy && (
            <span className="card-dev">
              <Code size={9} />
              {client.developedBy}
            </span>
          )}
          {client.appointmentDate && (
            <span className="card-deadline">
              <Calendar size={9} />
              {new Date(client.appointmentDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{client.appointmentTime ? ` ${client.appointmentTime}` : ""}
            </span>
          )}
        </div>
      )}

      {phones.length > 0 && (
        <div className="card-phones">
          {phones.slice(0, 2).map((phone, i) => (
            <a
              key={i}
              href={`tel:${phone}`}
              className="card-phone-link"
              onClick={e => e.stopPropagation()}
            >
              <Phone size={9} />
              {phone}
            </a>
          ))}
        </div>
      )}

      {client.toCallback && (
        <div className="card-callback">
          <PhoneCall size={10} />
          À rappeler
        </div>
      )}
    </div>
  );
}
