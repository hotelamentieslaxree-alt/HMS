// ARIA HMS — Settings Module (7 tabs: General, Modules, Roles & Permissions, Users, Billing, API Keys, Security)
"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Building2, ToggleLeft, Shield, Users, CreditCard,
  Key, Lock, Save, Plus, Star, Globe, Clock, IndianRupee,
  Eye, EyeOff, Copy, Trash2, CheckCircle2, AlertTriangle,
  Smartphone, Monitor, Search, ChevronRight, RefreshCw,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MODULES_LIST = [
  { id: "reservations", name: "Reservations", enabled: true, icon: "📅" },
  { id: "rooms", name: "Room Management", enabled: true, icon: "🏨" },
  { id: "housekeeping", name: "Housekeeping", enabled: true, icon: "🧹" },
  { id: "guests", name: "Guest Management", enabled: true, icon: "👤" },
  { id: "pos", name: "F&B / POS", enabled: true, icon: "🍽️" },
  { id: "folios", name: "Folios & Billing", enabled: true, icon: "💰" },
  { id: "maintenance", name: "Maintenance", enabled: true, icon: "🔧" },
  { id: "inventory", name: "Inventory", enabled: true, icon: "📦" },
  { id: "reports", name: "Reports", enabled: true, icon: "📊" },
  { id: "staff", name: "Staff Management", enabled: true, icon: "👥" },
  { id: "crm", name: "CRM", enabled: false, icon: "🤝" },
  { id: "marketing", name: "Marketing", enabled: false, icon: "📢" },
  { id: "purchasing", name: "Purchasing", enabled: true, icon: "🛒" },
  { id: "automation", name: "Automation", enabled: false, icon: "⚡" },
  { id: "integrations", name: "Integrations", enabled: false, icon: "🔌" },
  { id: "finance", name: "Finance & Accounting", enabled: false, icon: "📈" },
  { id: "sales", name: "Sales", enabled: false, icon: "💼" },
  { id: "kitchen", name: "Kitchen Display", enabled: false, icon: "🍳" },
];

const INITIAL_ROLES = [
  { id: "R-01", name: "Owner", level: 1, users: 1, permissions: 48, color: "#1B3A6B" },
  { id: "R-02", name: "General Manager", level: 2, users: 1, permissions: 42, color: "#1B3A6B" },
  { id: "R-03", name: "Front Office Mgr", level: 3, users: 1, permissions: 32, color: "#C9952A" },
  { id: "R-04", name: "Receptionist", level: 4, users: 2, permissions: 18, color: "#16A34A" },
  { id: "R-05", name: "Housekeeping Mgr", level: 3, users: 1, permissions: 22, color: "#C9952A" },
  { id: "R-06", name: "F&B Manager", level: 3, users: 1, permissions: 24, color: "#0369A1" },
  { id: "R-07", name: "Finance Mgr", level: 3, users: 1, permissions: 28, color: "#0369A1" },
  { id: "R-08", name: "HR Manager", level: 3, users: 1, permissions: 26, color: "#BE185D" },
];

const INITIAL_USERS = [
  { id: "U-01", name: "Vikram Malhotra", email: "vikram@hotel.com", role: "owner", status: "active", lastLogin: "2025-01-15T09:00:00" },
  { id: "U-02", name: "Priya Sharma", email: "priya@hotel.com", role: "gm", status: "active", lastLogin: "2025-01-15T08:45:00" },
  { id: "U-03", name: "Ravi Kumar", email: "ravi@hotel.com", role: "fom", status: "active", lastLogin: "2025-01-15T07:30:00" },
  { id: "U-04", name: "Anita Desai", email: "anita@hotel.com", role: "receptionist", status: "active", lastLogin: "2025-01-15T07:00:00" },
  { id: "U-05", name: "Suresh Menon", email: "suresh@hotel.com", role: "fb_mgr", status: "active", lastLogin: "2025-01-14T22:00:00" },
  { id: "U-06", name: "Lakshmi Devi", email: "lakshmi@hotel.com", role: "hk_mgr", status: "on_leave", lastLogin: "2025-01-10T18:00:00" },
  { id: "U-07", name: "Raj Malhotra", email: "raj@hotel.com", role: "eng_mgr", status: "active", lastLogin: "2025-01-15T08:00:00" },
  { id: "U-08", name: "Karan Rao", email: "karan@hotel.com", role: "sales_mgr", status: "active", lastLogin: "2025-01-15T09:30:00" },
];

const INITIAL_API_KEYS = [
  { id: "AK-01", name: "Production API Key", key: "aria_prod_sk_****************************a3f7", created: "2024-11-01", lastUsed: "2025-01-15", status: "active" },
  { id: "AK-02", name: "Staging API Key", key: "aria_stg_sk_****************************b8e2", created: "2024-12-15", lastUsed: "2025-01-14", status: "active" },
  { id: "AK-03", name: "Old Integration Key", key: "aria_old_sk_****************************c1d9", created: "2024-06-01", lastUsed: "2024-12-01", status: "revoked" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const USER_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  on_leave: { label: "On Leave", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  inactive: { label: "Inactive", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  locked: { label: "Locked", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function SettingsModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [activeTab, setActiveTab] = useState("general");
  const [showKey, setShowKey] = useState<string | null>(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [apiKeys, setApiKeys] = useState(INITIAL_API_KEYS);
  const [loading, setLoading] = useState<string | null>(null);

  // Property form state
  const [propName, setPropName] = useState("ARIA Grand Hotel & Spa");
  const [propCode, setPropCode] = useState("ARIAGRAND");
  const [propTimezone, setPropTimezone] = useState("IST");
  const [propCurrency, setPropCurrency] = useState("INR");
  const [propAddress, setPropAddress] = useState("123 Marine Drive, Mumbai 400020");
  const [propPhone, setPropPhone] = useState("+91 22 1234 5678");

  // Dialog states
  const [showAddRole, setShowAddRole] = useState(false);
  const [showViewPermissions, setShowViewPermissions] = useState<typeof roles[0] | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<typeof users[0] | null>(null);
  const [showUpgradePlan, setShowUpgradePlan] = useState(false);
  const [showGenerateKey, setShowGenerateKey] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

  // Role form state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLevel, setNewRoleLevel] = useState("4");

  // User form state
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("receptionist");

  // API key form state
  const [newKeyName, setNewKeyName] = useState("");

  const activeUsers = users.filter((u) => u.status === "active").length;
  const enabledModules = MODULES_LIST.filter((m) => m.enabled).length;

  // ─── Handlers ────────────────────────────────────────────────────

  const handleSaveChanges = useCallback(async () => {
    setLoading("save");
    try {
      const res = await fetch("/api/settings/property", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: propName,
          code: propCode,
          timezone: propTimezone,
          currency: propCurrency,
          address: propAddress,
          phone: propPhone,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Property settings saved");
        triggerRefresh();
      } else {
        toast.error(json.errors?.[0]?.message || "Failed to save settings");
      }
    } catch {
      toast.error("Network error saving settings");
    } finally {
      setLoading(null);
    }
  }, [propName, propCode, propTimezone, propCurrency, propAddress, propPhone, triggerRefresh]);

  const handleAddRole = useCallback(async () => {
    if (!newRoleName.trim()) { toast.error("Role name is required"); return; }
    setLoading("add-role");
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, level: parseInt(newRoleLevel) }),
      });
      const json = await res.json();
      if (json.success) {
        const colors = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#7C3AED", "#BE185D"];
        const newRole = {
          id: `R-${String(roles.length + 1).padStart(2, "0")}`,
          name: newRoleName,
          level: parseInt(newRoleLevel),
          users: 0,
          permissions: 0,
          color: colors[roles.length % colors.length],
        };
        setRoles((prev) => [...prev, newRole]);
        toast.success(`Role "${newRoleName}" created`);
        setShowAddRole(false);
        setNewRoleName(""); setNewRoleLevel("4");
        triggerRefresh();
      } else {
        toast.error(json.errors?.[0]?.message || "Failed to add role");
      }
    } catch {
      toast.error("Network error adding role");
    } finally {
      setLoading(null);
    }
  }, [newRoleName, newRoleLevel, roles.length, triggerRefresh]);

  const handleAddUser = useCallback(async () => {
    if (!newUserFirstName.trim() || !newUserEmail.trim()) { toast.error("First name and email are required"); return; }
    setLoading("add-user");
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: newUserFirstName, lastName: newUserLastName, email: newUserEmail, role: newUserRole }),
      });
      const json = await res.json();
      if (json.success) {
        const newUser = {
          id: `U-${String(users.length + 1).padStart(2, "0")}`,
          name: `${newUserFirstName} ${newUserLastName}`.trim(),
          email: newUserEmail,
          role: newUserRole,
          status: "active" as const,
          lastLogin: new Date().toISOString(),
        };
        setUsers((prev) => [...prev, newUser]);
        toast.success(`User "${newUserFirstName}" created`);
        setShowAddUser(false);
        setNewUserFirstName(""); setNewUserLastName(""); setNewUserEmail(""); setUserRole("receptionist");
        triggerRefresh();
      } else {
        toast.error(json.errors?.[0]?.message || "Failed to add user");
      }
    } catch {
      toast.error("Network error adding user");
    } finally {
      setLoading(null);
    }
  }, [newUserFirstName, newUserLastName, newUserEmail, newUserRole, users.length, triggerRefresh]);

  const handleToggleLock = useCallback(async (user: typeof users[0]) => {
    const isLocked = user.status === "locked";
    const newStatus = isLocked ? "active" : "locked";
    setLoading(`lock-${user.id}`);
    try {
      const res = await fetch(`/api/settings/users/${user.id}/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !isLocked }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
        toast.success(`User ${isLocked ? "unlocked" : "locked"}`);
        triggerRefresh();
      } else {
        toast.error(json.errors?.[0]?.message || "Failed to update user");
      }
    } catch {
      toast.error("Network error updating user");
    } finally {
      setLoading(null);
    }
  }, [triggerRefresh]);

  const handleGenerateKey = useCallback(async () => {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return; }
    setLoading("gen-key");
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const json = await res.json();
      if (json.success) {
        const generatedKey = json.data?.key || `aria_sk_${Math.random().toString(36).slice(2, 18)}`;
        const newKey = {
          id: `AK-${String(apiKeys.length + 1).padStart(2, "0")}`,
          name: newKeyName,
          key: `${generatedKey.slice(0, 8)}****************************${generatedKey.slice(-4)}`,
          created: new Date().toISOString().split("T")[0],
          lastUsed: "-",
          status: "active" as const,
        };
        setApiKeys((prev) => [...prev, newKey]);
        toast.success(`API key "${newKeyName}" generated`);
        setShowGenerateKey(false);
        setNewKeyName("");
        triggerRefresh();
      } else {
        toast.error(json.errors?.[0]?.message || "Failed to generate key");
      }
    } catch {
      toast.error("Network error generating key");
    } finally {
      setLoading(null);
    }
  }, [newKeyName, apiKeys.length, triggerRefresh]);

  const handleCopyKey = useCallback(async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const handleRevokeKey = useCallback(async () => {
    if (!revokeKeyId) return;
    setLoading(`revoke-${revokeKeyId}`);
    try {
      const res = await fetch(`/api/settings/api-keys/${revokeKeyId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setApiKeys((prev) => prev.map((ak) => ak.id === revokeKeyId ? { ...ak, status: "revoked" as const } : ak));
        toast.success("API key revoked");
        triggerRefresh();
      } else {
        toast.error(json.errors?.[0]?.message || "Failed to revoke key");
      }
    } catch {
      toast.error("Network error revoking key");
    } finally {
      setLoading(null);
      setRevokeKeyId(null);
    }
  }, [revokeKeyId, triggerRefresh]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-navy" /> Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Property configuration, users, roles & system preferences</p>
        </div>
        <Button className="bg-navy hover:bg-navy-light text-white h-9" disabled={loading === "save"} onClick={handleSaveChanges}>
          {loading === "save" ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save Changes
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active Users" value={activeUsers} icon={Users} accent="navy" />
        <KpiCard label="Total Roles" value={roles.length} icon={Shield} accent="info" />
        <KpiCard label="Enabled Modules" value={enabledModules} icon={ToggleLeft} accent="success" />
        <KpiCard label="API Keys" value={apiKeys.filter((k) => k.status === "active").length} icon={Key} accent="gold" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
          <TabsTrigger value="modules" className="text-xs">Modules</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
          <TabsTrigger value="api-keys" className="text-xs">API Keys</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
        </TabsList>

        {/* ── General Tab ── */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-navy" /> Property Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Property Name</Label>
                  <Input value={propName} onChange={(e) => setPropName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Property Code</Label>
                  <Input value={propCode} onChange={(e) => setPropCode(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Timezone</Label>
                  <Select value={propTimezone} onValueChange={setPropTimezone}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IST">IST (UTC+5:30)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST (UTC-5:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Currency</Label>
                  <Select value={propCurrency} onValueChange={setPropCurrency}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Star Rating</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-5 w-5 cursor-pointer", s <= 4 ? "fill-[#C9952A] text-[#C9952A]" : "text-muted-foreground")} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Business Date</Label>
                  <Select defaultValue="current">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Date</SelectItem>
                      <SelectItem value="previous">Previous Date (Night Audit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Address</Label>
                  <Input value={propAddress} onChange={(e) => setPropAddress(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input value={propPhone} onChange={(e) => setPropPhone(e.target.value)} className="h-9" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Modules Tab ── */}
        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ToggleLeft className="h-4 w-4 text-navy" /> Module Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MODULES_LIST.map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{mod.icon}</span>
                      <span className="text-xs font-medium">{mod.name}</span>
                    </div>
                    <Switch checked={mod.enabled} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Roles & Permissions Tab ── */}
        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-navy" /> Roles & Permissions
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setShowAddRole(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Role</TableHead>
                    <TableHead className="text-[11px]">Level</TableHead>
                    <TableHead className="text-[11px] text-right">Users</TableHead>
                    <TableHead className="text-[11px] text-right">Permissions</TableHead>
                    <TableHead className="text-[11px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: role.color }}>
                            {role.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">Level {role.level}</Badge></TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{role.users}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{role.permissions}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowViewPermissions(role)}>
                          <Eye className="h-3 w-3 mr-1" />View Permissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-navy" /> User Management
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setShowAddUser(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Name</TableHead>
                    <TableHead className="text-[11px]">Email</TableHead>
                    <TableHead className="text-[11px]">Role</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Last Login</TableHead>
                    <TableHead className="text-[11px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const st = USER_STATUS_META[user.status] ?? USER_STATUS_META.active;
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">{user.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px] capitalize">{user.role.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(user.lastLogin)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowEditUser(user)}>
                              <SettingsIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              disabled={loading === `lock-${user.id}`}
                              onClick={() => handleToggleLock(user)}
                            >
                              {loading === `lock-${user.id}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing Tab ── */}
        <TabsContent value="billing" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-navy" /> Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-navy p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold font-display text-navy">Enterprise Plan</span>
                    <Badge className="bg-[#DCFCE7] text-[#14532D] border-[#16A34A] hover:bg-[#DCFCE7]">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Full HMS suite with all modules</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] text-muted-foreground">Monthly Fee</p><p className="text-sm font-bold">{fmtINR(25000)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Next Billing</p><p className="text-sm font-bold">{fmtDate("2025-02-01")}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Users Included</p><p className="text-sm font-bold">Unlimited</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Properties</p><p className="text-sm font-bold">5 included</p></div>
                  </div>
                </div>
                <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setShowUpgradePlan(true)}>Upgrade Plan</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#16A34A]" /> Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="h-8 w-12 rounded bg-[#1B3A6B] flex items-center justify-center text-white text-[10px] font-bold">VISA</div>
                  <div>
                    <p className="text-xs font-medium">•••• •••• •••• 4242</p>
                    <p className="text-[10px] text-muted-foreground">Expires 12/2026</p>
                  </div>
                  <Badge className="ml-auto bg-[#DCFCE7] text-[#14532D] border-[#16A34A] hover:bg-[#DCFCE7] text-[9px]">Primary</Badge>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium">Recent Invoices</p>
                  {[
                    { date: "2025-01-01", amount: 25000, status: "paid" },
                    { date: "2024-12-01", amount: 25000, status: "paid" },
                    { date: "2024-11-01", amount: 22000, status: "paid" },
                  ].map((inv, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                      <span className="text-xs">{fmtDate(inv.date)}</span>
                      <span className="text-xs font-medium">{fmtINR(inv.amount)}</span>
                      <Badge variant="outline" className="text-[9px] text-[#16A34A]">Paid</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── API Keys Tab ── */}
        <TabsContent value="api-keys" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4 text-navy" /> API Key Management
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setShowGenerateKey(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Generate Key
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {apiKeys.map((ak) => (
                <div key={ak.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold">{ak.name}</p>
                      <Badge variant={ak.status === "active" ? "default" : "secondary"} className="text-[9px] capitalize">{ak.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {showKey === ak.id ? "aria_sk_full_1a2b3c4d5e6f7g8h9i0j" : ak.key}
                      </code>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowKey(showKey === ak.id ? null : ak.id)}>
                        {showKey === ak.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleCopyKey(ak.key)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>Created: {fmtDate(ak.created)}</span>
                      <span>Last used: {fmtDate(ak.lastUsed)}</span>
                    </div>
                  </div>
                  {ak.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-[#DC2626] hover:text-[#DC2626]"
                      onClick={() => setRevokeKeyId(ak.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />Revoke
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="security" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-navy" /> Two-Factor Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-[#16A34A]" />
                    <div>
                      <p className="text-xs font-medium">SMS Authentication</p>
                      <p className="text-[10px] text-muted-foreground">Verify login with OTP on phone</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-[#0369A1]" />
                    <div>
                      <p className="text-xs font-medium">Authenticator App</p>
                      <p className="text-[10px] text-muted-foreground">TOTP via Google Authenticator</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-navy" /> Session & Audit Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-xs font-medium">Session Timeout</p>
                    <p className="text-[10px] text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-xs font-medium">Audit Logging</p>
                    <p className="text-[10px] text-muted-foreground">Track all system actions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-xs font-medium">Login Notifications</p>
                    <p className="text-[10px] text-muted-foreground">Email alert on new login</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-xs font-medium">IP Whitelisting</p>
                    <p className="text-[10px] text-muted-foreground">Restrict access by IP address</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Role Dialog ── */}
      <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>Create a new role with specific permission levels.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Role Name</Label>
              <Input placeholder="e.g. Night Manager" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Access Level</Label>
              <Select value={newRoleLevel} onValueChange={setNewRoleLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 — Owner</SelectItem>
                  <SelectItem value="2">Level 2 — General Manager</SelectItem>
                  <SelectItem value="3">Level 3 — Manager</SelectItem>
                  <SelectItem value="4">Level 4 — Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRole(false)}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" disabled={loading === "add-role"} onClick={handleAddRole}>
              {loading === "add-role" ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Permissions Dialog ── */}
      <Dialog open={!!showViewPermissions} onOpenChange={() => setShowViewPermissions(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showViewPermissions?.name} — Permissions</DialogTitle>
            <DialogDescription>Level {showViewPermissions?.level} · {showViewPermissions?.permissions} permissions granted</DialogDescription>
          </DialogHeader>
          {showViewPermissions && (
            <div className="space-y-3">
              {[
                { module: "Reservations", perms: ["create", "read", "update", "cancel", "check-in", "check-out"] },
                { module: "Rooms", perms: ["read", "update", "block"] },
                { module: "Guests", perms: ["create", "read", "update"] },
                { module: "Housekeeping", perms: ["create", "read", "update", "assign"] },
                { module: "F&B / POS", perms: ["create", "read", "update"] },
                { module: "Folios", perms: ["create", "read", "post-charges", "payments", "refund"] },
                { module: "Reports", perms: ["read", "export"] },
                { module: "Settings", perms: ["read"] },
              ].map((mod) => (
                <div key={mod.module} className="p-3 rounded-lg border border-border">
                  <p className="text-xs font-semibold mb-2">{mod.module}</p>
                  <div className="flex flex-wrap gap-1">
                    {mod.perms.map((p) => (
                      <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewPermissions(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add User Dialog ── */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account for the property.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">First Name</Label>
                <Input placeholder="First name" value={newUserFirstName} onChange={(e) => setNewUserFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Last Name</Label>
                <Input placeholder="Last name" value={newUserLastName} onChange={(e) => setNewUserLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="email@hotel.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="fom">Front Office Manager</SelectItem>
                  <SelectItem value="hk_mgr">Housekeeping Manager</SelectItem>
                  <SelectItem value="fb_mgr">F&B Manager</SelectItem>
                  <SelectItem value="fin_mgr">Finance Manager</SelectItem>
                  <SelectItem value="eng_mgr">Engineering Manager</SelectItem>
                  <SelectItem value="hr_mgr">HR Manager</SelectItem>
                  <SelectItem value="sales_mgr">Sales Manager</SelectItem>
                  <SelectItem value="mkt_mgr">Marketing Manager</SelectItem>
                  <SelectItem value="gm">General Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" disabled={loading === "add-user"} onClick={handleAddUser}>
              {loading === "add-user" ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={!!showEditUser} onOpenChange={() => setShowEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details for {showEditUser?.name}.</DialogDescription>
          </DialogHeader>
          {showEditUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">First Name</Label>
                  <Input defaultValue={showEditUser.name.split(" ")[0]} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Last Name</Label>
                  <Input defaultValue={showEditUser.name.split(" ").slice(1).join(" ")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input defaultValue={showEditUser.email} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Role</Label>
                <Select defaultValue={showEditUser.role}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="fom">Front Office Manager</SelectItem>
                    <SelectItem value="hk_mgr">Housekeeping Manager</SelectItem>
                    <SelectItem value="fb_mgr">F&B Manager</SelectItem>
                    <SelectItem value="fin_mgr">Finance Manager</SelectItem>
                    <SelectItem value="eng_mgr">Engineering Manager</SelectItem>
                    <SelectItem value="hr_mgr">HR Manager</SelectItem>
                    <SelectItem value="sales_mgr">Sales Manager</SelectItem>
                    <SelectItem value="gm">General Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(null)}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={() => { toast.success("User updated"); setShowEditUser(null); }}>
              <Save className="h-4 w-4 mr-1" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upgrade Plan Dialog ── */}
      <Dialog open={showUpgradePlan} onOpenChange={setShowUpgradePlan}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade Plan</DialogTitle>
            <DialogDescription>Choose a plan that fits your growing business needs.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Starter", price: 8000, features: ["5 Users", "1 Property", "Basic Modules", "Email Support"] },
              { name: "Professional", price: 15000, features: ["25 Users", "3 Properties", "All Modules", "Priority Support", "API Access"] },
              { name: "Enterprise", price: 25000, features: ["Unlimited Users", "5 Properties", "All Modules", "24/7 Support", "API Access", "Custom Integrations"], current: true },
            ].map((plan) => (
              <Card key={plan.name} className={cn("relative", plan.current && "border-2 border-navy")}>
                <CardContent className="p-4">
                  {plan.current && <Badge className="absolute -top-2 left-3 bg-navy text-white text-[9px]">Current</Badge>}
                  <p className="text-sm font-bold mb-1">{plan.name}</p>
                  <p className="text-lg font-bold font-display text-navy">₹{plan.price.toLocaleString("en-IN")}<span className="text-[10px] text-muted-foreground font-normal">/mo</span></p>
                  <Separator className="my-3" />
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-[#16A34A]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.current ? "outline" : "default"}
                    className={cn("w-full mt-3 h-7 text-[10px]", !plan.current && "bg-navy hover:bg-navy-light text-white")}
                    disabled={plan.current}
                  >
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradePlan(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Generate API Key Dialog ── */}
      <Dialog open={showGenerateKey} onOpenChange={setShowGenerateKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>Create a new API key for external integrations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Key Name</Label>
              <Input placeholder="e.g. Production API Key" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <div className="p-3 rounded-lg border border-[#D97706]/30 bg-[#FEF3C7]/50">
              <div className="flex items-center gap-2 text-[#78350F]">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-[10px] font-medium">API keys provide full access to the system. Keep them secure and never share them publicly.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateKey(false)}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" disabled={loading === "gen-key"} onClick={handleGenerateKey}>
              {loading === "gen-key" ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke API Key Confirmation ── */}
      <AlertDialog open={!!revokeKeyId} onOpenChange={(open) => { if (!open) setRevokeKeyId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone. Any integrations using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#DC2626] hover:bg-[#DC2626]/90 text-white" onClick={handleRevokeKey}>
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
