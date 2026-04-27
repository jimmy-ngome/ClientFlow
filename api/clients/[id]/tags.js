import { db } from "../../../db/index.js";
import { clientTags, tags } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

export default async function handler(req, res) {
  const clientId = parseInt(req.query.id);

  if (req.method === "GET") {
    try {
      const result = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
        })
        .from(clientTags)
        .innerJoin(tags, eq(clientTags.tagId, tags.id))
        .where(eq(clientTags.clientId, clientId));

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { tagId } = req.body;

      if (!tagId) {
        return res.status(400).json({ error: "tagId est requis" });
      }

      await db
        .insert(clientTags)
        .values({ clientId, tagId })
        .onConflictDoNothing();

      const result = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
        })
        .from(clientTags)
        .innerJoin(tags, eq(clientTags.tagId, tags.id))
        .where(eq(clientTags.clientId, clientId));

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { tagId } = req.body;

      if (!tagId) {
        return res.status(400).json({ error: "tagId est requis" });
      }

      await db
        .delete(clientTags)
        .where(and(eq(clientTags.clientId, clientId), eq(clientTags.tagId, tagId)));

      const result = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
        })
        .from(clientTags)
        .innerJoin(tags, eq(clientTags.tagId, tags.id))
        .where(eq(clientTags.clientId, clientId));

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
