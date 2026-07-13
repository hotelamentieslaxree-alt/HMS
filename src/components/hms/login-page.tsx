// ARIA HMS — Professional Login Page
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAppStore, AuthUser, ROLE_META, ModuleKey } from "@/lib/store";
import { Hotel, Shield, Eye, EyeOff, LogIn, ArrowRight, Star, Users, Sparkles, UtensilsCrossed, Wrench, DollarSign, BarChart3, UserCog, ChevronRight, TrendingUp, Megaphone, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

// Quick login cards for demo
const QUICK_LOGINS = [
  { email: "owner@aurelian.com", role: "owner", icon: Shield, color: "#7C3AED", label: "Owner / CEO", desc: "Full system access" },
  { email: "gm@aurelian.com", role: "gm", icon: Hotel, color: "#1B3A6B", label: "General Manager", desc: "Operations overview" },
  { email: "fom@aurelian.com", role: "fom", icon: Users, color: "#0369A1", label: "Front Office Mgr", desc: "Reservations & check-in" },
  { email: "hk_mgr@aurelian.com", role: "hk_mgr", icon: Sparkles, color: "#0F766E", label: "Housekeeping Mgr", desc: "Rooms & cleaning" },
  { email: "fb_mgr@aurelian.com", role: "fb_mgr", icon: UtensilsCrossed, color: "#B45309", label: "F&B Manager", desc: "Outlets & POS" },
  { email: "fin_mgr@aurelian.com", role: "fin_mgr", icon: DollarSign, color: "#15803D", label: "Finance Mgr", desc: "Billing & reports" },
  { email: "eng_mgr@aurelian.com", role: "eng_mgr", icon: Wrench, color: "#DC2626", label: "Engineering Mgr", desc: "Maintenance & assets" },
  { email: "rev_mgr@aurelian.com", role: "rev_mgr", icon: BarChart3, color: "#7C3AED", label: "Revenue Mgr", desc: "Pricing & analytics" },
  { email: "hr_mgr@aurelian.com", role: "hr_mgr", icon: UserCog, color: "#BE185D", label: "HR Manager", desc: "Staff & training" },
  { email: "sales_mgr@aurelian.com", role: "sales_mgr", icon: TrendingUp, color: "#EA580C", label: "Sales Manager", desc: "Leads & pipeline" },
  { email: "mkt_mgr@aurelian.com", role: "mkt_mgr", icon: Megaphone, color: "#7C3AED", label: "Marketing Mgr", desc: "Campaigns & social" },
  { email: "receptionist@aurelian.com", role: "receptionist", icon: Users, color: "#0F766E", label: "Receptionist", desc: "Front desk operations" },
  { email: "hk_attendant@aurelian.com", role: "hk_attendant", icon: Sparkles, color: "#0F766E", label: "HK Attendant", desc: "Cleaning tasks" },
  { email: "waiter@aurelian.com", role: "waiter", icon: UtensilsCrossed, color: "#0F766E", label: "Waiter", desc: "Order taking" },
  { email: "technician@aurelian.com", role: "technician", icon: Wrench, color: "#6B7280", label: "Technician", desc: "Repairs & maintenance" },
  { email: "sales_exec@aurelian.com", role: "sales_exec", icon: TrendingUp, color: "#F97316", label: "Sales Executive", desc: "Lead generation" },
  { email: "mkt_exec@aurelian.com", role: "mkt_exec", icon: Megaphone, color: "#8B5CF6", label: "Marketing Exec", desc: "Social & content" },
  { email: "purchase_mgr@aurelian.com", role: "purchase_mgr", icon: ShoppingCart, color: "#10B981", label: "Purchase Manager", desc: "Procurement & inventory" },
];

export function LoginPage() {
  const { setUser, navigateTo } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"cards" | "manual">("cards");

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("aria_auth");
    if (stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        setUser(user);
      } catch {
        localStorage.removeItem("aria_auth");
      }
    }
  }, [setUser]);

  // Role-based default module after login
  const getDefaultModule = (role: string): ModuleKey => {
    const roleModuleMap: Record<string, ModuleKey> = {
      purchase_mgr: "purchasing",
      hk_mgr: "housekeeping",
      hk_attendant: "housekeeping",
      fb_mgr: "pos",
      waiter: "pos",
      fin_mgr: "finance",
      eng_mgr: "maintenance",
      technician: "maintenance",
      rev_mgr: "reports",
      hr_mgr: "hr",
      sales_mgr: "sales",
      sales_exec: "sales",
      mkt_mgr: "marketing",
      mkt_exec: "marketing",
      fom: "rooms",
      receptionist: "reservations",
    };
    return roleModuleMap[role] || "dashboard";
  };

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    try {
      const userData = await api<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      localStorage.setItem("aria_auth", JSON.stringify(userData));
      setUser(userData);
      // Navigate to role-specific default module
      const defaultModule = getDefaultModule(userData.role);
      navigateTo(defaultModule);
      toast.success(`Welcome, ${userData.firstName}!`);
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (qEmail: string) => {
    setEmail(qEmail);
    handleLogin(qEmail, "aurelian2024");
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    handleLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FFC0CB] via-[#FFB3C6] to-[#FF69B4] text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D6336C]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF69B4]/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF69B4]/10 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF69B4] to-[#FF8EC7] text-white font-display font-bold text-lg shadow-glow-gold">
              A
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">ARIA HMS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#FFE0EE]">Hospitality Operating System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> SOC2 Compliant</span>
            <span>·</span>
            <span>GDPR Ready</span>
            <span>·</span>
            <span>PCI-DSS</span>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-6xl">
            {/* Welcome text */}
            <div className="text-center mb-10 animate-[fadeInUp_0.6s_ease-out]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF69B4]/30 bg-[#FF69B4]/10 px-4 py-1.5 mb-4">
                <Star className="h-3.5 w-3.5 text-[#FF69B4]" />
                <span className="text-xs font-medium text-[#FFE0EE]">The Aurelian Grand · Mumbai</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                Welcome to <span className="text-[#FF69B4]">ARIA</span>
              </h2>
              <p className="mt-3 text-base text-white/50 max-w-lg mx-auto">
                Select your role to access your workspace, or sign in with your credentials
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                onClick={() => setMode("cards")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "cards" ? "bg-[#D6336C] text-white" : "bg-white/20 text-white/80 hover:bg-white/30"}`}
              >
                Quick Access
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "manual" ? "bg-[#D6336C] text-white" : "bg-white/20 text-white/80 hover:bg-white/30"}`}
              >
                Sign In
              </button>
            </div>

            {mode === "cards" ? (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                {/* Role cards grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
                  {QUICK_LOGINS.map((q) => {
                    const Icon = q.icon;
                    const meta = ROLE_META[q.role];
                    return (
                      <button
                        key={q.email}
                        onClick={() => quickLogin(q.email)}
                        disabled={loading}
                        className="group relative flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/15 p-4 text-center hover:border-[#FF69B4]/50 hover:bg-white/25 transition-all duration-300 disabled:opacity-50"
                      >
                        {/* Role badge */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${q.color}20` }}>
                          <Icon className="h-5 w-5" style={{ color: q.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-[#FF8EC7] transition-colors">{q.label}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{q.desc}</p>
                        </div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-3.5 w-3.5 text-[#FF69B4]" />
                        </div>
                        {/* Level badge */}
                        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-white/30">L{meta?.level ?? 4}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-white/30 mt-6">
                  Click a role card to instantly log in · Demo password: <code className="px-1.5 py-0.5 rounded bg-white/20 text-[#FF8EC7]">aurelian2024</code>
                </p>
              </div>
            ) : (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <form onSubmit={submitManual} className="max-w-md mx-auto space-y-4">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-8 space-y-5">
                    <div className="text-center mb-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF69B4] to-[#FF8EC7] text-white mx-auto mb-3">
                        <LogIn className="h-6 w-6" />
                      </div>
                      <h3 className="font-display text-xl font-bold">Sign In</h3>
                      <p className="text-xs text-white/40 mt-1">Enter your ARIA HMS credentials</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.name@aurelian.com"
                        className="w-full rounded-lg border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#FF69B4]/50 focus:outline-none focus:ring-1 focus:ring-[#FF69B4]/30 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder:text-white/30 focus:border-[#C9952A]/50 focus:outline-none focus:ring-1 focus:ring-[#C9952A]/30 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D6336C] to-[#FF69B4] px-4 py-3 text-sm font-bold text-white hover:shadow-glow-gold transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4" />
                          Sign In
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-center text-xs text-white/30">
                    All demo accounts use password: <code className="px-1.5 py-0.5 rounded bg-white/20 text-[#FF8EC7]">aurelian2024</code>
                  </p>
                </form>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 lg:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-white/20">
            <p>ARIA HMS v2.0 · Hospitality Operating System</p>
            <p>Secure · AI-Powered · Real-time · Enterprise-grade</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
