import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, users, lawyerProfiles, lawyerCases, connections } from "@workspace/db";
import { and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/lawyers", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        profileId: lawyerProfiles.id,
        barId: lawyerProfiles.barId,
        barCouncil: lawyerProfiles.barCouncil,
        verified: lawyerProfiles.verified,
        yearsPractice: lawyerProfiles.yearsPractice,
        profilePicUrl: lawyerProfiles.profilePicUrl,
        consultationFee: lawyerProfiles.consultationFee,
        bio: lawyerProfiles.bio,
        city: lawyerProfiles.city,
        state: lawyerProfiles.state,
        practiceAreas: lawyerProfiles.practiceAreas,
      })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId));

    const stateFilter = req.query["state"] as string | undefined;
    const areaFilter = req.query["area"] as string | undefined;

    const filtered = rows.filter((r) => {
      if (stateFilter && r.state !== stateFilter) return false;
      if (areaFilter && !r.practiceAreas?.includes(areaFilter)) return false;
      return true;
    });

    res.json(filtered);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lawyers/:id", async (req, res): Promise<void> => {
  const lawyerUserId = Number(req.params["id"]);
  const viewerUserId = req.session?.userId;

  try {
    const [row] = await db
      .select({
        userId: users.id,
        name: users.name,
        profileId: lawyerProfiles.id,
        barId: lawyerProfiles.barId,
        barCouncil: lawyerProfiles.barCouncil,
        verified: lawyerProfiles.verified,
        yearsPractice: lawyerProfiles.yearsPractice,
        profilePicUrl: lawyerProfiles.profilePicUrl,
        consultationFee: lawyerProfiles.consultationFee,
        bio: lawyerProfiles.bio,
        city: lawyerProfiles.city,
        state: lawyerProfiles.state,
        practiceAreas: lawyerProfiles.practiceAreas,
      })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(eq(lawyerProfiles.userId, lawyerUserId));

    if (!row) { res.status(404).json({ error: "Lawyer not found" }); return; }

    const cases = await db.select().from(lawyerCases).where(eq(lawyerCases.lawyerProfileId, row.profileId));

    let isConnected = false;
    if (viewerUserId) {
      const [conn] = await db.select({ id: connections.id }).from(connections).where(
        and(eq(connections.citizenId, viewerUserId), eq(connections.lawyerId, lawyerUserId), eq(connections.status, "connected"))
      );
      isConnected = !!conn;
    }

    const wins = cases.filter(c => c.outcome === "win").length;
    const losses = cases.filter(c => c.outcome === "loss").length;
    const settled = cases.filter(c => c.outcome === "settled").length;

    res.json({
      ...row,
      cases: isConnected ? cases : undefined,
      stats: isConnected ? { wins, losses, settled, total: cases.length } : undefined,
      isConnected,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
