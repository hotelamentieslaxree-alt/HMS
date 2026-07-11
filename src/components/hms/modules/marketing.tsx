// ARIA HMS — Marketing Hub Module (dark theme, gold accents)
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { fmtINR } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Megaphone,
  TrendingUp,
  Users,
  BarChart3,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  Share2,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
  Plus,
  Search,
  ExternalLink,
  Unplug,
  Diamond,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Download,
  FileText,
  Activity,
  Zap,
  Globe,
  Heart,
  MessageCircle,
  RefreshCw,
  Check,
  X,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// ─── Theme Constants ─────────────────────────────────────────────
const GOLD = "#F5A623";
const GOLD_DARK = "#C9952A";
const GOLD_LIGHT = "#FFD700";
const SUCCESS = "#22C55E";
const ERROR = "#EF4444";
const WARNING = "#F59E0B";
const INFO = "#3B82F6";
const DARK_BG = "#0D1117";
const DARK_CARD = "#161B22";
const DARK_CARD_ALT = "#1C2333";
const DARK_BORDER = "rgba(255,255,255,0.08)";
const DARK_BORDER_HOVER = "rgba(255,255,255,0.15)";
const TEXT_PRIMARY = "#F0F6FC";
const TEXT_SECONDARY = "#8B949E";
const TEXT_MUTED = "#6E7681";

// ─── Platform Brand Colors ───────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E4405F",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  twitter: "#000000",
  tiktok: "#000000",
  pinterest: "#BD081C",
  google: "#EA4335",
};

const PLATFORM_GRADIENTS: Record<string, string> = {
  instagram: "from-[#833AB4] via-[#E4405F] to-[#FCAF45]",
  facebook: "from-[#1877F2] to-[#42A5F5]",
  linkedin: "from-[#0A66C2] to-[#0D8AEE]",
  youtube: "from-[#FF0000] to-[#FF5252]",
  twitter: "from-[#14171A] to-[#657786]",
  tiktok: "from-[#010101] to-[#69C9D0]",
  pinterest: "from-[#BD081C] to-[#E60023]",
  google: "from-[#EA4335] to-[#FBBC04]",
};

// ─── Platform Icons ──────────────────────────────────────────────
function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const cls = className || "h-5 w-5";
  switch (platform) {
    case "instagram": return <Instagram className={cls} />;
    case "facebook": return <Facebook className={cls} />;
    case "linkedin": return <Linkedin className={cls} />;
    case "youtube": return <Youtube className={cls} />;
    case "twitter": return <Twitter className={cls} />;
    case "tiktok": return <Zap className={cls} />;
    case "pinterest": return <Heart className={cls} />;
    case "google": return <Globe className={cls} />;
    default: return <Share2 className={cls} />;
  }
}

// ─── Mock Data ───────────────────────────────────────────────────
const MOCK_TRAFFIC_DATA = [
  { month: "Jul", paid: 4200, organic: 2800 },
  { month: "Aug", paid: 4800, organic: 3200 },
  { month: "Sep", paid: 5100, organic: 3600 },
  { month: "Oct", paid: 4600, organic: 3900 },
  { month: "Nov", paid: 5400, organic: 4100 },
  { month: "Dec", paid: 6200, organic: 4500 },
  { month: "Jan", paid: 5800, organic: 4800 },
  { month: "Feb", paid: 6500, organic: 5200 },
  { month: "Mar", paid: 7200, organic: 5600 },
  { month: "Apr", paid: 6800, organic: 5900 },
  { month: "May", paid: 7600, organic: 6200 },
  { month: "Jun", paid: 8100, organic: 6500 },
];

const MOCK_FUNNEL_DATA = [
  { stage: "Impressions", value: 245000, fill: GOLD },
  { stage: "Clicks", value: 18200, fill: "#E8A020" },
  { stage: "Page Views", value: 12400, fill: "#D49518" },
  { stage: "Add to Cart", value: 4200, fill: "#C08A10" },
  { stage: "Signups", value: 9200, fill: GOLD_DARK },
];

const MOCK_DEMOGRAPHICS = [
  { name: "18-24", value: 22, fill: "#F5A623" },
  { name: "25-34", value: 35, fill: "#C9952A" },
  { name: "35-44", value: 24, fill: "#A67B1E" },
  { name: "45-54", value: 12, fill: "#8B6516" },
  { name: "55+", value: 7, fill: "#6E4F0E" },
];

const MOCK_CHANNEL_PERF = [
  { platform: "Instagram", reach: 85000, engagement: 4.2, conversions: 1200 },
  { platform: "Facebook", reach: 62000, engagement: 2.8, conversions: 800 },
  { platform: "LinkedIn", reach: 34000, engagement: 3.5, conversions: 450 },
  { platform: "YouTube", reach: 48000, engagement: 1.9, conversions: 320 },
  { platform: "Google Ads", reach: 120000, engagement: 5.1, conversions: 2800 },
];

const MOCK_TOP_POSTS = [
  { id: 1, platform: "instagram", title: "Luxury Suite Reveal 🏨", reach: 42000, likes: 3200, comments: 189, shares: 245, date: "2025-01-15" },
  { id: 2, platform: "facebook", title: "Weekend Getaway Package", reach: 38000, likes: 2100, comments: 156, shares: 312, date: "2025-01-12" },
  { id: 3, platform: "instagram", title: "Poolside Sunset Views", reach: 35000, likes: 4500, comments: 234, shares: 189, date: "2025-01-10" },
  { id: 4, platform: "linkedin", title: "Corporate Retreat Packages 2025", reach: 28000, likes: 890, comments: 67, shares: 156, date: "2025-01-08" },
  { id: 5, platform: "youtube", title: "Hotel Tour — Presidential Wing", reach: 56000, likes: 2800, comments: 345, shares: 123, date: "2025-01-05" },
];

interface Campaign {
  id: string;
  name: string;
  type: string;
  platform: string;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  startDate: string;
  endDate: string;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Summer Paradise 2025", type: "brand_awareness", platform: "instagram", status: "active", budget: 50000, spent: 32000, impressions: 245000, clicks: 18200, conversions: 420, roas: 5.2 },
  { id: "c2", name: "Corporate Retreat Promo", type: "lead_gen", platform: "linkedin", status: "active", budget: 30000, spent: 18000, impressions: 120000, clicks: 8400, conversions: 310, roas: 4.8 },
  { id: "c3", name: "Weekend Flash Sale", type: "conversion", platform: "facebook", status: "paused", budget: 15000, spent: 12500, impressions: 98000, clicks: 7200, conversions: 580, roas: 6.1 },
  { id: "c4", name: "Brand Video Campaign", type: "video", platform: "youtube", status: "active", budget: 75000, spent: 45000, impressions: 520000, clicks: 28000, conversions: 890, roas: 3.9 },
  { id: "c5", name: "Google Search — Hotel", type: "search", platform: "google", status: "active", budget: 40000, spent: 28000, impressions: 380000, clicks: 22000, conversions: 1200, roas: 7.2 },
  { id: "c6", name: "New Year Gala Invite", type: "event", platform: "instagram", status: "completed", budget: 20000, spent: 20000, impressions: 180000, clicks: 15000, conversions: 650, roas: 5.8 },
  { id: "c7", name: "Spa & Wellness Q1", type: "brand_awareness", platform: "facebook", status: "draft", budget: 25000, spent: 0, impressions: 0, clicks: 0, conversions: 0, roas: 0 },
  { id: "c8", name: "Loyalty Program Push", type: "retargeting", platform: "google", status: "cancelled", budget: 10000, spent: 2000, impressions: 15000, clicks: 800, conversions: 45, roas: 1.2 },
];

interface SocialAccount {
  id: string;
  platform: string;
  handle: string;
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  connected: boolean;
  lastSynced: string;
  avatarUrl?: string;
}

const MOCK_SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: "s1", platform: "instagram", handle: "@aria.luxury.hotel", followers: 45200, following: 320, posts: 1284, engagementRate: 4.2, connected: true, lastSynced: "2025-01-20T10:30:00" },
  { id: "s2", platform: "facebook", handle: "Aria Luxury Hotel", followers: 68000, following: 120, posts: 856, engagementRate: 2.8, connected: true, lastSynced: "2025-01-20T09:15:00" },
  { id: "s3", platform: "linkedin", handle: "Aria Hotels & Resorts", followers: 12400, following: 890, posts: 342, engagementRate: 3.5, connected: true, lastSynced: "2025-01-20T08:00:00" },
  { id: "s4", platform: "youtube", handle: "Aria Luxury Hotels", followers: 38000, following: 15, posts: 86, engagementRate: 1.9, connected: true, lastSynced: "2025-01-19T18:45:00" },
  { id: "s5", platform: "twitter", handle: "@aria_hotels", followers: 16400, following: 450, posts: 2890, engagementRate: 2.1, connected: true, lastSynced: "2025-01-20T07:30:00" },
  { id: "s6", platform: "tiktok", handle: "@aria.luxury", followers: 0, following: 0, posts: 0, engagementRate: 0, connected: false, lastSynced: "" },
  { id: "s7", platform: "pinterest", handle: "", followers: 0, following: 0, posts: 0, engagementRate: 0, connected: false, lastSynced: "" },
];

// ─── Helper: Greeting ────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toString();
}

function timeAgo(d: string | Date) {
  if (!d) return "Never";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

// ─── Status Badge ────────────────────────────────────────────────
const CAMPAIGN_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-white/10 text-gray-400 border-white/10" },
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused: { label: "Paused", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  completed: { label: "Completed", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function CampaignStatusBadge({ status }: { status: string }) {
  const m = CAMPAIGN_STATUS_META[status] ?? CAMPAIGN_STATUS_META.draft;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", m.cls)}>
      {m.label}
    </span>
  );
}

// ─── Platform Badge ──────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] || "#6B7280";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-300">
      <PlatformIcon platform={platform} className="h-3 w-3" style={{ color }} />
      <span style={{ color }}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
    </span>
  );
}

// ─── Campaign Type Icon ──────────────────────────────────────────
function CampaignTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "brand_awareness": return <Eye className="h-3.5 w-3.5 text-blue-400" />;
    case "lead_gen": return <Target className="h-3.5 w-3.5 text-amber-400" />;
    case "conversion": return <Zap className="h-3.5 w-3.5 text-emerald-400" />;
    case "video": return <Youtube className="h-3.5 w-3.5 text-red-400" />;
    case "search": return <Search className="h-3.5 w-3.5 text-purple-400" />;
    case "event": return <CalendarDays className="h-3.5 w-3.5 text-pink-400" />;
    case "retargeting": return <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />;
    default: return <Megaphone className="h-3.5 w-3.5 text-gray-400" />;
  }
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  brand_awareness: "Brand Awareness",
  lead_gen: "Lead Generation",
  conversion: "Conversion",
  video: "Video",
  search: "Search Ads",
  event: "Event",
  retargeting: "Retargeting",
};

// ─── Custom Tooltip ──────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1C2333] px-3 py-2 shadow-xl">
      {label && <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color || GOLD }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card (Dark Theme) ───────────────────────────────────────
function DarkKpiCard({
  label, value, unit, delta, icon: Icon, accentColor = GOLD,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: number; label?: string };
  icon?: any;
  accentColor?: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#161B22] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#1C2333]"
    >
      {/* Accent glow */}
      <div
        className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]"
        style={{ backgroundColor: accentColor }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#F0F6FC]">
            {value}
            {unit && <span className="ml-0.5 text-sm font-medium text-[#6E7681]">{unit}</span>}
          </p>
        </div>
        {Icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: accentColor + "18" }}
          >
            <Icon className="h-4 w-4" style={{ color: accentColor }} />
          </div>
        )}
      </div>
      {delta && (
        <div className="relative mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
              delta.value >= 0
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            )}
          >
            {delta.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta.value)}%
          </span>
          {delta.label && <span className="text-[#6E7681]">{delta.label}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Gold Metric Card ────────────────────────────────────────────
function GoldMetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#F5A623]/20 bg-gradient-to-br from-[#F5A623]/10 via-[#C9952A]/5 to-transparent p-4 transition-all hover:border-[#F5A623]/30">
      <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-[#F5A623]/5 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5A623]/15">
          <Icon className="h-5 w-5 text-[#F5A623]" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#C9952A]">{label}</p>
          <p className="text-xl font-bold text-[#F5A623]">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab metadata ─────────────────────────────────────────────
const MKT_TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "social", label: "Social Accounts", icon: Share2 },
  { key: "analytics", label: "Analytics", icon: Activity },
  { key: "reports", label: "Reports", icon: FileText },
];

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export function MarketingModule() {
  const { user, activeSubModule, setActiveSubModule } = useAppStore();
  const [localTab, setLocalTab] = useState("overview");
  const activeTab = (activeSubModule && MKT_TABS.some(t => t.key === activeSubModule)) ? activeSubModule : localTab;

  const handleTabChange = (newTab: string) => {
    setLocalTab(newTab);
    setActiveSubModule(newTab);
  };

  const activeTabMeta = MKT_TABS.find(t => t.key === activeTab);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState("30");
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(MOCK_SOCIAL_ACCOUNTS);

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "brand_awareness",
    platform: "instagram",
    status: "draft" as Campaign["status"],
    budget: 0,
    startDate: "",
    endDate: "",
  });

  // Social account form state
  const [socialForm, setSocialForm] = useState({
    platform: "instagram",
    handle: "",
  });

  // ─── Filtered Campaigns ──────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(campaignSearch.toLowerCase());
      const matchesStatus = campaignStatusFilter === "all" || c.status === campaignStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, campaignSearch, campaignStatusFilter]);

  // ─── Social Stats ────────────────────────────────────────────
  const socialStats = useMemo(() => {
    const connected = socialAccounts.filter((a) => a.connected);
    const totalFollowers = connected.reduce((sum, a) => sum + a.followers, 0);
    const avgEngagement = connected.length > 0
      ? connected.reduce((sum, a) => sum + a.engagementRate, 0) / connected.length
      : 0;
    return { totalFollowers, avgEngagement, totalAccounts: connected.length };
  }, [socialAccounts]);

  // ─── Campaign Handlers ───────────────────────────────────────
  const handleSaveCampaign = useCallback(() => {
    if (!campaignForm.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (editingCampaign) {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === editingCampaign.id
            ? { ...c, ...campaignForm }
            : c
        )
      );
      toast.success("Campaign updated successfully");
    } else {
      const newCampaign: Campaign = {
        id: "c" + Date.now(),
        ...campaignForm,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        roas: 0,
      };
      setCampaigns((prev) => [...prev, newCampaign]);
      toast.success("Campaign created successfully");
    }
    setCampaignDialogOpen(false);
    setEditingCampaign(null);
    setCampaignForm({ name: "", type: "brand_awareness", platform: "instagram", status: "draft", budget: 0, startDate: "", endDate: "" });
  }, [campaignForm, editingCampaign]);

  const handleEditCampaign = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      type: campaign.type,
      platform: campaign.platform,
      status: campaign.status,
      budget: campaign.budget,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    });
    setCampaignDialogOpen(true);
  }, []);

  const handleDeleteCampaign = useCallback((id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Campaign deleted");
  }, []);

  // ─── Social Account Handlers ─────────────────────────────────
  const handleConnectAccount = useCallback(() => {
    if (!socialForm.handle.trim()) {
      toast.error("Handle is required");
      return;
    }
    setSocialAccounts((prev) =>
      prev.map((a) =>
        a.platform === socialForm.platform && !a.connected
          ? {
              ...a,
              handle: socialForm.handle,
              connected: true,
              lastSynced: new Date().toISOString(),
              followers: Math.floor(Math.random() * 50000) + 5000,
              following: Math.floor(Math.random() * 500) + 50,
              posts: Math.floor(Math.random() * 1000) + 100,
              engagementRate: parseFloat((Math.random() * 5 + 1).toFixed(1)),
            }
          : a
      )
    );
    setSocialDialogOpen(false);
    setSocialForm({ platform: "instagram", handle: "" });
    toast.success(`${socialForm.platform.charAt(0).toUpperCase() + socialForm.platform.slice(1)} account connected!`);
  }, [socialForm]);

  const handleDisconnectAccount = useCallback((id: string) => {
    setSocialAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, connected: false, handle: "", followers: 0, following: 0, posts: 0, engagementRate: 0, lastSynced: "" }
          : a
      )
    );
    toast.success("Account disconnected");
  }, []);

  // ─── Conversion Funnel data ──────────────────────────────────
  const funnelChartData = useMemo(() => {
    return MOCK_FUNNEL_DATA.map((d) => ({
      ...d,
      displayValue: d.value >= 1000 ? formatCount(d.value) : d.value.toString(),
    }));
  }, []);

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0D1117] text-white p-4 sm:p-6">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7C3AED]/10">
            <Megaphone className="h-4.5 w-4.5 text-[#7C3AED]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Marketing Hub</h2>
            <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "Overview"} · Marketing & Communications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            onClick={() => toast.info("Data refreshed")}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="mb-6 overflow-x-auto">
          <TabsList className="inline-flex h-10 items-center gap-1 rounded-lg bg-white/5 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-md px-3 text-xs font-medium text-gray-400 transition-all data-[state=active]:shadow-none"
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-md px-3 text-xs font-medium text-gray-400 transition-all data-[state=active]:shadow-none"
            >
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-md px-3 text-xs font-medium text-gray-400 transition-all data-[state=active]:shadow-none"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Social Accounts
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-md px-3 text-xs font-medium text-gray-400 transition-all data-[state=active]:shadow-none"
            >
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-[#F5A623]/15 data-[state=active]:text-[#F5A623] rounded-md px-3 text-xs font-medium text-gray-400 transition-all data-[state=active]:shadow-none"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Reports
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: OVERVIEW
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Greeting Banner */}
          <div className="relative overflow-hidden rounded-xl border border-[#F5A623]/15 bg-gradient-to-r from-[#F5A623]/8 via-[#C9952A]/4 to-transparent p-5">
            <div className="absolute right-4 top-3 text-[#F5A623]/10">
              <Diamond className="h-20 w-20" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2">
                <Diamond className="h-5 w-5 text-[#F5A623]" />
                <h2 className="text-lg font-bold text-[#F0F6FC]">
                  Good {getGreeting()}, {user?.firstName || "Admin"}
                </h2>
              </div>
              <p className="mt-1 text-sm text-[#8B949E]">
                Your marketing dashboard is performing <span className="font-semibold text-[#22C55E]">23% better</span> than last month. Keep the momentum going!
              </p>
            </div>
          </div>

          {/* Gold Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GoldMetricCard label="ROAS" value="+11.2%" icon={TrendingUp} />
            <GoldMetricCard label="LEADS" value="+48" icon={Target} />
            <GoldMetricCard label="CONVERSIONS" value="+8.3%" icon={Zap} />
          </div>

          {/* KPI Dashboard */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#8B949E] uppercase tracking-wider">KPI Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DarkKpiCard
                label="Total Spend"
                value="₹74K"
                delta={{ value: -14.6, label: "vs last month" }}
                icon={DollarSign}
                accentColor={ERROR}
              />
              <DarkKpiCard
                label="Conversions"
                value="9.2K"
                delta={{ value: 8.3, label: "vs last month" }}
                icon={Target}
                accentColor={SUCCESS}
              />
              <DarkKpiCard
                label="Avg CPA"
                value="₹8.55"
                delta={{ value: -5.8, label: "vs last month" }}
                icon={MousePointer}
                accentColor="#8B5CF6"
              />
              <DarkKpiCard
                label="ROAS"
                value="5.88x"
                delta={{ value: 11.2, label: "vs last month" }}
                icon={TrendingUp}
                accentColor={GOLD}
              />
              <DarkKpiCard
                label="Total Followers"
                value="180K"
                delta={{ value: 12.4, label: "vs last month" }}
                icon={Users}
                accentColor="#06B6D4"
              />
              <DarkKpiCard
                label="Page Views"
                value="12K"
                delta={{ value: -3.2, label: "vs last month" }}
                icon={Eye}
                accentColor={WARNING}
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Trend */}
            <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#F0F6FC]">Traffic Trend</h3>
                <div className="flex items-center gap-3 text-[11px] text-[#6E7681]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F5A623]" />Paid</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#22C55E]" />Organic</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={MOCK_TRAFFIC_DATA}>
                  <defs>
                    <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5A623" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="organicGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "#6E7681", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6E7681", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="paid" stroke="#F5A623" strokeWidth={2} fill="url(#paidGrad)" name="Paid" />
                  <Area type="monotone" dataKey="organic" stroke="#22C55E" strokeWidth={2} fill="url(#organicGrad)" name="Organic" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Funnel Breakdown */}
            <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#F0F6FC]">Funnel Breakdown</h3>
                <p className="text-[11px] text-[#6E7681]">Impressions → Signups</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelChartData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6E7681", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCount} />
                  <YAxis type="category" dataKey="stage" tick={{ fill: "#8B949E", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Count">
                    {funnelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 2: CAMPAIGNS
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="campaigns" className="mt-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E7681]" />
              <Input
                placeholder="Search campaigns..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="border-white/10 bg-white/5 pl-9 text-sm text-gray-200 placeholder:text-[#6E7681] focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
              />
            </div>
            <Select value={campaignStatusFilter} onValueChange={setCampaignStatusFilter}>
              <SelectTrigger className="w-[160px] border-white/10 bg-white/5 text-sm text-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1C2333]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setEditingCampaign(null);
                setCampaignForm({ name: "", type: "brand_awareness", platform: "instagram", status: "draft", budget: 0, startDate: "", endDate: "" });
                setCampaignDialogOpen(true);
              }}
              className="bg-[#F5A623] text-[#0D1117] hover:bg-[#E09510] font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Campaign
            </Button>
          </div>

          {/* Campaigns Table */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161B22] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Campaign</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Platform</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Budget</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Spent</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Impressions</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Clicks</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Conv.</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">ROAS</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-sm text-[#6E7681]">
                        No campaigns found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((c) => (
                      <TableRow key={c.id} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CampaignTypeIcon type={c.type} />
                            <div>
                              <p className="text-sm font-medium text-[#F0F6FC]">{c.name}</p>
                              <p className="text-[10px] text-[#6E7681]">{CAMPAIGN_TYPE_LABELS[c.type] || c.type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlatformBadge platform={c.platform} />
                        </TableCell>
                        <TableCell>
                          <CampaignStatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{fmtINR(c.budget)}</TableCell>
                        <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{fmtINR(c.spent)}</TableCell>
                        <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(c.impressions)}</TableCell>
                        <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(c.clicks)}</TableCell>
                        <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(c.conversions)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-sm font-semibold tabular-nums", c.roas >= 5 ? "text-emerald-400" : c.roas >= 3 ? "text-[#F5A623]" : c.roas > 0 ? "text-red-400" : "text-[#6E7681]")}>
                            {c.roas > 0 ? c.roas.toFixed(1) + "x" : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#6E7681] hover:text-[#F5A623] hover:bg-[#F5A623]/10"
                              onClick={() => handleEditCampaign(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#6E7681] hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => handleDeleteCampaign(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Campaign Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DarkKpiCard
              label="Total Budget"
              value={fmtINR(campaigns.reduce((s, c) => s + c.budget, 0))}
              icon={DollarSign}
              accentColor={GOLD}
            />
            <DarkKpiCard
              label="Total Spent"
              value={fmtINR(campaigns.reduce((s, c) => s + c.spent, 0))}
              icon={DollarSign}
              accentColor={WARNING}
            />
            <DarkKpiCard
              label="Active Campaigns"
              value={campaigns.filter((c) => c.status === "active").length.toString()}
              icon={Megaphone}
              accentColor={SUCCESS}
            />
            <DarkKpiCard
              label="Avg ROAS"
              value={(campaigns.filter((c) => c.roas > 0).reduce((s, c) => s + c.roas, 0) / Math.max(campaigns.filter((c) => c.roas > 0).length, 1)).toFixed(1) + "x"}
              icon={TrendingUp}
              accentColor={GOLD}
            />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 3: SOCIAL ACCOUNTS
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="social" className="mt-0 space-y-6">
          {/* Social Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-xl border border-[#F5A623]/15 bg-gradient-to-br from-[#F5A623]/8 via-[#C9952A]/4 to-transparent p-5">
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-[#F5A623]/5 blur-2xl" />
              <div className="relative">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#C9952A]">Total Followers</p>
                <p className="mt-1 text-3xl font-bold text-[#F5A623] tabular-nums">{formatCount(socialStats.totalFollowers)}</p>
                <p className="mt-1 text-[11px] text-[#8B949E]">Across all connected accounts</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">Avg Engagement</p>
              <p className="mt-1 text-3xl font-bold text-[#22C55E] tabular-nums">{socialStats.avgEngagement.toFixed(1)}%</p>
              <p className="mt-1 text-[11px] text-[#8B949E]">Average across platforms</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">Connected Accounts</p>
              <p className="mt-1 text-3xl font-bold text-[#F0F6FC] tabular-nums">{socialStats.totalAccounts}<span className="text-lg text-[#6E7681]">/{socialAccounts.length}</span></p>
              <p className="mt-1 text-[11px] text-[#8B949E]">Platforms connected</p>
            </div>
          </div>

          {/* Social Account Cards */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">Connected Platforms</h3>
              <Button
                onClick={() => {
                  setSocialForm({ platform: "tiktok", handle: "" });
                  setSocialDialogOpen(true);
                }}
                className="bg-[#F5A623] text-[#0D1117] hover:bg-[#E09510] font-semibold"
                size="sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialAccounts.map((account) => {
                const brandColor = PLATFORM_COLORS[account.platform];
                const gradient = PLATFORM_GRADIENTS[account.platform];
                return (
                  <div
                    key={account.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border transition-all duration-200",
                      account.connected
                        ? "border-white/[0.06] bg-[#161B22] hover:border-white/[0.12]"
                        : "border-dashed border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                    )}
                  >
                    {/* Brand accent bar */}
                    <div className={cn("h-1 w-full", account.connected ? `bg-gradient-to-r ${gradient}` : "bg-white/5")} />

                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                            style={{ backgroundColor: account.connected ? brandColor + "20" : "rgba(255,255,255,0.05)" }}
                          >
                            <PlatformIcon
                              platform={account.platform}
                              className="h-5 w-5"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#F0F6FC]">
                              {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                            </p>
                            {account.connected ? (
                              <p className="text-xs text-[#8B949E]">{account.handle}</p>
                            ) : (
                              <p className="text-xs text-[#6E7681]">Not connected</p>
                            )}
                          </div>
                        </div>
                        {account.connected && (
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400">
                            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                          </span>
                        )}
                      </div>

                      {account.connected ? (
                        <>
                          {/* Metrics */}
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-[#6E7681]">Followers</p>
                              <p className="mt-0.5 text-sm font-bold text-[#F0F6FC] tabular-nums">{formatCount(account.followers)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-[#6E7681]">Following</p>
                              <p className="mt-0.5 text-sm font-bold text-[#F0F6FC] tabular-nums">{formatCount(account.following)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-[#6E7681]">Posts</p>
                              <p className="mt-0.5 text-sm font-bold text-[#F0F6FC] tabular-nums">{formatCount(account.posts)}</p>
                            </div>
                          </div>

                          {/* Engagement + Last Sync */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Heart className="h-3 w-3 text-[#F5A623]" />
                              <span className="text-xs font-semibold text-[#F5A623]">{account.engagementRate}%</span>
                              <span className="text-[10px] text-[#6E7681]">engagement</span>
                            </div>
                            <span className="text-[10px] text-[#6E7681]">
                              Synced {timeAgo(account.lastSynced)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                              onClick={() => toast.info("Opening " + account.platform + " profile...")}
                            >
                              <ExternalLink className="mr-1.5 h-3 w-3" />
                              View Profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
                              onClick={() => handleDisconnectAccount(account.id)}
                            >
                              <Unplug className="mr-1 h-3 w-3" />
                              Disconnect
                            </Button>
                          </div>
                        </>
                      ) : (
                        /* Not connected state */
                        <div className="mt-4">
                          <p className="mb-3 text-xs text-[#6E7681]">
                            Connect your {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} account to track performance
                          </p>
                          <Button
                            size="sm"
                            className="w-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                            onClick={() => {
                              setSocialForm({ platform: account.platform, handle: "" });
                              setSocialDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Connect Account
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 4: ANALYTICS
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="mt-0 space-y-6">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#6E7681]" />
            <span className="text-xs text-[#6E7681]">Period:</span>
            <div className="flex items-center gap-1">
              {["7", "30", "90", "custom"].map((range) => (
                <Button
                  key={range}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs",
                    analyticsDateRange === range
                      ? "bg-[#F5A623]/15 text-[#F5A623]"
                      : "text-[#6E7681] hover:text-gray-300 hover:bg-white/5"
                  )}
                  onClick={() => setAnalyticsDateRange(range)}
                >
                  {range === "custom" ? "Custom" : `Last ${range} days`}
                </Button>
              ))}
            </div>
          </div>

          {/* Channel Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#F0F6FC]">Channel Performance</h3>
                <p className="text-[11px] text-[#6E7681]">Reach by platform</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={MOCK_CHANNEL_PERF} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="platform" tick={{ fill: "#8B949E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6E7681", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCount} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="reach" fill="#F5A623" radius={[4, 4, 0, 0]} name="Reach" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Audience Demographics */}
            <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#F0F6FC]">Audience Demographics</h3>
                <p className="text-[11px] text-[#6E7681]">Age distribution</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={MOCK_DEMOGRAPHICS}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {MOCK_DEMOGRAPHICS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value: string) => <span style={{ color: "#8B949E" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Content Performance Table */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161B22] overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="text-sm font-semibold text-[#F0F6FC]">Top Performing Content</h3>
              <p className="text-[11px] text-[#6E7681]">Best performing posts across platforms</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Post</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Platform</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Reach</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Likes</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Comments</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Shares</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_TOP_POSTS.map((post) => (
                    <TableRow key={post.id} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <TableCell className="text-sm font-medium text-[#F0F6FC]">{post.title}</TableCell>
                      <TableCell>
                        <PlatformBadge platform={post.platform} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(post.reach)}</TableCell>
                      <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(post.likes)}</TableCell>
                      <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(post.comments)}</TableCell>
                      <TableCell className="text-right text-sm text-[#8B949E] tabular-nums">{formatCount(post.shares)}</TableCell>
                      <TableCell className="text-xs text-[#6E7681]">{new Date(post.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161B22] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#F0F6FC]">Conversion Funnel</h3>
              <p className="text-[11px] text-[#6E7681]">From reach to conversion</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_CHANNEL_PERF} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="platform" tick={{ fill: "#8B949E", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6E7681", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="conversions" fill="#22C55E" radius={[4, 4, 0, 0]} name="Conversions" />
                <Bar dataKey="engagement" fill="#F5A623" radius={[4, 4, 0, 0]} name="Engagement %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 5: REPORTS
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="reports" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Campaign ROI Report */}
            <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#161B22] p-5 transition-all hover:border-[#F5A623]/20">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#F5A623]/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5A623]/10">
                  <DollarSign className="h-5 w-5 text-[#F5A623]" />
                </div>
                <h4 className="text-sm font-semibold text-[#F0F6FC]">Campaign ROI Report</h4>
                <p className="mt-1 text-xs text-[#6E7681]">
                  Detailed breakdown of campaign return on investment, cost per acquisition, and revenue attribution
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                    onClick={() => toast.success("CSV export started")}
                  >
                    <Download className="mr-1.5 h-3 w-3" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                    onClick={() => toast.info("PDF export coming soon")}
                  >
                    <FileText className="mr-1.5 h-3 w-3" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Social Media Growth Report */}
            <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#161B22] p-5 transition-all hover:border-[#22C55E]/20">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#22C55E]/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E]/10">
                  <TrendingUp className="h-5 w-5 text-[#22C55E]" />
                </div>
                <h4 className="text-sm font-semibold text-[#F0F6FC]">Social Media Growth</h4>
                <p className="mt-1 text-xs text-[#6E7681]">
                  Follower growth trends, engagement rates, and audience demographics across all connected platforms
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                    onClick={() => toast.success("CSV export started")}
                  >
                    <Download className="mr-1.5 h-3 w-3" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                    onClick={() => toast.info("PDF export coming soon")}
                  >
                    <FileText className="mr-1.5 h-3 w-3" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Lead Attribution Report */}
            <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#161B22] p-5 transition-all hover:border-[#06B6D4]/20">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#06B6D4]/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#06B6D4]/10">
                  <Target className="h-5 w-5 text-[#06B6D4]" />
                </div>
                <h4 className="text-sm font-semibold text-[#F0F6FC]">Lead Attribution</h4>
                <p className="mt-1 text-xs text-[#6E7681]">
                  Source-level lead tracking, first-touch and last-touch attribution models, and conversion path analysis
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                    onClick={() => toast.success("CSV export started")}
                  >
                    <Download className="mr-1.5 h-3 w-3" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-xs"
                    onClick={() => toast.info("PDF export coming soon")}
                  >
                    <FileText className="mr-1.5 h-3 w-3" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports Table */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161B22] overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="text-sm font-semibold text-[#F0F6FC]">Generated Reports</h3>
              <p className="text-[11px] text-[#6E7681]">Recently generated and scheduled reports</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Report</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Type</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Period</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681]">Generated</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#6E7681] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Q4 2024 Campaign ROI", type: "Campaign ROI", period: "Oct — Dec 2024", status: "ready", date: "2025-01-15" },
                    { name: "December Social Growth", type: "Social Growth", period: "Dec 2024", status: "ready", date: "2025-01-10" },
                    { name: "January Lead Attribution", type: "Lead Attribution", period: "Jan 2025", status: "processing", date: "—" },
                    { name: "Annual Marketing Review 2024", type: "Campaign ROI", period: "Jan — Dec 2024", status: "ready", date: "2025-01-01" },
                    { name: "Q1 2025 Social Forecast", type: "Social Growth", period: "Jan — Mar 2025", status: "scheduled", date: "—" },
                  ].map((report, i) => (
                    <TableRow key={i} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <TableCell className="text-sm font-medium text-[#F0F6FC]">{report.name}</TableCell>
                      <TableCell className="text-xs text-[#8B949E]">{report.type}</TableCell>
                      <TableCell className="text-xs text-[#8B949E]">{report.period}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium border",
                            report.status === "ready" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                            report.status === "processing" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                            report.status === "scheduled" && "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          )}
                        >
                          {report.status === "processing" && <RefreshCw className="mr-1 h-2.5 w-2.5 animate-spin" />}
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#6E7681]">{report.date !== "—" ? new Date(report.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {report.status === "ready" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#6E7681] hover:text-[#F5A623] hover:bg-[#F5A623]/10"
                                onClick={() => toast.success("Downloading " + report.name)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#6E7681] hover:text-blue-400 hover:bg-blue-500/10"
                                onClick={() => toast.info("Opening " + report.name)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════
          DIALOGS
          ═══════════════════════════════════════════════════════ */}

      {/* Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="border-white/10 bg-[#161B22] text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F6FC]">
              {editingCampaign ? "Edit Campaign" : "New Campaign"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs text-[#8B949E]">Campaign Name</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="e.g., Summer Paradise 2025"
                className="border-white/10 bg-white/5 text-sm text-gray-200 placeholder:text-[#6E7681] focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs text-[#8B949E]">Type</Label>
                <Select value={campaignForm.type} onValueChange={(v) => setCampaignForm({ ...campaignForm, type: v })}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-sm text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1C2333]">
                    <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                    <SelectItem value="lead_gen">Lead Generation</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="search">Search Ads</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="retargeting">Retargeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-[#8B949E]">Platform</Label>
                <Select value={campaignForm.platform} onValueChange={(v) => setCampaignForm({ ...campaignForm, platform: v })}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-sm text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1C2333]">
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs text-[#8B949E]">Status</Label>
                <Select value={campaignForm.status} onValueChange={(v: any) => setCampaignForm({ ...campaignForm, status: v })}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-sm text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1C2333]">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-[#8B949E]">Budget (₹)</Label>
                <Input
                  type="number"
                  value={campaignForm.budget || ""}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: Number(e.target.value) })}
                  placeholder="50000"
                  className="border-white/10 bg-white/5 text-sm text-gray-200 placeholder:text-[#6E7681] focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs text-[#8B949E]">Start Date</Label>
                <Input
                  type="date"
                  value={campaignForm.startDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                  className="border-white/10 bg-white/5 text-sm text-gray-200 focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-[#8B949E]">End Date</Label>
                <Input
                  type="date"
                  value={campaignForm.endDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                  className="border-white/10 bg-white/5 text-sm text-gray-200 focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCampaignDialogOpen(false)}
              className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCampaign}
              className="bg-[#F5A623] text-[#0D1117] hover:bg-[#E09510] font-semibold"
            >
              {editingCampaign ? "Update Campaign" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social Account Dialog */}
      <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
        <DialogContent className="border-white/10 bg-[#161B22] text-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F6FC]">Connect Social Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs text-[#8B949E]">Platform</Label>
              <Select value={socialForm.platform} onValueChange={(v) => setSocialForm({ ...socialForm, platform: v })}>
                <SelectTrigger className="border-white/10 bg-white/5 text-sm text-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1C2333]">
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="pinterest">Pinterest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-[#8B949E]">Handle / Username</Label>
              <Input
                value={socialForm.handle}
                onChange={(e) => setSocialForm({ ...socialForm, handle: e.target.value })}
                placeholder="@your-handle"
                className="border-white/10 bg-white/5 text-sm text-gray-200 placeholder:text-[#6E7681] focus:border-[#F5A623]/40 focus:ring-[#F5A623]/20"
              />
            </div>
            {/* Platform Preview */}
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: (PLATFORM_COLORS[socialForm.platform] || "#6B7280") + "20" }}
              >
                <PlatformIcon platform={socialForm.platform} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#F0F6FC]">{socialForm.platform.charAt(0).toUpperCase() + socialForm.platform.slice(1)}</p>
                <p className="text-[10px] text-[#6E7681]">{socialForm.handle || "Enter your handle above"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSocialDialogOpen(false)}
              className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectAccount}
              className="bg-[#F5A623] text-[#0D1117] hover:bg-[#E09510] font-semibold"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
