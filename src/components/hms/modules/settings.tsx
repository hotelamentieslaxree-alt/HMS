// ARIA HMS — Settings Module (7 tabs: General, Modules, Roles & Permissions, Users, Billing, API Keys, Security)
"use client";

import { useState } from "react";
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
import {
  Settings as SettingsIcon, Building2, ToggleLeft, Shield, Users, CreditCard,
  Key, Lock, Save, Plus, Star, Globe, Clock, IndianRupee,
  Eye, EyeOff, Copy, Trash2, CheckCircle2, AlertTriangle,
  Smartphone, Monitor, Search, ChevronRight,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MODULES_LIST = [
  { id: "reservations", name: "Reservations", enabled: true, icon: "📅" },
  { id: "rooms", name: "Room Management", enabled: true, icon: "🏨" },
  { id: "housekeeping", name: "Housekeeping", enabled: true, icon: "🧹" },
  { id: "guests", name: "Guest Management", enabled: true, icon: "👤" },
  { id: "pos", name: "F&B / POS", enabled: true, icon: "🍽️" },
  { id: "folios", name: "Folios & Billing", enabled: true, icon: "💰" },
  { id: "sales", name: "Sales", enabled: true, icon: "📈" },
  { id: "marketing", name: "Marketing", enabled: true, icon: "📣" },
  { id: "hr", name: "HR Hub", enabled: true, icon: "👥" },
  { id: "attendance", name: "Attendance", enabled: true, icon: "⏰" },
  { id: "finance", name: "Finance & Accounts", enabled: true, icon: "💵" },
  { id: "inventory", name: "Inventory", enabled: true, icon: "📦" },
  { id: "crm", name: "CRM", enabled: true, icon: "🤝" },
  { id: "maintenance", name: "Maintenance", enabled: true, icon: "🔧" },
  { id: "hospital", name: "Hospital", enabled: false, icon: "🏥" },
  { id: "kitchen", name: "Kitchen Display", enabled: false, icon: "👨‍🍳" },
  { id: "tasks", name: "Task Management", enabled: true, icon: "✅" },
  { id: "documents", name: "Documents", enabled: true, icon: "📄" },
  { id: "ai-center", name: "AI Center", enabled: true, icon: "🤖" },
  { id: "automation", name: "Automation", enabled: true, icon: "⚡" },
  { id: "integrations", name: "Integrations", enabled: true, icon: "🔌" },
  { id: "reports", name: "Reports", enabled: true, icon: "📊" },
  { id: "scorecard", name: "Scorecard", enabled: true, icon: "🎯" },
  { id: "night-audit", name: "Night Audit", enabled: true, icon: "🌙" },
];

const MOCK_ROLES = [
  { id: "R-01", name: "Owner / CEO", level: 1, users: 1, permissions: 48, color: "#7C3AED" },
  { id: "R-02", name: "General Manager", level: 2, users: 1, permissions: 42, color: "#1B3A6B" },
  { id: "R-03", name: "Front Office Mgr", level: 3, users: 2, permissions: 30, color: "#0369A1" },
  { id: "R-04", name: "Receptionist", level: 4, users: 4, permissions: 18, color: "#0F766E" },
  { id: "R-05", name: "Housekeeping Mgr", level: 3, users: 1, permissions: 22, color: "#0369A1" },
  { id: "R-06", name: "F&B Manager", level: 3, users: 1, permissions: 24, color: "#0369A1" },
  { id: "R-07", name: "Finance Mgr", level: 3, users: 1, permissions: 28, color: "#0369A1" },
  { id: "R-08", name: "HR Manager", level: 3, users: 1, permissions: 26, color: "#BE185D" },
];

const MOCK_USERS = [
  { id: "U-01", name: "Vikram Malhotra", email: "vikram@hotel.com", role: "owner", status: "active", lastLogin: "2025-01-15T09:00:00" },
  { id: "U-02", name: "Priya Sharma", email: "priya@hotel.com", role: "gm", status: "active", lastLogin: "2025-01-15T08:45:00" },
  { id: "U-03", name: "Ravi Kumar", email: "ravi@hotel.com", role: "fom", status: "active", lastLogin: "2025-01-15T07:30:00" },
  { id: "U-04", name: "Anita Desai", email: "anita@hotel.com", role: "receptionist", status: "active", lastLogin: "2025-01-15T07:00:00" },
  { id: "U-05", name: "Suresh Menon", email: "suresh@hotel.com", role: "fb_mgr", status: "active", lastLogin: "2025-01-14T22:00:00" },
  { id: "U-06", name: "Lakshmi Devi", email: "lakshmi@hotel.com", role: "hk_mgr", status: "on_leave", lastLogin: "2025-01-10T18:00:00" },
  { id: "U-07", name: "Raj Malhotra", email: "raj@hotel.com", role: "eng_mgr", status: "active", lastLogin: "2025-01-15T08:00:00" },
  { id: "U-08", name: "Karan Rao", email: "karan@hotel.com", role: "sales_mgr", status: "active", lastLogin: "2025-01-15T09:30:00" },
];

const MOCK_API_KEYS = [
  { id: "AK-01", name: "Production API Key", key: "aria_prod_sk_****************************a3f7", created: "2024-11-01", lastUsed: "2025-01-15", status: "active" },
  { id: "AK-02", name: "Staging API Key", key: "aria_stg_sk_****************************b8e2", created: "2024-12-15", lastUsed: "2025-01-14", status: "active" },
  { id: "AK-03", name: "Old Integration Key", key: "aria_old_sk_****************************c1d9", created: "2024-06-01", lastUsed: "2024-12-01", status: "revoked" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const USER_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  on_leave: { label: "On Leave", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  inactive: { label: "Inactive", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function SettingsModule() {
  const { refreshTick } = useAppStore();
  const [activeTab, setActiveTab] = useState("general");
  const [showKey, setShowKey] = useState<string | null>(null);

  const activeUsers = MOCK_USERS.filter((u) => u.status === "active").length;
  const enabledModules = MODULES_LIST.filter((m) => m.enabled).length;

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
        <Button className="bg-navy hover:bg-navy-light text-white h-9"><Save className="h-4 w-4 mr-1" /> Save Changes</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active Users" value={activeUsers} icon={Users} accent="navy" />
        <KpiCard label="Total Roles" value={MOCK_ROLES.length} icon={Shield} accent="info" />
        <KpiCard label="Enabled Modules" value={enabledModules} icon={ToggleLeft} accent="success" />
        <KpiCard label="API Keys" value={MOCK_API_KEYS.filter((k) => k.status === "active").length} icon={Key} accent="gold" />
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
                  <Input defaultValue="ARIA Grand Hotel & Spa" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Property Code</Label>
                  <Input defaultValue="ARIAGRAND" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Timezone</Label>
                  <Select defaultValue="IST">
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
                  <Select defaultValue="INR">
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
                  <Input defaultValue="123 Marine Drive, Mumbai 400020" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input defaultValue="+91 22 1234 5678" className="h-9" />
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
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Role</Button>
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
                  {MOCK_ROLES.map((role) => (
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
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Eye className="h-3 w-3 mr-1" />View Permissions</Button>
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
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add User</Button>
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
                  {MOCK_USERS.map((user) => {
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
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><SettingsIcon className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Lock className="h-3 w-3" /></Button>
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
                <Button variant="outline" className="w-full h-8 text-xs">Upgrade Plan</Button>
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
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Generate Key</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_API_KEYS.map((ak) => (
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
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0"><Copy className="h-3 w-3" /></Button>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>Created: {fmtDate(ak.created)}</span>
                      <span>Last used: {fmtDate(ak.lastUsed)}</span>
                    </div>
                  </div>
                  {ak.status === "active" && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-[#DC2626] hover:text-[#DC2626]"><Trash2 className="h-3 w-3 mr-1" />Revoke</Button>
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
    </div>
  );
}
