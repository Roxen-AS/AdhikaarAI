import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Phone, Video, Send, ChevronRight, Scale, Loader2, Check, Clock, X, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CallOverlay from "@/components/CallOverlay";
import logoPath from "@assets/AdikaarAI_Logo_1775754358123.png";

interface Connection {
  id: number; citizenId: number; lawyerId: number; status: string; note?: string; createdAt: string;
  otherUser: { id: number; name: string };
  lawyerProfile?: { profilePicUrl?: string; consultationFee?: number };
}
interface PlatformMessage { id: number; connectionId: number; senderId: number; content: string; createdAt: string; flagged: boolean; }

export default function CitizenConnections() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [callState, setCallState] = useState<{ open: boolean; type: "audio" | "video"; sessionId?: number } | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!user) setLocation("/auth"); }, [user]);
  useEffect(() => { fetchConnections(); }, []);
  useEffect(() => { if (selectedConn) fetchMessages(selectedConn.id); }, [selectedConn]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConnections = async () => {
    setLoading(true);
    const r = await fetch("/api/connections", { credentials: "include" });
    if (r.ok) setConnections(await r.json());
    setLoading(false);
  };

  const fetchMessages = async (connId: number) => {
    const r = await fetch(`/api/connections/${connId}/messages`, { credentials: "include" });
    if (r.ok) setMessages(await r.json());
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
      if (msg.filtered) toast({ title: "Message filtered", description: "Contact info was removed per platform guidelines." });
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

  const statusIcon = (status: string) => {
    if (status === "connected") return <Check className="h-3.5 w-3.5 text-emerald-400" />;
    if (status === "pending") return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
    return <X className="h-3.5 w-3.5 text-red-400" />;
  };
  const statusLabel = (status: string) => status === "connected" ? "Connected" : status === "pending" ? "Pending" : "Declined";

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

      <header className="flex-none h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-card/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <img src={logoPath} alt="Adhikaar.AI" className="h-8 object-contain" />
          <span className="text-xs text-muted-foreground border-l border-border pl-3 hidden sm:block">My Connections</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs" onClick={() => setLocation("/lawyers")}>
            <Users className="h-3.5 w-3.5" /> Find a Lawyer
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 border-border text-xs" onClick={() => setLocation("/wallet")}>
            <Wallet className="h-3.5 w-3.5" /> Wallet
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Connection list */}
        <aside className={`flex flex-col border-r border-border bg-card flex-none transition-all ${selectedConn ? "hidden lg:flex w-64" : "w-full lg:w-72"}`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">My Lawyers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{connections.filter(c => c.status === "connected").length} active connections</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              {!loading && connections.length === 0 && (
                <div className="text-center py-10">
                  <Scale className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No connections yet.</p>
                  <Button size="sm" className="mt-3 bg-primary text-primary-foreground text-xs" onClick={() => setLocation("/lawyers")}>Find a Lawyer</Button>
                </div>
              )}
              {connections.map(conn => (
                <button key={conn.id} onClick={() => conn.status === "connected" ? setSelectedConn(conn) : null}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selectedConn?.id === conn.id ? "bg-secondary border-l-2 border-primary" : "hover:bg-muted border-l-2 border-transparent"} ${conn.status !== "connected" ? "opacity-60 cursor-default" : ""}`}>
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold flex-shrink-0 text-sm">
                    {conn.otherUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{conn.otherUser.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {statusIcon(conn.status)}
                      <span className="text-xs text-muted-foreground">{statusLabel(conn.status)}</span>
                    </div>
                  </div>
                  {conn.status === "connected" && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Message area */}
        {selectedConn ? (
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-none flex items-center justify-between p-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSelectedConn(null)}><ArrowLeft className="h-4 w-4" /></Button>
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">{selectedConn.otherUser.name.charAt(0)}</div>
                <div>
                  <p className="font-semibold text-sm">{selectedConn.otherUser.name}</p>
                  <p className="text-xs text-emerald-400">Connected</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-9 w-9 text-primary hover:bg-primary/10" onClick={() => startCall("audio")} title="Audio call"><Phone className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-primary hover:bg-primary/10" onClick={() => startCall("video")} title="Video call"><Video className="h-4 w-4" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-2xl mx-auto">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground/60 bg-card border border-border/40 rounded-full px-3 py-1 inline-block">
                    Connected · Messages are monitored per Adhikaar.AI guidelines
                  </p>
                </div>
                {messages.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No messages yet. Say hello!</p>}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.senderId === user?.id ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                      {msg.content}
                      {msg.flagged && <p className="text-[10px] opacity-60 mt-1">⚠ Some content was removed</p>}
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
            </ScrollArea>

            <div className="flex-none p-3 border-t border-border bg-background/80">
              <div className="flex gap-2 max-w-2xl mx-auto">
                <Input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Message your lawyer..." className="bg-input border-border flex-1" />
                <Button size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
              </div>
              <p className="text-center text-xs text-muted-foreground/40 mt-1.5">Contact information is automatically filtered from messages</p>
            </div>
          </main>
        ) : (
          <main className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquareIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a connection to start messaging</p>
              <p className="text-sm mt-1">All communications are secure and monitored</p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}
