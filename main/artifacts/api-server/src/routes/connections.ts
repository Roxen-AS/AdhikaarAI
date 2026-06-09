import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, connections, platformMessages, users, lawyerProfiles, callSessions } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  return true;
}

const CONTACT_INFO_PATTERNS = [
  /(\+91[\s\-.]?)?[6-9]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}/g,
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  /@[a-zA-Z0-9_.]{3,}/g,
  /\b(whatsapp|telegram|signal|instagram|facebook|twitter|linkedin)\b/gi,
  /\bwa\.me\/\d+/gi,
  /\bt\.me\/\S+/gi,
  /\b(my number|call me|reach me|contact me outside|dm me|text me)\b/gi,
  /\d{10}/g,
];

function filterMessage(text: string): { content: string; flagged: boolean } {
  let content = text;
  let flagged = false;
  for (const pattern of CONTACT_INFO_PATTERNS) {
    const copy = new RegExp(pattern.source, pattern.flags);
    if (copy.test(content)) {
      flagged = true;
      content = content.replace(new RegExp(pattern.source, pattern.flags), "[CONTACT INFO REMOVED]");
    }
  }
  return { content, flagged };
}

router.post("/connections", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  if (req.session!.userRole !== "citizen") { res.status(403).json({ error: "Only citizens can request connections" }); return; }

  const { lawyerId, note } = req.body;
  if (!lawyerId) { res.status(400).json({ error: "lawyerId is required" }); return; }

  try {
    const [existing] = await db.select({ id: connections.id }).from(connections).where(
      and(eq(connections.citizenId, req.session!.userId!), eq(connections.lawyerId, Number(lawyerId)))
    );
    if (existing) { res.status(409).json({ error: "Connection request already exists" }); return; }

    const [conn] = await db.insert(connections).values({
      citizenId: req.session!.userId!, lawyerId: Number(lawyerId), status: "pending", note,
    }).returning();
    res.status(201).json(conn);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/connections", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const userId = req.session!.userId!;
  const role = req.session!.userRole;

  try {
    const myConnections = await db.select().from(connections).where(
      role === "citizen" ? eq(connections.citizenId, userId) : eq(connections.lawyerId, userId)
    );

    const enriched = await Promise.all(myConnections.map(async (conn) => {
      const otherId = role === "citizen" ? conn.lawyerId : conn.citizenId;
      const [other] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, otherId));
      const [profile] = role === "citizen"
        ? await db.select({ profilePicUrl: lawyerProfiles.profilePicUrl, consultationFee: lawyerProfiles.consultationFee }).from(lawyerProfiles).where(eq(lawyerProfiles.userId, otherId))
        : [null];
      return { ...conn, otherUser: other, lawyerProfile: profile };
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/connections/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const id = Number(req.params["id"]);
  const { status } = req.body;

  if (!["connected", "declined"].includes(status)) {
    res.status(400).json({ error: "Status must be connected or declined" });
    return;
  }

  try {
    const [conn] = await db.select().from(connections).where(eq(connections.id, id));
    if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }

    if (req.session!.userRole === "lawyer" && conn.lawyerId !== req.session!.userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const [updated] = await db.update(connections).set({ status }).where(eq(connections.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/connections/:id/messages", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const connId = Number(req.params["id"]);
  const userId = req.session!.userId!;

  try {
    const [conn] = await db.select().from(connections).where(eq(connections.id, connId));
    if (!conn || (conn.citizenId !== userId && conn.lawyerId !== userId)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const msgs = await db.select().from(platformMessages).where(eq(platformMessages.connectionId, connId));
    res.json(msgs);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/connections/:id/messages", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const connId = Number(req.params["id"]);
  const userId = req.session!.userId!;

  try {
    const [conn] = await db.select().from(connections).where(eq(connections.id, connId));
    if (!conn || (conn.citizenId !== userId && conn.lawyerId !== userId)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    if (conn.status !== "connected") {
      res.status(400).json({ error: "Connection must be active to send messages" }); return;
    }

    const raw = (req.body.content ?? "").trim();
    if (!raw) { res.status(400).json({ error: "Message cannot be empty" }); return; }

    const { content, flagged } = filterMessage(raw);

    const [msg] = await db.insert(platformMessages).values({
      connectionId: connId, senderId: userId, content, flagged,
    }).returning();

    res.status(201).json({ ...msg, filtered: flagged });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/connections/:id/calls", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const connId = Number(req.params["id"]);
  const userId = req.session!.userId!;
  const { type = "audio" } = req.body;

  try {
    const [conn] = await db.select().from(connections).where(eq(connections.id, connId));
    if (!conn || (conn.citizenId !== userId && conn.lawyerId !== userId)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    if (conn.status !== "connected") {
      res.status(400).json({ error: "Connection must be active to make calls" }); return;
    }

    const [call] = await db.insert(callSessions).values({
      connectionId: connId, callerId: userId, type, status: "initiated",
    }).returning();

    res.status(201).json(call);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/calls/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const id = Number(req.params["id"]);
  const { status } = req.body;

  try {
    const [updated] = await db.update(callSessions)
      .set({
        status,
        ...(status === "ended" && { endedAt: new Date() }),
      })
      .where(eq(callSessions.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
