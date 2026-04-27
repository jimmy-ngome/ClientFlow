import { db } from "../../db/index.js";
import { interactions } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === "PUT") {
    try {
      const [existing] = await db.select().from(interactions).where(eq(interactions.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Interaction non trouvée" });
      }

      const updated = await db
        .update(interactions)
        .set(req.body)
        .where(eq(interactions.id, id))
        .returning();

      return res.status(200).json(updated[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const [existing] = await db.select().from(interactions).where(eq(interactions.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Interaction non trouvée" });
      }

      await db.delete(interactions).where(eq(interactions.id, id));
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
