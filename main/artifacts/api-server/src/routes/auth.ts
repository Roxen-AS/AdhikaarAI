import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, wallets, lawyerProfiles } from "@workspace/db";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { email, password, name, role } = req.body as Record<string, string>;

  if (!email || !password || !name || !role) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (!["citizen", "lawyer"].includes(role)) {
    res.status(400).json({ error: "Role must be citizen or lawyer" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ email: email.toLowerCase(), passwordHash, name, role }).returning();

    await db.insert(wallets).values({ userId: user.id, balance: 0 });

    if (role === "lawyer") {
      await db.insert(lawyerProfiles).values({ userId: user.id });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    req.log.error({ err }, "Signup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as Record<string, string>;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => res.json({ message: "Logged out" }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
