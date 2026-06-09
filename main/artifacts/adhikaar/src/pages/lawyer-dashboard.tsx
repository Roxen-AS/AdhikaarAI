import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  User, Briefcase, MessageSquare, Phone, Video, LogOut,
  Plus, Trash2, Check, X, Loader2, Upload, Star, TrendingUp, Scale,
  ChevronRight, ArrowLeft, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CallOverlay from "@/components/CallOverlay";
import logoPath from "@assets/AdikaarAI_Logo_1775754358123.png";

const PRACTICE_AREAS = [
  "Criminal Law", "Civil Law", "Family Law & Divorce", "Property & Real Estate",
  "Consumer Protection", "Labour & Employment", "Corporate & Business",
  "Constitutional Law", "Cyber Law", "RTI & Public Law", "Domestic Violence",
  "Debt Recovery", "Tax Law", "Intellectual Property",
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Chandigarh","Jammu and Kashmir","Ladakh","Puducherry",
];

type Tab = "profile" | "cases" | "connections" | "messages";

interface Connection {
  id: number; citizenId: number; lawyerId: number; status: string; note?: string; createdAt: string;
  otherUser: { id: number; name: string };
}
interface PlatformMessage { id: number; connectionId: number; senderId: number; content: string; createdAt: string; flagged: boolean; }
interface LawyerCase { id: number; title: string; court?: string; year?: number; outcome: string; description?: string; }

export default function LawyerDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<any>({});
  const [cases, setCases] = useState<LawyerCase[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [callState, setCallState] = useState<{ open: boolean; type: "audio" | "video"; sessionId?: number } | null>(null);
  const [newCase, setNewCase] = useState({ title: "", court: "", year: "", outcome: "win", description: "" });
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!user) setLocation("/auth"); }, [user]);
  useEffect(() => { fetchProfile(); fetchCases(); fetchConnections(); }, []);
  useEffect(() => { if (selectedConn) fetchMessages(selectedConn.id); }, [selectedConn]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchProfile = async () => {
    const r = await fetch("/api/lawyer/profile", { credentials: "include" });
    if (r.ok) setProfile(await r.json());
  };
  const fetchCases = async () => {
    const r = await fetch("/api/lawyer/cases", { credentials: "include" });
    if (r.ok) setCases(await r.json());
  };
  const fetchConnections = async () => {
    const r = await fetch("/api/connections", { credentials: "include" });
    if (r.ok) setConnections(await r.json());
  };
  const fetchMessages = async (connId: number) => {
    const r = await fetch(`/api/connections/${connId}/messages`, { credentials: "include" });
    if (r.ok) setMessages(await r.json());
  };

  const saveProfile = async () => {
    setSaving(true);
    const r = await fetch("/api/lawyer/profile", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, practiceAreas: profile.practiceAreas ?? [] }),
    });
    setSaving(false);
    if (r.ok) toast({ title: "Profile saved" });
    else toast({ title: "Error saving profile", variant: "destructive" });
  };

  const handlePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const serveUrl = `/api/storage/objects${objectPath}`;
      setProfile((p: any) => ({ ...p, profilePicUrl: serveUrl }));
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingPic(false);
    }
  };

  const addCase = async () => {
    if (!newCase.title || !newCase.outcome) return;
    const r = await fetch("/api/lawyer/cases", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCase, year: newCase.year ? Number(newCase.year) : undefined }),
    });
    if (r.ok) { setCases([...cases, await r.json()]); setNewCase({ title: "", court: "", year: "", outcome: "win", description: "" }); }
    else toast({ title: "Error adding case", variant: "destructive" });
  };

  const deleteCase = async (id: number) => {
    const r = await fetch(`/api/lawyer/cases/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) setCases(cases.filter(c => c.id !== id));
  };

  const respondConnection = async (id: number, status: "connected" | "declined") => {
    const r = await fetch(`/api/connections/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) fetchConnections();
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !selectedConn) return;
    const r = await fetch(`/api/connections/${selectedConn.id}/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msgInput }),
    });
    if (r.ok) {
      const msg = await r.json();
      setMessages(p => [...p, msg]);
      setMsgInput("");
      if (msg.filtered) toast({ title: "Message filtered", description: "Contact information was removed per platform policy." });
    }
  };

  const startCall = async (type: "audio" | "video") => {
    if (!selectedConn) return;
    const r = await fetch(`/api/connections/${selectedConn.id}/calls`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = r.ok ? await r.json() : {};
    setCallState({ open: true, type, sessionId: data.id });
  };

  const togglePracticeArea = (area: string) => {
    const current: string[] = profile.practiceAreas ?? [];
    setProfile((p: any) => ({
      ...p,
      practiceAreas: current.includes(area) ? current.filter(a => a !== area) : [...current, area],
    }));
  };

  const wins = cases.filter(c => c.outcome === "win").length;
  const losses = cases.filter(c => c.outcome === "loss").length;
  const pending = connections.filter(c => c.status === "pending");
  const active = connections.filter(c => c.status === "connected");

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "cases", label: "Cases", icon: Briefcase, badge: cases.length },
    { id: "connections", label: "Connections", icon: Scale, badge: pending.length || undefined },
    { id: "messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {callState?.open && selectedConn && (
        <CallOverlay
          recipientName={selectedConn.otherUser.name}
          type={callState.type}
          connectionId={selectedConn.id}
          callSessionId={callState.sessionId}
          onEnd={() => setCallState(null)}
        />
      )}

      {/* Header */}
      <header className="flex-none h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-card/50">
        <div className="flex items-center gap-3">
          <img src={logoPath} alt="Adhikaar.AI" className="h-8 object-contain cursor-pointer" onClick={() => setLocation("/")} />
          <span className="text-xs text-muted-foreground border-l border-border pl-3">Lawyer Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={async () => { await logout(); setLocation("/auth"); }} title="Logout">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card flex-none">
          <div className="p-4 border-b border-border">
            {profile.profilePicUrl ? (
              <img src={profile.profilePicUrl} className="h-14 w-14 rounded-full object-cover border-2 border-primary/30 mx-auto" alt="Profile" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary mx-auto">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-center text-sm font-semibold mt-2 truncate">{user?.name}</p>
            <p className="text-center text-xs text-muted-foreground">{profile.city && profile.state ? `${profile.city}, ${profile.state}` : "Complete your profile"}</p>
            {cases.length > 0 && (
              <div className="flex justify-center gap-3 mt-2 text-xs">
                <span className="text-emerald-400 font-bold">{wins}W</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-400 font-bold">{losses}L</span>
              </div>
            )}
          </div>
          <nav className="p-2 space-y-1">
            {TABS.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-secondary text-foreground border-l-2 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
                {badge ? <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">{badge}</span> : null}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-10 flex">
          {TABS.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs relative ${tab === id ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
              {label}
              {badge ? <span className="absolute top-1 right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{badge}</span> : null}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pb-16 lg:pb-0">
            <div className="max-w-3xl mx-auto p-4 lg:p-8">

              {/* PROFILE TAB */}
              {tab === "profile" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">My Profile</h2>
                    <Button onClick={saveProfile} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>

                  {/* Profile picture */}
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    {profile.profilePicUrl ? (
                      <img src={profile.profilePicUrl} className="h-20 w-20 rounded-full object-cover border-2 border-border" alt="Profile" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center text-3xl font-bold text-primary">
                        {user?.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{user?.name}</p>
                      <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadingPic}>
                        {uploadingPic ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {uploadingPic ? "Uploading..." : "Upload Photo"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bar Council ID</Label>
                      <Input value={profile.barId ?? ""} onChange={e => setProfile((p: any) => ({ ...p, barId: e.target.value }))} placeholder="e.g. DL/1234/2010" className="bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bar Council</Label>
                      <Input value={profile.barCouncil ?? ""} onChange={e => setProfile((p: any) => ({ ...p, barCouncil: e.target.value }))} placeholder="e.g. Bar Council of Delhi" className="bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Years of Practice</Label>
                      <Input type="number" min={0} value={profile.yearsPractice ?? 0} onChange={e => setProfile((p: any) => ({ ...p, yearsPractice: e.target.value }))} className="bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Consultation Fee (₹, min ₹5,000)</Label>
                      <Input type="number" min={5000} step={500} value={profile.consultationFee ?? 5000} onChange={e => setProfile((p: any) => ({ ...p, consultationFee: e.target.value }))} className="bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">City</Label>
                      <Input value={profile.city ?? ""} onChange={e => setProfile((p: any) => ({ ...p, city: e.target.value }))} placeholder="e.g. Mumbai" className="bg-input border-border" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">State</Label>
                      <Select value={profile.state ?? ""} onValueChange={v => setProfile((p: any) => ({ ...p, state: v }))}>
                        <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bio</Label>
                    <Textarea value={profile.bio ?? ""} onChange={e => setProfile((p: any) => ({ ...p, bio: e.target.value }))} placeholder="Tell clients about your expertise, specialisations, and approach..." rows={4} className="bg-input border-border resize-none" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Practice Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRACTICE_AREAS.map(area => (
                        <button key={area} onClick={() => togglePracticeArea(area)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${(profile.practiceAreas ?? []).includes(area) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CASES TAB */}
              {tab === "cases" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Case Record</h2>
                    {cases.length > 0 && (
                      <div className="flex gap-4 text-sm">
                        <span className="text-emerald-400 font-bold">{wins} Wins</span>
                        <span className="text-red-400 font-bold">{losses} Losses</span>
                        <span className="text-muted-foreground">{cases.filter(c => c.outcome === "settled").length} Settled</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Add a Case</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Case title *" value={newCase.title} onChange={e => setNewCase(p => ({ ...p, title: e.target.value }))} className="bg-input border-border" />
                      <Select value={newCase.outcome} onValueChange={v => setNewCase(p => ({ ...p, outcome: v }))}>
                        <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="win">Win ✓</SelectItem>
                          <SelectItem value="loss">Loss ✗</SelectItem>
                          <SelectItem value="settled">Settled ~</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Court / Tribunal" value={newCase.court} onChange={e => setNewCase(p => ({ ...p, court: e.target.value }))} className="bg-input border-border" />
                      <Input type="number" placeholder="Year" value={newCase.year} onChange={e => setNewCase(p => ({ ...p, year: e.target.value }))} className="bg-input border-border" />
                    </div>
                    <Textarea placeholder="Brief description (optional)" value={newCase.description} onChange={e => setNewCase(p => ({ ...p, description: e.target.value }))} rows={2} className="bg-input border-border resize-none" />
                    <Button onClick={addCase} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                      <Plus className="h-4 w-4" /> Add Case
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {cases.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No cases added yet. Add your first case above.</p>}
                    {cases.map(c => (
                      <div key={c.id} className="flex items-start justify-between p-3 bg-card border border-border rounded-xl">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${c.outcome === "win" ? "bg-emerald-500/15 text-emerald-400" : c.outcome === "loss" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                            {c.outcome.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{c.title}</p>
                            {(c.court || c.year) && <p className="text-xs text-muted-foreground">{[c.court, c.year].filter(Boolean).join(" · ")}</p>}
                            {c.description && <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{c.description}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => deleteCase(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONNECTIONS TAB */}
              {tab === "connections" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">Client Connections</h2>

                  {pending.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Requests ({pending.length})</h3>
                      {pending.map(conn => (
                        <div key={conn.id} className="flex items-center justify-between p-4 bg-card border border-primary/20 rounded-xl">
                          <div>
                            <p className="font-semibold">{conn.otherUser.name}</p>
                            {conn.note && <p className="text-sm text-muted-foreground mt-0.5">"{conn.note}"</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => respondConnection(conn.id, "connected")}><Check className="h-3.5 w-3.5" /> Accept</Button>
                            <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => respondConnection(conn.id, "declined")}><X className="h-3.5 w-3.5" /> Decline</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Clients ({active.length})</h3>
                    {active.length === 0 ? <p className="text-muted-foreground text-sm py-4">No active clients yet.</p> : active.map(conn => (
                      <button key={conn.id} className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors text-left"
                        onClick={() => { setSelectedConn(conn); setTab("messages"); }}>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">{conn.otherUser.name.charAt(0)}</div>
                          <p className="font-semibold">{conn.otherUser.name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MESSAGES TAB */}
              {tab === "messages" && (
                <div className="flex flex-col h-full" style={{ height: "calc(100vh - 9rem)" }}>
                  <h2 className="text-xl font-bold mb-4">Messages</h2>
                  {!selectedConn ? (
                    <div className="space-y-2">
                      {active.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">No active connections to message.</p>
                        : active.map(conn => (
                          <button key={conn.id} className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors text-left" onClick={() => setSelectedConn(conn)}>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">{conn.otherUser.name.charAt(0)}</div>
                              <p className="font-semibold">{conn.otherUser.name}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1 overflow-hidden border border-border rounded-xl bg-card">
                      <div className="flex items-center justify-between p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedConn(null)}><ArrowLeft className="h-4 w-4" /></Button>
                          <span className="font-semibold">{selectedConn.otherUser.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => startCall("audio")}><Phone className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => startCall("video")}><Video className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                          {messages.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No messages yet. Start the conversation.</p>}
                          {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.senderId === user?.id ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-secondary-foreground rounded-tl-sm"}`}>
                                {msg.content}
                                {msg.flagged && <p className="text-[10px] opacity-60 mt-1">⚠ Message filtered</p>}
                              </div>
                            </div>
                          ))}
                          <div ref={msgEndRef} />
                        </div>
                      </ScrollArea>
                      <div className="p-3 border-t border-border flex gap-2">
                        <Input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                          placeholder="Type a message..." className="bg-input border-border flex-1" />
                        <Button size="icon" className="bg-primary text-primary-foreground" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
