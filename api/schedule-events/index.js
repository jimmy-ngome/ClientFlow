import { db } from "../../db/index.js";
import { scheduleEvents } from "../../db/schema.js";
import { desc } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await db.select().from(scheduleEvents).orderBy(desc(scheduleEvents.createdAt));
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { title, description, assignedTo, date, startTime, endTime, color, type } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Le titre est requis" });
      }
      if (!assignedTo) {
        return res.status(400).json({ error: "Le membre assigné est requis" });
      }
      if (!date) {
        return res.status(400).json({ error: "La date est requise" });
      }

      const [created] = await db
        .insert(scheduleEvents)
        .values({
          title: title.trim(),
          description: description?.trim() || null,
          assignedTo,
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          color: color || "#6366f1",
          type: type || "event",
        })
        .returning();

      return res.status(201).json(created);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
