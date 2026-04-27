import { db } from "../../db/index.js";
import { interactions } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { clientId, date } = req.query;

      if (!clientId && !date) {
        return res.status(400).json({ error: "clientId ou date est requis" });
      }

      let result;
      if (date) {
        result = await db
          .select()
          .from(interactions)
          .where(eq(interactions.date, date))
          .orderBy(desc(interactions.createdAt));
      } else {
        result = await db
          .select()
          .from(interactions)
          .where(eq(interactions.clientId, parseInt(clientId)))
          .orderBy(desc(interactions.date));
      }

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { clientId, type, summary, date, performedBy } = req.body;

      if (!clientId || !type || !summary || !date) {
        return res.status(400).json({ error: "clientId, type, summary et date sont requis" });
      }

      const newInteraction = await db
        .insert(interactions)
        .values({
          clientId: parseInt(clientId),
          type,
          summary,
          date,
          performedBy: performedBy || null,
        })
        .returning();

      return res.status(201).json(newInteraction[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
