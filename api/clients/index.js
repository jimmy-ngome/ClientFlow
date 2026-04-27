import { db } from "../../db/index.js";
import { clients, clientTags, tags } from "../../db/schema.js";
import { eq, ilike, or, desc } from "drizzle-orm";

async function enrichWithTags(clientList) {
  if (!clientList.length) return clientList;

  const allClientTags = await db
    .select({
      clientId: clientTags.clientId,
      tagId: tags.id,
      tagName: tags.name,
      tagColor: tags.color,
    })
    .from(clientTags)
    .innerJoin(tags, eq(clientTags.tagId, tags.id));

  return clientList.map(c => ({
    ...c,
    tags: allClientTags
      .filter(t => t.clientId === c.id)
      .map(t => ({ id: t.tagId, name: t.tagName, color: t.tagColor })),
  }));
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { status, search } = req.query;

      let query = db.select().from(clients);

      const conditions = [];
      if (status) {
        conditions.push(eq(clients.status, status));
      }
      if (search) {
        conditions.push(
          or(
            ilike(clients.name, `%${search}%`),
            ilike(clients.company, `%${search}%`),
            ilike(clients.email, `%${search}%`)
          )
        );
      }

      if (conditions.length === 1) {
        query = query.where(conditions[0]);
      } else if (conditions.length === 2) {
        const { and } = await import("drizzle-orm");
        query = query.where(and(conditions[0], conditions[1]));
      }

      const result = await query.orderBy(desc(clients.updatedAt));
      const parsed = result.map(c => {
        let phones = [];
        try {
          phones = c.phones ? JSON.parse(c.phones) : [];
        } catch { phones = []; }
        let websites = [];
        try {
          websites = c.website ? JSON.parse(c.website) : [];
        } catch { websites = c.website ? [c.website] : []; }
        return { ...c, phones, websites };
      });
      const enriched = await enrichWithTags(parsed);
      return res.status(200).json(enriched);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, email, phones, company, city, status, notes, estimatedBudget, firstContactDate, followUpDate, appointmentDate, appointmentTime, foundBy, contactedBy, developedBy, toCallback, deliveredOnTime, noWebsite, uglyWebsite, reviewCount, websites, address, googleMapsUrl } = req.body;

      if (!company || !company.trim()) {
        return res.status(400).json({ error: "Le nom de l'entreprise est requis" });
      }

      const phonesArray = Array.isArray(phones) ? phones.filter(p => p && p.trim()) : [];
      const websitesArray = Array.isArray(websites) ? websites.filter(w => w && w.trim()) : [];

      const newClient = await db
        .insert(clients)
        .values({
          name: name || "",
          email: email || null,
          phones: phonesArray.length > 0 ? JSON.stringify(phonesArray) : null,
          company: company || null,
          city: city || null,
          status: status || "prospect",
          notes: notes || null,
          estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
          firstContactDate: firstContactDate || null,
          followUpDate: followUpDate || null,
          appointmentDate: appointmentDate || null,
          appointmentTime: appointmentTime || null,
          foundBy: foundBy || null,
          contactedBy: contactedBy || null,
          developedBy: developedBy || null,
          toCallback: toCallback ?? null,
          deliveredOnTime: deliveredOnTime ?? null,
          noWebsite: noWebsite ?? null,
          uglyWebsite: uglyWebsite ?? null,
          reviewCount: reviewCount ? parseInt(reviewCount) : null,
          website: websitesArray.length > 0 ? JSON.stringify(websitesArray) : null,
          address: address || null,
          googleMapsUrl: googleMapsUrl || null,
        })
        .returning();

      const created = newClient[0];
      let createdWebsites = [];
      try { createdWebsites = created.website ? JSON.parse(created.website) : []; } catch { createdWebsites = created.website ? [created.website] : []; }
      return res.status(201).json({ ...created, phones: created.phones ? JSON.parse(created.phones) : [], websites: createdWebsites, tags: [] });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
