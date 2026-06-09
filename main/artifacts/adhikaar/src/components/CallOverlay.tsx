import { useState, useEffect } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallOverlayProps {
  recipientName: string;
  type: "audio" | "video";
  connectionId: number;
  callSessionId?: number;
  onEnd: () => void;
}

type CallState = "initiating" | "ringing" | "forwarding" | "connecting" | "ended";

const STATE_MESSAGES: Record<CallState, string> = {
  initiating: "Initiating secure call...",
  ringing: "Calling...",
  forwarding: "Forwarding your call...",
  connecting: "Connecting through Adhikaar.AI secure network...",
  ended: "Call ended",
};

export default function CallOverlay({ recipientName, type, connectionId, callSessionId, onEnd }: CallOverlayProps) {
  const [callState, setCallState] = useState<CallState>("initiating");
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [videoOn, setVideoOn] = useState(type === "video");

  useEffect(() => {
    const timers = [
      setTimeout(() => setCallState("ringing"), 800),
      setTimeout(() => setCallState("forwarding"), 2500),
      setTimeout(() => setCallState("connecting"), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (callState === "connecting") {
      const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleEnd = async () => {
    setCallState("ended");
    if (callSessionId) {
      await fetch(`/api/calls/${callSessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "ended" }),
      }).catch(() => {});
    }
    setTimeout(onEnd, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between py-16 animate-in fade-in duration-300">
      {/* Top info */}
      <div className="flex flex-col items-center gap-4">
        <div className="h-24 w-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-4xl font-bold text-primary">
          {recipientName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{recipientName}</h2>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{type} Call · Adhikaar.AI Secured</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col items-center gap-3">
        {callState !== "connecting" ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 200}ms`, animationDuration: "1.2s" }}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-sm">{STATE_MESSAGES[callState]}</span>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-primary font-mono text-3xl font-bold">{formatTime(elapsed)}</p>
            <p className="text-muted-foreground text-xs mt-1">Connected · End-to-end encrypted</p>
          </div>
        )}

        {type === "video" && callState === "connecting" && (
          <div className="w-72 h-48 bg-zinc-900 rounded-2xl border border-border flex items-center justify-center mt-2">
            {videoOn ? (
              <p className="text-muted-foreground text-sm">Video connecting...</p>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <VideoOff className="h-8 w-8" />
                <span className="text-xs">Camera off</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-5">
          <button
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${muted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white hover:bg-white/20"}`}
            onClick={() => setMuted((v) => !v)}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <Button
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
            onClick={handleEnd}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          {type === "video" ? (
            <button
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${!videoOn ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white hover:bg-white/20"}`}
              onClick={() => setVideoOn((v) => !v)}
            >
              {videoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </button>
          ) : (
            <button
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${!speakerOn ? "bg-white/5 text-muted-foreground" : "bg-white/10 text-white hover:bg-white/20"}`}
              onClick={() => setSpeakerOn((v) => !v)}
            >
              <Volume2 className="h-6 w-6" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/50">All calls are monitored for compliance</p>
      </div>
    </div>
  );
}
