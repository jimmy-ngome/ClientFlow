import { db } from "../../db/index.js";
import { projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === "GET") {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project) return res.status(404).json({ error: "Projet non trouvé" });
      return res.status(200).json(project);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "PUT") {
    try {
      const [existing] = await db.select().from(projects).where(eq(projects.id, id));
      if (!existing) return res.status(404).json({ error: "Projet non trouvé" });

      const body = { ...req.body };

      for (const key of ["startDate", "endDate"]) {
        if (key in body) body[key] = body[key] || null;
      }
      for (const key of ["company", "city", "assignedTo", "notes", "name"]) {
        if (key in body && typeof body[key] === "string" && !body[key].trim()) {
          body[key] = null;
        }
      }

      const [updated] = await db
        .update(projects)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const [existing] = await db.select().from(projects).where(eq(projects.id, id));
      if (!existing) return res.status(404).json({ error: "Projet non trouvé" });
      await db.delete(projects).where(eq(projects.id, id));
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
