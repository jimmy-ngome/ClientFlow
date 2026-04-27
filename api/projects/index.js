import { db } from "../../db/index.js";
import { projects } from "../../db/schema.js";
import { desc } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await db.select().from(projects).orderBy(desc(projects.updatedAt));
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, company, city, assignedTo, startDate, endDate, notes, color } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Le nom du projet est requis" });
      }
      if (!startDate) {
        return res.status(400).json({ error: "La date de début est requise" });
      }

      const [created] = await db
        .insert(projects)
        .values({
          name: name.trim(),
          company: company?.trim() || null,
          city: city?.trim() || null,
          assignedTo: assignedTo || null,
          startDate,
          endDate: endDate || null,
          notes: notes?.trim() || null,
          color: color || "#6366f1",
        })
        .returning();

      return res.status(201).json(created);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
