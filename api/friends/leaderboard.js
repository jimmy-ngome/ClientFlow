import { db } from "../../db/index.js";
import { follows, interactions, clients, teamMembers } from "../../db/schema.js";
import { eq, gte, and, inArray, sql } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { memberId, period = "all" } = req.query;
    if (!memberId) {
      return res.status(400).json({ error: "memberId est requis" });
    }

    const id = parseInt(memberId);

    // Get followed member IDs + self
    const followingRows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, id));

    const memberIds = [id, ...followingRows.map(r => r.followingId)];

    // Get all team members
    const members = await db.select().from(teamMembers);
    const memberMap = {};
    for (const m of members) {
      memberMap[m.id] = m.name;
      memberMap[m.name] = m.id;
    }

    // Date filter
    let dateFilter = null;
    const now = new Date();
    if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      dateFilter = d.toISOString().split("T")[0];
    } else if (period === "month") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      dateFilter = d.toISOString().split("T")[0];
    }

    // Get member names for the group
    const memberNames = memberIds.map(mid => memberMap[mid]).filter(Boolean);

    // Compute stats for each member
    const leaderboard = [];

    for (const mid of memberIds) {
      const name = memberMap[mid];
      if (!name) continue;

      // Count interactions
      let interactionQuery = db
        .select({ count: sql`count(*)::int` })
        .from(interactions)
        .where(eq(interactions.performedBy, name));

      if (dateFilter) {
        interactionQuery = db
          .select({ count: sql`count(*)::int` })
          .from(interactions)
          .where(and(
            eq(interactions.performedBy, name),
            gte(interactions.date, dateFilter)
          ));
      }

      const [{ count: interactionCount }] = await interactionQuery;

      // Count active clients (where they are foundBy, contactedBy or developedBy)
      const allClients = await db.select().from(clients);
      const activeClients = allClients.filter(c =>
        c.status !== "archive" && (
          c.foundBy === name ||
          c.contactedBy === name ||
          c.developedBy === name
        )
      );

      // Pipeline value for their clients
      const pipelineValue = activeClients.reduce((sum, c) => sum + (c.estimatedBudget || 0), 0);

      leaderboard.push({
        memberId: mid,
        name,
        interactionCount,
        activeClients: activeClients.length,
        pipelineValue,
        score: interactionCount,
      });
    }

    // Sort by score desc
    leaderboard.sort((a, b) => b.score - a.score);

    // Add rank
    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    return res.status(200).json(leaderboard);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
