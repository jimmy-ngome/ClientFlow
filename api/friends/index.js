import { db } from "../../db/index.js";
import { follows, teamMembers } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { memberId } = req.query;
      if (!memberId) {
        return res.status(400).json({ error: "memberId est requis" });
      }

      const id = parseInt(memberId);

      const followingRows = await db
        .select({
          id: follows.id,
          followingId: follows.followingId,
          name: teamMembers.name,
          createdAt: follows.createdAt,
        })
        .from(follows)
        .innerJoin(teamMembers, eq(follows.followingId, teamMembers.id))
        .where(eq(follows.followerId, id));

      const followerRows = await db
        .select({
          id: follows.id,
          followerId: follows.followerId,
          name: teamMembers.name,
          createdAt: follows.createdAt,
        })
        .from(follows)
        .innerJoin(teamMembers, eq(follows.followerId, teamMembers.id))
        .where(eq(follows.followingId, id));

      return res.status(200).json({
        following: followingRows,
        followers: followerRows,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: "followerId et followingId sont requis" });
      }
      if (followerId === followingId) {
        return res.status(400).json({ error: "Impossible de se suivre soi-même" });
      }

      const existing = await db
        .select()
        .from(follows)
        .where(and(
          eq(follows.followerId, parseInt(followerId)),
          eq(follows.followingId, parseInt(followingId))
        ));

      if (existing.length > 0) {
        return res.status(200).json(existing[0]);
      }

      const result = await db
        .insert(follows)
        .values({
          followerId: parseInt(followerId),
          followingId: parseInt(followingId),
        })
        .returning();

      return res.status(201).json(result[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { followerId, followingId } = req.query;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: "followerId et followingId sont requis" });
      }

      await db
        .delete(follows)
        .where(and(
          eq(follows.followerId, parseInt(followerId)),
          eq(follows.followingId, parseInt(followingId))
        ));

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
