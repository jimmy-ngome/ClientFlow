import { db } from "../../db/index.js";
import { tags } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === "PUT") {
    try {
      const { name, color } = req.body;
      const updated = await db
        .update(tags)
        .set({ ...(name && { name: name.trim() }), ...(color && { color }) })
        .where(eq(tags.id, id))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: "Tag non trouvé" });
      }
      return res.status(200).json(updated[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const [existing] = await db.select().from(tags).where(eq(tags.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Tag non trouvé" });
      }

      await db.delete(tags).where(eq(tags.id, id));
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
