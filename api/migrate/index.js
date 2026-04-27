import { db } from "../../db/index.js";
import { clients } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const STATUS_MAP = {
  contacted: "en_conversation",
  follow_up: "a_rappeler",
  negotiating: "en_conversation",
  quote_sent: "acompte",
  signed: "rdv_confirme",
  in_progress: "rdv_termine",
  delivered: "facturation",
  lost: "archive",
  no_response_j1: "a_rappeler",
  no_response_j2: "a_rappeler",
  no_response_j3: "a_rappeler",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const results = {};
    for (const [oldStatus, newStatus] of Object.entries(STATUS_MAP)) {
      const updated = await db
        .update(clients)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(clients.status, oldStatus))
        .returning();
      results[oldStatus] = { newStatus, count: updated.length };
    }
    return res.status(200).json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
