import { db } from "../../db/index.js";
import { clients } from "../../db/schema.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const allClients = await db.select().from(clients);

    const total = allClients.length;
    const active = allClients.filter(c => c.status !== "archive").length;
    const pipelineValue = allClients
      .filter(c => c.status !== "archive")
      .reduce((sum, c) => sum + (c.estimatedBudget || 0), 0);

    const today = new Date().toISOString().split("T")[0];
    const overdueFollowUps = allClients.filter(
      c => c.followUpDate && c.followUpDate < today && c.status !== "archive" && c.status !== "facturation"
    ).length;

    const byStatus = {};
    for (const c of allClients) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    return res.status(200).json({ total, active, pipelineValue, overdueFollowUps, byStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
