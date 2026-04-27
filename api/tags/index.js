import { db } from "../../db/index.js";
import { tags } from "../../db/schema.js";
import { asc } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await db.select().from(tags).orderBy(asc(tags.name));
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, color } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "name est requis" });
      }

      const newTag = await db
        .insert(tags)
        .values({
          name: name.trim(),
          color: color || "#3b82f6",
        })
        .returning();

      return res.status(201).json(newTag[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
