import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wallet, Plus, ArrowDownToLine, TrendingDown, TrendingUp, Loader2, CreditCard, Smartphone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logoPath from "@assets/AdikaarAI_Logo_1775754358123.png";

interface WalletTransaction { id: number; type: string; amount: number; description?: string; status: string; paymentMethod?: string; referenceId?: string; createdAt: string; }

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const METHOD_ICONS: Record<string, any> = {
  upi: Smartphone, card: CreditCard, netbanking: Building2, bank_transfer: Building2,
};

type Modal = "topup" | "withdraw" | null;

export default function WalletPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);

  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccountType, setWithdrawAccountType] = useState("bank_account");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  useEffect(() => { if (!user) setLocation("/auth"); }, [user]);
  useEffect(() => { fetchWallet(); }, []);

  const fetchWallet = async () => {
    setLoading(true);
    const r = await fetch("/api/wallet", { credentials: "include" });
    if (r.ok) { const data = await r.json(); setBalance(data.balance); setTransactions(data.transactions); }
    setLoading(false);
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (amount < 100) { toast({ title: "Minimum top-up is ₹100", variant: "destructive" }); return; }
    setProcessing(true);

    await new Promise(r => setTimeout(r, 1500));

    const res = await fetch("/api/wallet/topup", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, paymentMethod: topupMethod }),
    });
    setProcessing(false);
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance);
      setTransactions(p => [data.transaction, ...p]);
      setModal(null);
      setTopupAmount("");
      toast({ title: `₹${amount.toLocaleString()} added to wallet!` });
    } else {
      toast({ title: "Payment failed. Please try again.", variant: "destructive" });
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (amount < 500) { toast({ title: "Minimum withdrawal is ₹500", variant: "destructive" }); return; }
    if (amount > balance) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    setProcessing(true);

    await new Promise(r => setTimeout(r, 1500));

    const res = await fetch("/api/wallet/withdraw", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, accountDetails: { accountType: withdrawAccountType, accountNumber, ifsc } }),
    });
    setProcessing(false);
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance);
      setTransactions(p => [data.transaction, ...p]);
      setModal(null);
      setWithdrawAmount("");
      toast({ title: `₹${amount.toLocaleString()} withdrawal initiated. Will reach your account in 1-2 business days.` });
    } else {
      const err = await res.json();
      toast({ title: err.error ?? "Withdrawal failed", variant: "destructive" });
    }
  };

  const txnIcon = (type: string) => {
    if (type === "recharge") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (type === "withdrawal") return <TrendingDown className="h-4 w-4 text-red-400" />;
    if (type === "debit") return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  };

  const txnColor = (type: string) => ["recharge", "refund"].includes(type) ? "text-emerald-400" : "text-red-400";
  const txnSign = (type: string) => ["recharge", "refund"].includes(type) ? "+" : "-";

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Top-up modal */}
      {modal === "topup" && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Money to Wallet</h3>
              <Button variant="ghost" size="icon" onClick={() => setModal(null)}><ArrowLeft className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleTopup} className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Amount (₹)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {QUICK_AMOUNTS.map(a => (
                    <button type="button" key={a} onClick={() => setTopupAmount(String(a))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${topupAmount === String(a) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      ₹{a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Input type="number" min={100} placeholder="Or enter custom amount" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="bg-input border-border" required />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[{ id: "upi", label: "UPI", icon: Smartphone }, { id: "card", label: "Card", icon: CreditCard }, { id: "netbanking", label: "Net Banking", icon: Building2 }, { id: "bank_transfer", label: "Bank Transfer", icon: Building2 }].map(m => (
                    <button type="button" key={m.id} onClick={() => setTopupMethod(m.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${topupMethod === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                      <m.icon className="h-4 w-4" />{m.label}
                    </button>
                  ))}
                </div>
                {topupMethod === "upi" && <Input placeholder="UPI ID (e.g. name@bank)" value={upiId} onChange={e => setUpiId(e.target.value)} className="bg-input border-border" />}
                {topupMethod === "card" && <Input placeholder="Card number" value={cardNumber} onChange={e => setCardNumber(e.target.value)} maxLength={19} className="bg-input border-border" />}
                {["netbanking", "bank_transfer"].includes(topupMethod) && <p className="text-sm text-muted-foreground">You'll be redirected to your bank's secure page.</p>}
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground h-11" disabled={processing}>
                {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Pay ₹${Number(topupAmount || 0).toLocaleString()}`}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      {modal === "withdraw" && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">Withdraw Money</h3>
              <Button variant="ghost" size="icon" onClick={() => setModal(null)}><ArrowLeft className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleWithdraw} className="p-5 space-y-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-primary">₹{balance.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Withdrawal Amount (₹)</Label>
                <Input type="number" min={500} max={balance} placeholder="Min ₹500" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="bg-input border-border" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Account Number</Label>
                  <Input placeholder="Account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="bg-input border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">IFSC Code</Label>
                  <Input placeholder="IFSC" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} className="bg-input border-border" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Withdrawal takes 1-2 business days. Minimum ₹500.</p>
              <Button type="submit" className="w-full bg-primary text-primary-foreground h-11" disabled={processing || Number(withdrawAmount) > balance}>
                {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Withdraw ₹${Number(withdrawAmount || 0).toLocaleString()}`}
              </Button>
            </form>
          </div>
        </div>
      )}

      <header className="flex-none h-16 border-b border-border flex items-center gap-4 px-4 lg:px-8 bg-card/50">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/")}><ArrowLeft className="h-4 w-4" /></Button>
        <img src={logoPath} alt="Adhikaar.AI" className="h-8 object-contain" />
        <span className="font-semibold text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> My Wallet</span>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-xl mx-auto p-4 lg:p-8 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Balance card */}
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
                <p className="text-4xl font-bold text-primary">₹{balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Available for consultations and services</p>
                <div className="flex gap-3 mt-5">
                  <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2" onClick={() => setModal("topup")}>
                    <Plus className="h-4 w-4" /> Add Money
                  </Button>
                  <Button variant="outline" className="flex-1 border-primary/30 text-primary hover:bg-primary/10 gap-2" onClick={() => setModal("withdraw")} disabled={balance < 500}>
                    <ArrowDownToLine className="h-4 w-4" /> Withdraw
                  </Button>
                </div>
              </div>

              {/* Transactions */}
              <div>
                <h3 className="font-semibold mb-3">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No transactions yet. Add money to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(txn => {
                      const MethodIcon = METHOD_ICONS[txn.paymentMethod ?? ""] ?? CreditCard;
                      return (
                        <div key={txn.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${["recharge", "refund"].includes(txn.type) ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                              {txnIcon(txn.type)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{txn.description ?? txn.type}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <MethodIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground capitalize">{txn.paymentMethod?.replace("_", " ") ?? "—"}</span>
                                <span className="text-xs text-muted-foreground">· {new Date(txn.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${txnColor(txn.type)}`}>{txnSign(txn.type)}₹{Math.abs(txn.amount).toLocaleString()}</p>
                            <p className={`text-xs ${txn.status === "completed" ? "text-emerald-400" : "text-muted-foreground"}`}>{txn.status}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-card/40 border border-border/40 rounded-xl text-center">
                <p className="text-xs text-muted-foreground">Transactions are secured by Adhikaar.AI. For payment issues, contact support.</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
