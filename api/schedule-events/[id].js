import { db } from "../../db/index.js";
import { scheduleEvents } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === "PUT") {
    try {
      const [existing] = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id));
      if (!existing) return res.status(404).json({ error: "Événement non trouvé" });

      const body = { ...req.body };
      for (const key of ["description", "startTime", "endTime"]) {
        if (key in body && typeof body[key] === "string" && !body[key].trim()) {
          body[key] = null;
        }
      }

      const [updated] = await db
        .update(scheduleEvents)
        .set(body)
        .where(eq(scheduleEvents.id, id))
        .returning();

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const [existing] = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id));
      if (!existing) return res.status(404).json({ error: "Événement non trouvé" });
      await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id));
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
