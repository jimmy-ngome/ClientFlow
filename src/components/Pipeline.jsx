import { useState, useCallback, useMemo } from "react";
import ClientCard from "./ClientCard";

export default function Pipeline({ clients, stages, onUpdateStatus, onSelectClient, selectedClientId }) {
  const [draggedClient, setDraggedClient] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const clientsByStatus = useMemo(() => {
    const grouped = {};
    for (const stage of stages) {
      grouped[stage.key] = [];
    }
    for (const client of clients) {
      if (grouped[client.status]) {
        grouped[client.status].push(client);
      } else {
        // Unknown status, put in first column
        grouped[stages[0].key].push(client);
      }
    }
    // Sort each column: by updatedAt descending
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const db = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return db - da;
      });
    }
    return grouped;
  }, [clients, stages]);

  const handleDragStart = useCallback((e, client) => {
    setDraggedClient(client);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", client.id.toString());
    // Make the drag image slightly transparent
    if (e.target) {
      requestAnimationFrame(() => {
        e.target.classList.add("dragging");
      });
    }
  }, []);

  const handleDragEnd = useCallback((e) => {
    if (e.target) {
      e.target.classList.remove("dragging");
    }
    setDraggedClient(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e, stageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(stageKey);
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Only clear if leaving the column itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  }, []);

  const handleDrop = useCallback((e, stageKey) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedClient && draggedClient.status !== stageKey) {
      onUpdateStatus(draggedClient.id, stageKey);
    }
    setDraggedClient(null);
  }, [draggedClient, onUpdateStatus]);

  return (
    <div className="pipeline-wrapper">
      <div className="pipeline-board">
        {stages.map(stage => {
          const stageClients = clientsByStatus[stage.key] || [];
          const isOver = dragOverColumn === stage.key;
          const isArchive = stage.key === "archive";

          return (
            <div
              key={stage.key}
              className={`pipeline-column${isOver ? " drag-over" : ""}${isArchive ? " is-archive" : ""}`}
              onDragOver={e => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.key)}
            >
              <div className="column-header">
                <div className="column-accent" style={{ backgroundColor: stage.color }} />
                <span className="column-title">{stage.label}</span>
                <span className="column-count">{stageClients.length}</span>
              </div>

              <div className="column-cards">
                {stageClients.length === 0 ? (
                  <div className="column-empty">
                    {isOver ? "Déposer ici" : "Aucun client"}
                  </div>
                ) : (
                  stageClients.map(client => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      isSelected={selectedClientId === client.id}
                      stageColor={stage.color}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectClient(client)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
