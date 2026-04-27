import { db } from "../../db/index.js";
import { interactions } from "../../db/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";

function getISOWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { from, to } = req.query;

    const conditions = [eq(interactions.type, "call")];
    if (from) conditions.push(gte(interactions.date, from));
    if (to) conditions.push(lte(interactions.date, to));

    const rows = await db
      .select()
      .from(interactions)
      .where(and(...conditions));

    const memberMap = {};

    for (const row of rows) {
      const name = row.performedBy || "Non assigné";
      if (!memberMap[name]) {
        memberMap[name] = { name, total: 0, byWeek: {} };
      }
      memberMap[name].total++;
      const week = getISOWeek(row.date);
      memberMap[name].byWeek[week] = (memberMap[name].byWeek[week] || 0) + 1;
    }

    const members = Object.values(memberMap).sort((a, b) => b.total - a.total);

    return res.status(200).json({ members });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
