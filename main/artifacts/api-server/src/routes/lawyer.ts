import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, lawyerProfiles, lawyerCases } from "@workspace/db";

const router: IRouter = Router();

function requireLawyer(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  if (req.session.userRole !== "lawyer") {
    res.status(403).json({ error: "Lawyer account required" });
    return false;
  }
  return true;
}

router.get("/lawyer/profile", async (req, res): Promise<void> => {
  if (!requireLawyer(req, res)) return;

  try {
    const [profile] = await db.select().from(lawyerProfiles).where(eq(lawyerProfiles.userId, req.session.userId!));
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(profile);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lawyer/profile", async (req, res): Promise<void> => {
  if (!requireLawyer(req, res)) return;

  const { barId, barCouncil, yearsPractice, profilePicUrl, consultationFee, bio, city, state, practiceAreas } = req.body;

  if (consultationFee !== undefined && Number(consultationFee) < 5000) {
    res.status(400).json({ error: "Minimum consultation fee is ₹5,000" });
    return;
  }

  try {
    const [existing] = await db.select({ id: lawyerProfiles.id }).from(lawyerProfiles).where(eq(lawyerProfiles.userId, req.session.userId!));

    if (!existing) {
      const [profile] = await db.insert(lawyerProfiles).values({
        userId: req.session.userId!,
        barId, barCouncil,
        yearsPractice: yearsPractice ? Number(yearsPractice) : 0,
        profilePicUrl, consultationFee: consultationFee ? Number(consultationFee) : 5000,
        bio, city, state,
        practiceAreas: practiceAreas ?? [],
      }).returning();
      res.json(profile);
      return;
    }

    const [updated] = await db
      .update(lawyerProfiles)
      .set({
        ...(barId !== undefined && { barId }),
        ...(barCouncil !== undefined && { barCouncil }),
        ...(yearsPractice !== undefined && { yearsPractice: Number(yearsPractice) }),
        ...(profilePicUrl !== undefined && { profilePicUrl }),
        ...(consultationFee !== undefined && { consultationFee: Number(consultationFee) }),
        ...(bio !== undefined && { bio }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(practiceAreas !== undefined && { practiceAreas }),
      })
      .where(eq(lawyerProfiles.userId, req.session.userId!))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lawyer/cases", async (req, res): Promise<void> => {
  if (!requireLawyer(req, res)) return;

  try {
    const [profile] = await db.select({ id: lawyerProfiles.id }).from(lawyerProfiles).where(eq(lawyerProfiles.userId, req.session.userId!));
    if (!profile) { res.json([]); return; }

    const cases = await db.select().from(lawyerCases).where(eq(lawyerCases.lawyerProfileId, profile.id));
    res.json(cases);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lawyer/cases", async (req, res): Promise<void> => {
  if (!requireLawyer(req, res)) return;

  const { title, court, year, outcome, description } = req.body;

  if (!title || !outcome || !["win", "loss", "settled"].includes(outcome)) {
    res.status(400).json({ error: "Title and outcome (win/loss/settled) are required" });
    return;
  }

  try {
    const [profile] = await db.select({ id: lawyerProfiles.id }).from(lawyerProfiles).where(eq(lawyerProfiles.userId, req.session.userId!));
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const [newCase] = await db.insert(lawyerCases).values({
      lawyerProfileId: profile.id, title, court, year: year ? Number(year) : undefined, outcome, description,
    }).returning();

    res.status(201).json(newCase);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/lawyer/cases/:id", async (req, res): Promise<void> => {
  if (!requireLawyer(req, res)) return;

  const id = Number(req.params["id"]);

  try {
    const [profile] = await db.select({ id: lawyerProfiles.id }).from(lawyerProfiles).where(eq(lawyerProfiles.userId, req.session.userId!));
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const [deleted] = await db.delete(lawyerCases)
      .where(and(eq(lawyerCases.id, id), eq(lawyerCases.lawyerProfileId, profile.id)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Case not found" }); return; }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
