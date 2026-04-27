import { db } from "../../db/index.js";
import { scheduleEvents } from "../../db/schema.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "Aucun événement à importer" });
    }

    if (events.length > 500) {
      return res.status(400).json({ error: "Maximum 500 événements par import" });
    }

    const values = events.map((e) => ({
      title: (e.title || "Sans titre").slice(0, 500),
      description: e.description || null,
      assignedTo: e.assignedTo,
      date: e.date,
      startTime: e.startTime || null,
      endTime: e.endTime || null,
      color: e.color || "#6366f1",
      type: e.type || "event",
    }));

    const created = await db.insert(scheduleEvents).values(values).returning();

    return res.status(201).json({ imported: created.length, events: created });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
