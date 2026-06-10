import { useState } from "react";
import { useLocation } from "wouter";
import { Scale, Eye, EyeOff, Loader2, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "login" | "signup";
type Role = "citizen" | "lawyer";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<Role>("citizen");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body =
        tab === "signup"
          ? { name, email, password, role }
          : { email, password };

      const res = await fetch(`/api/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      login(data);
      setLocation(data.role === "lawyer" ? "/lawyer/dashboard" : "/");
    } catch {
      toast({ title: "Error", description: "Something went wrong. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <span className="text-lg font-bold">A</span>
          </div>
          <h1 className="text-2xl font-semibold">Adhikaar.AI</h1>
          <p className="text-muted-foreground text-sm">India's Legal AI Platform</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab(t)}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Role selector — signup only */}
            {tab === "signup" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">I am a</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["citizen", "lawyer"] as Role[]).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        role === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {r === "citizen" ? <User className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
                      <span className="text-sm font-semibold capitalize">{r}</span>
                      <span className="text-xs text-center leading-tight opacity-70">
                        {r === "citizen" ? "Seeking legal help" : "Legal professional"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="bg-input border-border"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "Min. 8 characters" : "Your password"}
                  required
                  className="bg-input border-border pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold mt-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tab === "login" ? (
                "Sign In"
              ) : (
                `Create ${role === "lawyer" ? "Lawyer" : "Citizen"} Account`
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              {tab === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => setTab(tab === "login" ? "signup" : "login")}
              >
                {tab === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          By continuing you agree to Adhikaar.AI's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
