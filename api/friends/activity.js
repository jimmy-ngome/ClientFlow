import { db } from "../../db/index.js";
import { follows, interactions, clients, teamMembers } from "../../db/schema.js";
import { eq, desc, inArray, sql } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { memberId } = req.query;
    if (!memberId) {
      return res.status(400).json({ error: "memberId est requis" });
    }

    const id = parseInt(memberId);

    // Get list of followed member IDs + self
    const followingRows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, id));

    const memberIds = [id, ...followingRows.map(r => r.followingId)];

    // Get all team member names for lookup
    const members = await db.select().from(teamMembers);
    const memberMap = {};
    for (const m of members) {
      memberMap[m.id] = m.name;
      memberMap[m.name] = m.id;
    }

    // Get member names for filtering
    const memberNames = memberIds
      .map(mid => memberMap[mid])
      .filter(Boolean);

    const activities = [];

    // 1. Interactions by followed members
    if (memberNames.length > 0) {
      const interactionRows = await db
        .select({
          id: interactions.id,
          type: interactions.type,
          summary: interactions.summary,
          date: interactions.date,
          performedBy: interactions.performedBy,
          clientId: interactions.clientId,
          createdAt: interactions.createdAt,
        })
        .from(interactions)
        .where(inArray(interactions.performedBy, memberNames))
        .orderBy(desc(interactions.createdAt))
        .limit(50);

      // Get client names for these interactions
      const clientIds = [...new Set(interactionRows.map(r => r.clientId))];
      let clientMap = {};
      if (clientIds.length > 0) {
        const clientRows = await db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(inArray(clients.id, clientIds));
        for (const c of clientRows) {
          clientMap[c.id] = c.name;
        }
      }

      for (const row of interactionRows) {
        activities.push({
          id: `interaction-${row.id}`,
          activityType: "interaction",
          type: row.type,
          description: `${row.summary} — ${clientMap[row.clientId] || "Client"}`,
          member: row.performedBy,
          memberId: memberMap[row.performedBy] || null,
          date: row.createdAt || row.date,
        });
      }
    }

    // 2. Client assignments (foundBy, contactedBy, developedBy)
    if (memberNames.length > 0) {
      const clientRows = await db
        .select()
        .from(clients)
        .orderBy(desc(clients.createdAt))
        .limit(100);

      for (const c of clientRows) {
        if (c.foundBy && memberNames.includes(c.foundBy)) {
          activities.push({
            id: `client-found-${c.id}`,
            activityType: "client_found",
            type: "client",
            description: `A trouvé le prospect ${c.name}`,
            member: c.foundBy,
            memberId: memberMap[c.foundBy] || null,
            date: c.createdAt,
          });
        }
        if (c.contactedBy && memberNames.includes(c.contactedBy)) {
          activities.push({
            id: `client-contacted-${c.id}`,
            activityType: "client_contacted",
            type: "contact",
            description: `A contacté ${c.name}`,
            member: c.contactedBy,
            memberId: memberMap[c.contactedBy] || null,
            date: c.createdAt,
          });
        }
        if (c.developedBy && memberNames.includes(c.developedBy)) {
          activities.push({
            id: `client-developed-${c.id}`,
            activityType: "client_developed",
            type: "development",
            description: `Développe le projet de ${c.name}`,
            member: c.developedBy,
            memberId: memberMap[c.developedBy] || null,
            date: c.createdAt,
          });
        }
      }
    }

    // Sort by date desc, take 50
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json(activities.slice(0, 50));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
