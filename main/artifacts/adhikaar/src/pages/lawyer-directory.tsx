import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Briefcase, Award, Phone, Mail, Star, TrendingUp, Scale, UserPlus, LogIn, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logoPath from "@assets/AdikaarAI_Logo_1775754358123.png";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const PRACTICE_AREAS = [
  "Criminal Law",
  "Civil Law",
  "Family Law & Divorce",
  "Property & Real Estate",
  "Consumer Protection",
  "Labour & Employment",
  "Corporate & Business",
  "Constitutional Law",
  "Cyber Law",
  "RTI & Public Law",
  "Domestic Violence",
  "Debt Recovery",
  "Tax Law",
  "Intellectual Property",
];

interface Lawyer {
  id: number;
  name: string;
  designation: string;
  state: string;
  city: string;
  practiceAreas: string[];
  experience: number;
  casesHandled: number;
  wins: number;
  losses: number;
  rating: number;
  barCouncil: string;
  languages: string[];
  overview: string;
  phone: string;
  email: string;
  willingToTravel: boolean;
  fee: string;
}

const LAWYERS_DATA: Lawyer[] = [
  {
    id: 1, name: "Adv. Priya Sharma", designation: "Senior Advocate",
    state: "Delhi", city: "New Delhi", practiceAreas: ["Criminal Law", "Constitutional Law", "RTI & Public Law"],
    experience: 18, casesHandled: 847, wins: 612, losses: 235, rating: 4.8,
    barCouncil: "Bar Council of Delhi", languages: ["English", "Hindi"],
    overview: "Former Additional Sessions Judge with 18 years at the Delhi High Court. Specialises in criminal defence and constitutional writ petitions. Notable for landmark RTI appeals and custodial rights cases. Has argued before the Supreme Court of India on multiple occasions.",
    phone: "+91 98101 XXXXX", email: "priya.sharma@legalindia.in",
    willingToTravel: true, fee: "₹5,000 – ₹25,000 per hearing",
  },
  {
    id: 2, name: "Adv. Ramesh Iyer", designation: "Advocate",
    state: "Tamil Nadu", city: "Chennai", practiceAreas: ["Family Law & Divorce", "Property & Real Estate", "Civil Law"],
    experience: 12, casesHandled: 534, wins: 398, losses: 136, rating: 4.6,
    barCouncil: "Bar Council of Tamil Nadu", languages: ["Tamil", "English"],
    overview: "Practising at the Madras High Court. Handles matrimonial disputes, maintenance, child custody, and property partition matters. Known for empathetic handling of domestic disputes and achieving out-of-court settlements that protect clients' long-term interests.",
    phone: "+91 94443 XXXXX", email: "ramesh.iyer@advocatechennai.in",
    willingToTravel: false, fee: "₹3,000 – ₹12,000 per hearing",
  },
  {
    id: 3, name: "Adv. Sunita Kulkarni", designation: "Senior Advocate",
    state: "Maharashtra", city: "Mumbai", practiceAreas: ["Corporate & Business", "Debt Recovery", "Tax Law"],
    experience: 22, casesHandled: 1120, wins: 876, losses: 244, rating: 4.9,
    barCouncil: "Bar Council of Maharashtra & Goa", languages: ["Marathi", "Hindi", "English"],
    overview: "One of Mumbai's leading corporate litigators with extensive experience at the Bombay High Court and NCLT. Represents large corporates in insolvency proceedings, DRT matters, and tax disputes. Previously served as legal counsel to two Fortune 500 companies in India.",
    phone: "+91 98202 XXXXX", email: "sunita.kulkarni@lex-mumbai.com",
    willingToTravel: true, fee: "₹15,000 – ₹75,000 per hearing",
  },
  {
    id: 4, name: "Adv. Suresh Babu", designation: "Advocate",
    state: "Telangana", city: "Hyderabad", practiceAreas: ["Labour & Employment", "Consumer Protection", "Civil Law"],
    experience: 9, casesHandled: 312, wins: 241, losses: 71, rating: 4.5,
    barCouncil: "Bar Council of Telangana", languages: ["Telugu", "Hindi", "English"],
    overview: "Active at the Telangana High Court and Labour Courts across Hyderabad. Specialises in wrongful termination, PF/ESI disputes, and consumer forum cases. Has successfully represented factory workers in mass layoff disputes and won significant compensation awards.",
    phone: "+91 96000 XXXXX", email: "suresh.babu@labourlaw.hyd",
    willingToTravel: false, fee: "₹2,500 – ₹10,000 per hearing",
  },
  {
    id: 5, name: "Adv. Meera Pillai", designation: "Advocate",
    state: "Kerala", city: "Kochi", practiceAreas: ["Domestic Violence", "Family Law & Divorce", "Criminal Law"],
    experience: 14, casesHandled: 623, wins: 481, losses: 142, rating: 4.7,
    barCouncil: "Bar Council of Kerala", languages: ["Malayalam", "English"],
    overview: "Certified mediator and advocate at the Kerala High Court. Widely respected for her compassionate yet aggressive representation of domestic violence survivors. Has collaborated with NALSA and the Kerala State Legal Services Authority on pro-bono legal aid camps across Ernakulam district.",
    phone: "+91 94470 XXXXX", email: "meera.pillai@keralalegal.in",
    willingToTravel: true, fee: "₹2,000 – ₹8,000 per hearing",
  },
  {
    id: 6, name: "Adv. Arjun Mehta", designation: "Senior Advocate",
    state: "Gujarat", city: "Ahmedabad", practiceAreas: ["Property & Real Estate", "Corporate & Business", "Civil Law"],
    experience: 20, casesHandled: 978, wins: 724, losses: 254, rating: 4.7,
    barCouncil: "Bar Council of Gujarat", languages: ["Gujarati", "Hindi", "English"],
    overview: "Practises at the Gujarat High Court with a strong focus on real estate disputes, RERA matters, and commercial contracts. Has represented major builders and home-buyer associations. Adjunct faculty at Gujarat National Law University for Property Law.",
    phone: "+91 98240 XXXXX", email: "arjun.mehta@reralaw.guj",
    willingToTravel: true, fee: "₹8,000 – ₹40,000 per hearing",
  },
  {
    id: 7, name: "Adv. Kavitha Reddy", designation: "Advocate",
    state: "Andhra Pradesh", city: "Visakhapatnam", practiceAreas: ["Criminal Law", "Cyber Law", "Consumer Protection"],
    experience: 7, casesHandled: 218, wins: 167, losses: 51, rating: 4.4,
    barCouncil: "Bar Council of Andhra Pradesh", languages: ["Telugu", "English"],
    overview: "Emerging specialist in cybercrime and digital fraud cases. Represents victims of online scams, data theft, and defamation at the Andhra Pradesh High Court. Conducts awareness workshops for Vizag Police Department on cyber laws and the IT Act 2000.",
    phone: "+91 79937 XXXXX", email: "kavitha.reddy@cyberlaw.ap",
    willingToTravel: false, fee: "₹3,000 – ₹15,000 per hearing",
  },
  {
    id: 8, name: "Adv. Deepak Singh", designation: "Advocate",
    state: "Uttar Pradesh", city: "Lucknow", practiceAreas: ["Criminal Law", "RTI & Public Law", "Constitutional Law"],
    experience: 11, casesHandled: 445, wins: 334, losses: 111, rating: 4.5,
    barCouncil: "Bar Council of Uttar Pradesh", languages: ["Hindi", "English", "Urdu"],
    overview: "Active at the Allahabad High Court (Lucknow Bench). Known for taking up civil liberties cases pro bono. Has filed landmark public interest litigations on police accountability, jail reforms, and minority rights. Member of the PUCL (People's Union for Civil Liberties).",
    phone: "+91 95000 XXXXX", email: "deepak.singh@civilrightslko.in",
    willingToTravel: true, fee: "₹2,000 – ₹10,000 per hearing",
  },
  {
    id: 9, name: "Adv. Nandita Das", designation: "Advocate",
    state: "West Bengal", city: "Kolkata", practiceAreas: ["Family Law & Divorce", "Labour & Employment", "Intellectual Property"],
    experience: 15, casesHandled: 689, wins: 512, losses: 177, rating: 4.6,
    barCouncil: "Bar Council of West Bengal", languages: ["Bengali", "Hindi", "English"],
    overview: "Practises at the Calcutta High Court. Expert in intellectual property disputes for the creative industry — music, film, publishing. Also handles matrimonial cases and labour disputes for the unorganised sector. Advisor to the Federation of Film Professionals of Eastern India.",
    phone: "+91 98300 XXXXX", email: "nandita.das@ipcal.in",
    willingToTravel: false, fee: "₹4,000 – ₹18,000 per hearing",
  },
  {
    id: 10, name: "Adv. Rajiv Nair", designation: "Senior Advocate",
    state: "Karnataka", city: "Bengaluru", practiceAreas: ["Corporate & Business", "Cyber Law", "Tax Law"],
    experience: 25, casesHandled: 1340, wins: 1023, losses: 317, rating: 4.9,
    barCouncil: "Bar Council of Karnataka", languages: ["Kannada", "English", "Hindi"],
    overview: "One of Bengaluru's foremost corporate lawyers with extensive experience in startup law, venture capital transactions, IP licensing, and tax litigation. Appears before the Karnataka High Court, ITAT, and NCLT. Legal advisor to multiple Series-C and listed tech companies.",
    phone: "+91 98450 XXXXX", email: "rajiv.nair@techlawblr.com",
    willingToTravel: true, fee: "₹20,000 – ₹1,00,000 per hearing",
  },
];

function WinRateBadge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const color = rate >= 75 ? "text-emerald-400" : rate >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <TrendingUp className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-sm font-bold ${color}`}>{rate}%</span>
      <span className="text-xs text-muted-foreground">win rate</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 text-primary fill-primary" />
      <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">/ 5.0</span>
    </div>
  );
}

function LawyerCard({ lawyer, onConnect }: { lawyer: Lawyer; onConnect?: (lawyerId: number) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleConnect = async () => {
    if (!user) { setLocation("/auth"); return; }
    if (user.role === "lawyer") return;
    setConnecting(true);
    await onConnect?.(lawyer.id);
    setConnected(true);
    setConnecting(false);
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-foreground text-base">{lawyer.name}</h3>
              {lawyer.willingToTravel && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary/80 px-1.5 py-0">
                  Travels
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{lawyer.designation} · {lawyer.barCouncil}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              {lawyer.city}, {lawyer.state}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <StarRating rating={lawyer.rating} />
            <p className="text-xs text-muted-foreground mt-1">{lawyer.experience} yrs exp.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {lawyer.practiceAreas.map((area) => (
            <Badge key={area} className="text-xs bg-secondary text-secondary-foreground border-border px-2 py-0.5">
              {area}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-background/50 rounded-xl border border-border/40">
          <div className="text-center">
            <p className="text-base font-bold text-foreground">{lawyer.casesHandled.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Cases</p>
          </div>
          <div className="text-center border-x border-border/40">
            <WinRateBadge wins={lawyer.wins} losses={lawyer.losses} />
            <p className="text-xs text-muted-foreground mt-0.5">{lawyer.wins}W / {lawyer.losses}L</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{lawyer.languages.join(", ")}</span>
            </div>
          </div>
        </div>

        <p className={`text-sm text-foreground/75 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {lawyer.overview}
        </p>

        <button
          className="text-xs text-primary/70 hover:text-primary mt-1 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read full profile"}
        </button>
      </div>

      <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between bg-background/30">
        <div>
          <p className="text-xs text-muted-foreground">Consultation fee</p>
          <p className="text-sm font-semibold text-foreground">{lawyer.fee}</p>
        </div>
        <div className="flex gap-2">
          {user && user.role === "citizen" ? (
            connected ? (
              <Button size="sm" disabled className="h-8 text-xs gap-1.5 bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                <Check className="h-3 w-3" /> Request Sent
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                Connect
              </Button>
            )
          ) : !user ? (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setLocation("/auth")}
            >
              <LogIn className="h-3 w-3" />
              Sign In to Connect
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function LawyerDirectory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedState, setSelectedState] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const filteredLawyers = useMemo(() => {
    if (!hasSearched) return [];
    return LAWYERS_DATA.filter((lawyer) => {
      const stateMatch = !selectedState || lawyer.state === selectedState || lawyer.willingToTravel;
      const areaMatch = !selectedArea || lawyer.practiceAreas.includes(selectedArea);
      return stateMatch && areaMatch;
    }).sort((a, b) => b.rating - a.rating);
  }, [hasSearched, selectedState, selectedArea]);

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleConnect = async (lawyerId: number) => {
    if (!user) { setLocation("/auth"); return; }
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyerId, note: "I would like to connect with you regarding a legal matter." }),
      });
      if (res.ok) {
        toast({ title: "Connection request sent!", description: "The lawyer will review your request shortly." });
      } else if (res.status === 409) {
        toast({ title: "Already requested", description: "You already have a pending connection with this lawyer." });
      } else {
        toast({ title: "Could not send request", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 border-b border-border flex items-center gap-4 px-4 lg:px-8 bg-card/50 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <img src={logoPath} alt="Adhikaar.AI" className="h-8 object-contain" />
          <span className="font-bold text-xl text-primary tracking-tight hidden sm:inline-block">
            Adhikaar.AI
          </span>
        </div>
        <div className="h-5 w-px bg-border mx-1" />
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">Find a Lawyer</span>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Connect with a Legal Professional
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Find experienced advocates across India. Filter by state and practice area to find the right lawyer for your situation.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  State / UT
                </label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="bg-input border-border" data-testid="select-state">
                    <SelectValue placeholder="Select a state or UT" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Practice Area
                </label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="bg-input border-border" data-testid="select-practice-area">
                    <SelectValue placeholder="Select practice area" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {PRACTICE_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Lawyers marked "Travels" are willing to travel to your location.
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-6"
                onClick={handleSearch}
                data-testid="button-search-lawyers"
              >
                <Scale className="h-4 w-4" />
                Find Lawyers
              </Button>
            </div>
          </div>

          {/* Results */}
          {!hasSearched ? (
            <div className="text-center py-16 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-1">Select your state and practice area</p>
              <p className="text-sm">We will match you with qualified lawyers in your region</p>
            </div>
          ) : filteredLawyers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-1">No lawyers found</p>
              <p className="text-sm">Try selecting a different state or practice area</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredLawyers.length}</span> lawyer{filteredLawyers.length !== 1 ? "s" : ""} found
                  {selectedState && ` in or willing to travel to ${selectedState}`}
                </p>
                <p className="text-xs text-muted-foreground">Sorted by rating</p>
              </div>
              <div className="flex flex-col gap-4">
                {filteredLawyers.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} onConnect={handleConnect} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-card/40 border border-border/40 rounded-xl text-center">
            <p className="text-xs text-muted-foreground">
              Adhikaar.AI does not endorse or guarantee any specific lawyer. Verify credentials with the Bar Council of India before engaging. This directory is for informational purposes only.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
