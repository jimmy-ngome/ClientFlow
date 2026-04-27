import { db } from "../../db/index.js";
import { teamMembers } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === "PUT") {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "name est requis" });
      }

      const updated = await db
        .update(teamMembers)
        .set({ name: name.trim() })
        .where(eq(teamMembers.id, id))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: "Membre non trouvé" });
      }
      return res.status(200).json(updated[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const [existing] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Membre non trouvé" });
      }

      await db.delete(teamMembers).where(eq(teamMembers.id, id));
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
