import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, wallets, walletTransactions } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  return true;
}

router.get("/wallet", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.session!.userId!;

  try {
    let [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (!wallet) {
      [wallet] = await db.insert(wallets).values({ userId, balance: 0 }).returning();
    }
    const transactions = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);

    res.json({ balance: wallet.balance, transactions });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/wallet/topup", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.session!.userId!;

  const { amount, paymentMethod } = req.body;
  const amountNum = Number(amount);

  if (!amountNum || amountNum < 100) {
    res.status(400).json({ error: "Minimum top-up amount is ₹100" });
    return;
  }

  const validMethods = ["upi", "card", "netbanking", "bank_transfer"];
  if (!validMethods.includes(paymentMethod)) {
    res.status(400).json({ error: "Invalid payment method" });
    return;
  }

  try {
    let [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (!wallet) {
      [wallet] = await db.insert(wallets).values({ userId, balance: 0 }).returning();
    }

    const newBalance = wallet.balance + amountNum;
    await db.update(wallets).set({ balance: newBalance }).where(eq(wallets.userId, userId));

    const referenceId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [txn] = await db.insert(walletTransactions).values({
      userId, type: "recharge", amount: amountNum,
      description: `Wallet top-up via ${paymentMethod.toUpperCase()}`,
      status: "completed", paymentMethod, referenceId,
    }).returning();

    res.status(201).json({ balance: newBalance, transaction: txn });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/wallet/withdraw", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.session!.userId!;

  const { amount, accountDetails } = req.body;
  const amountNum = Number(amount);

  if (!amountNum || amountNum < 500) {
    res.status(400).json({ error: "Minimum withdrawal amount is ₹500" });
    return;
  }

  try {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (!wallet || wallet.balance < amountNum) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const newBalance = wallet.balance - amountNum;
    await db.update(wallets).set({ balance: newBalance }).where(eq(wallets.userId, userId));

    const referenceId = `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [txn] = await db.insert(walletTransactions).values({
      userId, type: "withdrawal", amount: -amountNum,
      description: `Withdrawal to ${accountDetails?.accountType ?? "bank account"}`,
      status: "completed", paymentMethod: "bank_transfer", referenceId,
    }).returning();

    res.status(201).json({ balance: newBalance, transaction: txn });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/wallet/pay-consultation", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.session!.userId!;

  const { connectionId, amount } = req.body;
  const amountNum = Number(amount);

  if (!connectionId || !amountNum) {
    res.status(400).json({ error: "connectionId and amount are required" });
    return;
  }

  try {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (!wallet || wallet.balance < amountNum) {
      res.status(400).json({ error: "Insufficient balance. Please top up your wallet." });
      return;
    }

    const newBalance = wallet.balance - amountNum;
    await db.update(wallets).set({ balance: newBalance }).where(eq(wallets.userId, userId));

    const referenceId = `CONSULT${Date.now()}`;
    const [txn] = await db.insert(walletTransactions).values({
      userId, type: "debit", amount: -amountNum,
      description: `Consultation fee (Connection #${connectionId})`,
      status: "completed", paymentMethod: "wallet", referenceId,
    }).returning();

    res.status(201).json({ balance: newBalance, transaction: txn });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
