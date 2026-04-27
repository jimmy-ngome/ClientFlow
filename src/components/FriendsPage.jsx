import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft, Users, UserPlus, UserMinus, Phone, Mail, Calendar,
  MessageSquare, Trophy, TrendingUp, Activity, Clock, Star,
  ChevronDown, Eye, Briefcase, Search
} from "lucide-react";

const STORAGE_KEY = "clientflow_me";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return date.toLocaleDateString("fr-FR");
}

function activityIcon(type) {
  switch (type) {
    case "appel": return <Phone size={14} />;
    case "email": return <Mail size={14} />;
    case "rdv": case "reunion": return <Calendar size={14} />;
    case "note": return <MessageSquare size={14} />;
    case "client": case "client_found": return <UserPlus size={14} />;
    case "contact": case "client_contacted": return <Phone size={14} />;
    case "development": case "client_developed": return <Briefcase size={14} />;
    default: return <Activity size={14} />;
  }
}

function activityColor(type) {
  switch (type) {
    case "appel": return "#10b981";
    case "email": return "#6366f1";
    case "rdv": case "reunion": return "#f59e0b";
    case "note": return "#8b5cf6";
    case "client": case "client_found": return "#06b6d4";
    case "contact": case "client_contacted": return "#3b82f6";
    case "development": case "client_developed": return "#ec4899";
    default: return "#71717a";
  }
}

export default function FriendsPage({ teamMembers, onBack, toast }) {
  const [currentMemberId, setCurrentMemberId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved) : null;
  });
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState("month");
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);

  const currentMember = useMemo(
    () => teamMembers.find(m => m.id === currentMemberId),
    [teamMembers, currentMemberId]
  );

  const handleSelectMember = useCallback((id) => {
    setCurrentMemberId(id);
    localStorage.setItem(STORAGE_KEY, id.toString());
  }, []);

  // Fetch follows
  const fetchFollows = useCallback(async () => {
    if (!currentMemberId) return;
    try {
      const res = await fetch(`/api/friends?memberId=${currentMemberId}`);
      const data = await res.json();
      setFollowing(data.following || []);
      setFollowers(data.followers || []);
    } catch (err) {
      console.error("Erreur follows:", err);
    }
  }, [currentMemberId]);

  // Fetch activity feed
  const fetchActivity = useCallback(async () => {
    if (!currentMemberId) return;
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/friends/activity?memberId=${currentMemberId}`);
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error("Erreur activity:", err);
    } finally {
      setLoadingActivity(false);
    }
  }, [currentMemberId]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (!currentMemberId) return;
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/friends/leaderboard?memberId=${currentMemberId}&period=${period}`);
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Erreur leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [currentMemberId, period]);

  useEffect(() => {
    fetchFollows();
    fetchActivity();
  }, [fetchFollows, fetchActivity]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleFollow = useCallback(async (followingId) => {
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: currentMemberId, followingId }),
      });
      toast("Membre suivi !");
      fetchFollows();
      fetchActivity();
      fetchLeaderboard();
    } catch {
      toast("Erreur", "error");
    }
  }, [currentMemberId, fetchFollows, fetchActivity, fetchLeaderboard, toast]);

  const handleUnfollow = useCallback(async (followingId) => {
    try {
      await fetch(`/api/friends?followerId=${currentMemberId}&followingId=${followingId}`, {
        method: "DELETE",
      });
      toast("Membre retiré");
      fetchFollows();
      fetchActivity();
      fetchLeaderboard();
    } catch {
      toast("Erreur", "error");
    }
  }, [currentMemberId, fetchFollows, fetchActivity, fetchLeaderboard, toast]);

  const followingIds = useMemo(() => new Set(following.map(f => f.followingId)), [following]);

  const notFollowed = useMemo(
    () => teamMembers.filter(m => m.id !== currentMemberId && !followingIds.has(m.id)),
    [teamMembers, currentMemberId, followingIds]
  );

  const maxScore = useMemo(
    () => Math.max(1, ...leaderboard.map(e => e.score)),
    [leaderboard]
  );

  // If no member selected, show picker
  if (!currentMemberId || !currentMember) {
    return (
      <div className="friends-page">
        <div className="friends-header">
          <button className="btn-icon" onClick={onBack}><ArrowLeft size={18} /></button>
          <h1 className="friends-title"><Users size={20} /> Amis & Progression</h1>
        </div>
        <div className="friends-picker">
          <div className="friends-picker-card">
            <Users size={40} style={{ color: "var(--accent)", marginBottom: 16 }} />
            <h2>Qui êtes-vous ?</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
              Sélectionnez votre profil pour commencer
            </p>
            <div className="friends-picker-list">
              {teamMembers.map(m => (
                <button
                  key={m.id}
                  className="friends-picker-item"
                  onClick={() => handleSelectMember(m.id)}
                >
                  <div className="friends-avatar" style={{ background: "var(--accent)" }}>
                    {getInitials(m.name)}
                  </div>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      {/* Header */}
      <div className="friends-header">
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={18} /></button>
        <h1 className="friends-title"><Users size={20} /> Amis & Progression</h1>
        <div className="friends-profile-badge">
          <div className="friends-avatar friends-avatar-sm" style={{ background: "var(--accent)" }}>
            {getInitials(currentMember.name)}
          </div>
          <span>{currentMember.name}</span>
          <button
            className="friends-change-btn"
            onClick={() => { setCurrentMemberId(null); localStorage.removeItem(STORAGE_KEY); }}
            title="Changer de profil"
          >
            Changer
          </button>
        </div>
        <div className="friends-counters">
          <span><strong>{following.length}</strong> suivis</span>
          <span><strong>{followers.length}</strong> abonnés</span>
        </div>
      </div>

      {/* Main content */}
      <div className="friends-content">
        {/* Left: Activity Feed */}
        <div className="friends-feed">
          <div className="friends-section-header">
            <Activity size={16} />
            <h2>Fil d'activité</h2>
          </div>

          {loadingActivity ? (
            <div className="friends-loading">Chargement...</div>
          ) : activities.length === 0 ? (
            <div className="friends-empty">
              <Eye size={32} style={{ color: "var(--text-muted)" }} />
              <p>Aucune activité</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Suivez des membres pour voir leur activité ici
              </p>
            </div>
          ) : (
            <div className="friends-activity-list">
              {activities.map(a => (
                <div key={a.id} className="friends-activity-item">
                  <div
                    className="friends-activity-icon"
                    style={{ background: `${activityColor(a.type)}20`, color: activityColor(a.type) }}
                  >
                    {activityIcon(a.type)}
                  </div>
                  <div className="friends-activity-body">
                    <div className="friends-activity-text">
                      <strong>{a.member}</strong> {a.description}
                    </div>
                    <div className="friends-activity-time">
                      <Clock size={11} /> {timeAgo(a.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Leaderboard + Follows */}
        <div className="friends-sidebar">
          {/* Leaderboard */}
          <div className="friends-leaderboard">
            <div className="friends-section-header">
              <Trophy size={16} />
              <h2>Classement</h2>
            </div>

            <div className="friends-period-toggle">
              {[
                { key: "week", label: "Semaine" },
                { key: "month", label: "Mois" },
                { key: "all", label: "Tout" },
              ].map(p => (
                <button
                  key={p.key}
                  className={`friends-period-btn ${period === p.key ? "active" : ""}`}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {loadingLeaderboard ? (
              <div className="friends-loading">Chargement...</div>
            ) : leaderboard.length === 0 ? (
              <div className="friends-empty-sm">Aucune donnée</div>
            ) : (
              <div className="friends-leaderboard-list">
                {leaderboard.map(entry => (
                  <div
                    key={entry.memberId}
                    className={`friends-leaderboard-item ${entry.memberId === currentMemberId ? "is-me" : ""}`}
                  >
                    <div className="friends-leaderboard-rank">
                      {entry.rank <= 3 ? (
                        <span className={`friends-medal medal-${entry.rank}`}>
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        <span className="friends-rank-num">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="friends-avatar friends-avatar-xs" style={{
                      background: entry.memberId === currentMemberId ? "var(--accent)" : "var(--bg-tertiary)"
                    }}>
                      {getInitials(entry.name)}
                    </div>
                    <div className="friends-leaderboard-info">
                      <div className="friends-leaderboard-name">{entry.name}</div>
                      <div className="friends-leaderboard-stats">
                        <span>{entry.interactionCount} interactions</span>
                        <span>{entry.activeClients} clients</span>
                        {entry.pipelineValue > 0 && (
                          <span>{(entry.pipelineValue / 1000).toFixed(0)}k€</span>
                        )}
                      </div>
                      <div className="friends-progress-bar">
                        <div
                          className="friends-progress-fill"
                          style={{ width: `${(entry.score / maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="friends-leaderboard-score">{entry.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Follows management */}
          <div className="friends-follows">
            <div className="friends-section-header">
              <UserPlus size={16} />
              <h2>Mes suivis</h2>
              <button
                className="friends-follow-add-btn"
                onClick={() => setShowFollowModal(!showFollowModal)}
              >
                {showFollowModal ? "Fermer" : "Suivre +"}
              </button>
            </div>

            {showFollowModal && notFollowed.length > 0 && (
              <div className="friends-follow-modal">
                {notFollowed.map(m => (
                  <div key={m.id} className="friends-follow-modal-item">
                    <div className="friends-avatar friends-avatar-xs" style={{ background: "var(--bg-tertiary)" }}>
                      {getInitials(m.name)}
                    </div>
                    <span>{m.name}</span>
                    <button
                      className="friends-btn-follow"
                      onClick={() => { handleFollow(m.id); setShowFollowModal(false); }}
                    >
                      <UserPlus size={14} /> Suivre
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showFollowModal && notFollowed.length === 0 && (
              <div className="friends-empty-sm">Vous suivez tout le monde !</div>
            )}

            {following.length === 0 ? (
              <div className="friends-empty-sm">
                Vous ne suivez personne encore
              </div>
            ) : (
              <div className="friends-follows-list">
                {following.map(f => (
                  <div key={f.id} className="friends-follow-item">
                    <div className="friends-avatar friends-avatar-xs" style={{ background: "var(--bg-tertiary)" }}>
                      {getInitials(f.name)}
                    </div>
                    <span className="friends-follow-name">{f.name}</span>
                    <button
                      className="friends-btn-unfollow"
                      onClick={() => handleUnfollow(f.followingId)}
                      title="Ne plus suivre"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
