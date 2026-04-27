import { db } from "../../db/index.js";
import { clients, clientTags, tags } from "../../db/schema.js";
import { eq } from "drizzle-orm";

async function getClientTags(clientId) {
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(clientTags)
    .innerJoin(tags, eq(clientTags.tagId, tags.id))
    .where(eq(clientTags.clientId, clientId));
  return result;
}

export default async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === "GET") {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      if (!client) {
        return res.status(404).json({ error: "Client non trouvé" });
      }
      const clientTagsList = await getClientTags(id);
      let websites = [];
      try { websites = client.website ? JSON.parse(client.website) : []; } catch { websites = client.website ? [client.website] : []; }
      return res.status(200).json({
        ...client,
        phones: (() => { try { return client.phones ? JSON.parse(client.phones) : []; } catch { return []; } })(),
        websites,
        tags: clientTagsList,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "PUT") {
    try {
      const [existing] = await db.select().from(clients).where(eq(clients.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Client non trouvé" });
      }

      const body = { ...req.body };

      // Sanitize phones: array → JSON string
      if (Array.isArray(body.phones)) {
        const filtered = body.phones.filter(p => p && p.trim());
        body.phones = filtered.length > 0 ? JSON.stringify(filtered) : null;
      }

      // Sanitize websites: array → JSON string stored in website field
      if (Array.isArray(body.websites)) {
        const filtered = body.websites.filter(w => w && w.trim());
        body.website = filtered.length > 0 ? JSON.stringify(filtered) : null;
        delete body.websites;
      }

      // Sanitize date fields: empty string → null
      if ("firstContactDate" in body) {
        body.firstContactDate = body.firstContactDate || null;
      }
      if ("followUpDate" in body) {
        body.followUpDate = body.followUpDate || null;
      }
      if ("appointmentDate" in body) {
        body.appointmentDate = body.appointmentDate || null;
      }
      if ("appointmentTime" in body) {
        body.appointmentTime = body.appointmentTime || null;
      }

      // Sanitize nullable string fields: empty string → null
      for (const key of ["email", "city", "website", "foundBy", "contactedBy", "developedBy", "notes", "address", "googleMapsUrl"]) {
        if (key in body && typeof body[key] === "string" && !body[key].trim()) {
          body[key] = null;
        }
      }

      // Sanitize numeric fields: empty/NaN → null
      if ("estimatedBudget" in body) {
        const val = parseFloat(body.estimatedBudget);
        body.estimatedBudget = isNaN(val) ? null : val;
      }
      if ("reviewCount" in body) {
        const val = parseInt(body.reviewCount);
        body.reviewCount = isNaN(val) ? null : val;
      }

      const updated = await db
        .update(clients)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(clients.id, id))
        .returning();

      const row = updated[0];
      const clientTagsList = await getClientTags(id);
      let updatedWebsites = [];
      try { updatedWebsites = row.website ? JSON.parse(row.website) : []; } catch { updatedWebsites = row.website ? [row.website] : []; }
      return res.status(200).json({
        ...row,
        phones: (() => { try { return row.phones ? JSON.parse(row.phones) : []; } catch { return []; } })(),
        websites: updatedWebsites,
        tags: clientTagsList,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const [existing] = await db.select().from(clients).where(eq(clients.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Client non trouvé" });
      }

      await db.delete(clients).where(eq(clients.id, id));
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
