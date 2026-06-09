import { useState, useRef, useEffect, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import {
  Menu,
  Plus,
  Shield,
  Trash2,
  Loader2,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Scale,
  Users,
  LogIn,
  LogOut,
  Wallet,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import logoPath from "@assets/AdikaarAI_Logo_1775754358123.png";
import iconPath from "@assets/AdikaarAI_Icon_1775754358121.png";

interface Message {
  id: string | number;
  role: "user" | "assistant" | string;
  content: string;
}

const COMMON_QUERIES = [
  "What are my rights if I am arrested by the police?",
  "How do I file an RTI application?",
  "My landlord is evicting me illegally — what can I do?",
  "How do I file an FIR if police refuse to register it?",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "bn", label: "বাংলা" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "mr", label: "मराठी" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
];

function ThinkingIndicator() {
  return (
    <div className="flex flex-col items-start max-w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2 ml-1">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Adhikaar.AI
        </span>
      </div>
      <div className="px-5 py-4 bg-card rounded-2xl rounded-tl-sm border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "1.2s" }}
            />
            <span
              className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"
              style={{ animationDelay: "200ms", animationDuration: "1.2s" }}
            />
            <span
              className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
              style={{ animationDelay: "400ms", animationDuration: "1.2s" }}
            />
          </div>
          <span className="text-sm text-muted-foreground italic animate-pulse">
            Adhikaar.AI is thinking...
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [currentMode, setCurrentMode] = useState("citizen");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversationsList, isLoading: isConversationsLoading } =
    useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  const { data: conversationData, isLoading: isConversationLoading } =
    useGetOpenaiConversation(currentConversationId as number, {
      query: {
        enabled: currentConversationId !== null,
        queryKey: getGetOpenaiConversationQueryKey(
          currentConversationId as number
        ),
      },
    });

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(
        conversationData.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    }
  }, [conversationData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim() || isStreaming) return;

    const userText = text.trim();
    setInputValue("");

    const tempUserId = `temp-user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: userText },
    ]);

    let activeConvId = currentConversationId;

    try {
      if (!activeConvId) {
        const newConv = await createConversation.mutateAsync({
          data: {
            title:
              userText.length > 50
                ? userText.substring(0, 50) + "…"
                : userText,
            mode: currentMode,
            language: currentLanguage,
          },
        });
        activeConvId = newConv.id;
        setCurrentConversationId(newConv.id);
        queryClient.invalidateQueries({
          queryKey: getListOpenaiConversationsQueryKey(),
        });
      }

      setIsStreaming(true);

      const response = await fetch(
        `/api/openai/conversations/${activeConvId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: userText,
            mode: currentMode,
            language: currentLanguage,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const tempAiId = `temp-ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempAiId, role: "assistant", content: "" },
      ]);

      let aiContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === "[DONE]") continue;
              const data = JSON.parse(dataStr);
              if (data.done) break;
              if (data.content) {
                aiContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAiId ? { ...m, content: aiContent } : m
                  )
                );
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      }

      queryClient.invalidateQueries({
        queryKey: getGetOpenaiConversationQueryKey(activeConvId),
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) =>
        prev.filter((m) => typeof m.id === "string" && m.id.startsWith("temp-ai") ? false : true)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (
    id: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await deleteConversation.mutateAsync({ id });
      queryClient.invalidateQueries({
        queryKey: getListOpenaiConversationsQueryKey(),
      });
      if (currentConversationId === id) handleNewChat();
    } catch {
      toast({
        title: "Error",
        description: "Could not delete conversation",
        variant: "destructive",
      });
    }
  };

  const SidebarContent = ({ onSelect }: { onSelect?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-2">
        <Button
          className="w-full justify-start gap-2 bg-secondary hover:bg-muted text-secondary-foreground border border-border"
          onClick={() => {
            handleNewChat();
            onSelect?.();
          }}
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          New Consultation
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => setLocation("/lawyers")}
          data-testid="button-contact-lawyer"
        >
          <Users className="h-4 w-4" />
          Find a Lawyer
        </Button>
        {user ? (
          <>
            {user.role === "citizen" && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setLocation("/connections"); onSelect?.(); }}
                >
                  <MessageSquare className="h-4 w-4" />
                  My Connections
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setLocation("/wallet"); onSelect?.(); }}
                >
                  <Wallet className="h-4 w-4" />
                  Wallet
                </Button>
              </>
            )}
            {user.role === "lawyer" && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => { setLocation("/lawyer/dashboard"); onSelect?.(); }}
              >
                <LayoutDashboard className="h-4 w-4" />
                Lawyer Dashboard
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => { setLocation("/auth"); onSelect?.(); }}
          >
            <LogIn className="h-4 w-4" />
            Sign In / Register
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
            Recent Cases
          </div>
          {isConversationsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !conversationsList?.length ? (
            <div className="text-sm text-muted-foreground px-2 py-4">
              No recent cases
            </div>
          ) : (
            conversationsList.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? "bg-secondary border-l-2 border-primary"
                    : "hover:bg-muted border-l-2 border-transparent"
                }`}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  onSelect?.();
                }}
                data-testid={`link-conversation-${conv.id}`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">
                    {conv.title || "Untitled case"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(conv.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[280px] p-0 border-r border-border bg-card text-foreground"
            >
              <SheetHeader className="p-4 border-b border-border text-left">
                <SheetTitle className="text-foreground font-semibold flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Conversations
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-5rem)]">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen((v) => !v)}
            data-testid="button-toggle-sidebar"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleNewChat}
            data-testid="button-logo-home"
          >
            <img
              src={logoPath}
              alt="Adhikaar.AI"
              className="h-8 object-contain"
            />
            <span className="font-bold text-xl text-primary tracking-tight hidden sm:inline-block">
              Adhikaar.AI
            </span>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-medium">
            Accelerating Justice. Empowering Decisions.
          </p>
          <p className="text-xs text-muted-foreground/60 tracking-wide">
            न्याय को गति, निर्णय को शक्ति।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={currentMode} onValueChange={setCurrentMode}>
            <SelectTrigger
              className="w-[130px] h-8 text-xs bg-input border-border hidden sm:flex"
              data-testid="select-mode"
            >
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="citizen">Citizen Mode</SelectItem>
              <SelectItem value="lawyer">Lawyer Mode</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentLanguage} onValueChange={setCurrentLanguage}>
            <SelectTrigger
              className="w-[110px] h-8 text-xs bg-input border-border"
              data-testid="select-language"
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary text-xs h-8"
            onClick={() => setLocation("/lawyers")}
            data-testid="button-contact-lawyer-header"
          >
            <Users className="h-3.5 w-3.5" />
            Find a Lawyer
          </Button>

          {user ? (
            <div className="flex items-center gap-1.5 ml-1">
              {user.role === "citizen" && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/connections")} title="My Connections">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/wallet")} title="Wallet">
                    <Wallet className="h-4 w-4" />
                  </Button>
                </>
              )}
              {user.role === "lawyer" && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/lawyer/dashboard")} title="Lawyer Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              )}
              <button
                className="h-7 w-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center hover:bg-primary/30 transition-colors"
                title={`${user.name} · ${user.role}`}
                onClick={async () => { await logout(); }}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs h-8"
              onClick={() => setLocation("/auth")}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar Desktop */}
        <aside
          className={`hidden lg:flex flex-col border-r border-border bg-card flex-none transition-all duration-300 ease-in-out overflow-hidden ${
            sidebarOpen ? "w-72 opacity-100" : "w-0 opacity-0 border-0"
          }`}
        >
          <SidebarContent />
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative">
          <div
            className="flex-1 overflow-y-auto px-4 py-8"
            id="chat-scroll-area"
          >
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              {/* Welcome / Empty state */}
              {!currentConversationId && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="h-24 w-24 bg-card rounded-3xl border border-border/60 flex items-center justify-center mb-8 shadow-lg shadow-black/30">
                    <img
                      src={iconPath}
                      alt="Adhikaar"
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                    The court is always in session.
                  </h1>
                  <p className="text-muted-foreground max-w-lg mb-3 text-base leading-relaxed">
                    Adhikaar.AI provides precise, authoritative legal
                    intelligence grounded entirely in Indian law and the
                    Constitution of India.
                  </p>
                  <p className="text-muted-foreground/50 text-sm mb-10">
                    Ask in any of the 10 supported languages.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                    {COMMON_QUERIES.map((query, i) => (
                      <button
                        key={i}
                        className="text-left p-4 rounded-xl border border-border bg-card/40 hover:bg-card hover:border-primary/40 transition-all text-sm font-medium shadow-sm hover:shadow-md text-foreground/80 hover:text-foreground group"
                        onClick={() => handleSendMessage(query)}
                        data-testid={`button-suggested-${i}`}
                      >
                        <span className="text-primary mr-2 group-hover:translate-x-0.5 inline-block transition-transform">
                          &rsaquo;
                        </span>
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading conversation */}
              {isConversationLoading &&
                currentConversationId &&
                messages.length === 0 && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  } max-w-full animate-in fade-in duration-300`}
                >
                  {msg.role !== "user" && (
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Adhikaar.AI
                      </span>
                    </div>
                  )}

                  <div
                    className={`relative px-5 py-4 max-w-[92%] md:max-w-[86%] ${
                      msg.role === "user"
                        ? "bg-secondary text-secondary-foreground rounded-2xl rounded-tr-sm border border-border shadow-sm"
                        : "bg-card text-card-foreground rounded-2xl rounded-tl-sm border border-border/60 shadow-sm w-full"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-base prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2 prose-h2:mb-3 prose-h3:text-sm prose-h3:text-primary/90 prose-p:text-foreground/85 prose-p:leading-relaxed prose-li:text-foreground/85 prose-strong:text-foreground prose-strong:font-semibold prose-code:bg-black/40 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-black/50 prose-pre:border prose-pre:border-border prose-hr:border-border/40 prose-blockquote:border-l-primary/60 prose-blockquote:text-muted-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "user" && (
                  <ThinkingIndicator />
                )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Bar */}
          <div className="flex-none p-4 bg-background/90 backdrop-blur-xl border-t border-border">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-input border border-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/60 transition-shadow">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your legal question..."
                  className="flex-1 min-h-[40px] max-h-[180px] resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-1 px-0 placeholder:text-muted-foreground/50"
                  disabled={isStreaming}
                  data-testid="input-message"
                />
                <Button
                  size="icon"
                  className={`h-9 w-9 flex-shrink-0 rounded-lg transition-all mb-0.5 ${
                    inputValue.trim() && !isStreaming
                      ? "bg-primary text-primary-foreground hover:bg-primary/85 shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                  disabled={!inputValue.trim() || isStreaming}
                  onClick={() => handleSendMessage()}
                  data-testid="button-send"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="max-w-3xl mx-auto mt-2 text-center text-xs text-muted-foreground/40">
              Adhikaar.AI provides legal information based on Indian law — not
              formal legal advice. Consult a licensed advocate for your specific
              situation.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
