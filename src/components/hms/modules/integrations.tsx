// ARIA HMS — Integrations Module (OTA, Payment, Communication, Accounting)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plug, Globe, CreditCard, MessageSquare, Calculator,
  Settings, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle,
  Link2, ArrowRight, Plus, Search, Wifi, WifiOff,
  ExternalLink, Shield,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "available" | "error";

interface Integration {
  id: string;
  name: string;
  category: "ota" | "payment" | "communication" | "accounting";
  status: IntegrationStatus;
  lastSync?: string;
  logo?: string;
  description: string;
}

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_INTEGRATIONS: Integration[] = [
  { id: "INT-01", name: "Booking.com", category: "ota", status: "connected", lastSync: "2025-01-15T10:30:00", description: "World's largest OTA platform" },
  { id: "INT-02", name: "Agoda", category: "ota", status: "connected", lastSync: "2025-01-15T10:28:00", description: "Asia-focused OTA platform" },
  { id: "INT-03", name: "Expedia", category: "ota", status: "connected", lastSync: "2025-01-15T09:45:00", description: "Global travel booking platform" },
  { id: "INT-04", name: "Airbnb", category: "ota", status: "available", description: "Alternative accommodation platform" },
  { id: "INT-05", name: "Goibibo", category: "ota", status: "connected", lastSync: "2025-01-15T10:25:00", description: "Indian travel booking platform" },
  { id: "INT-06", name: "MakeMyTrip", category: "ota", status: "connected", lastSync: "2025-01-15T10:20:00", description: "India's leading travel site" },
  { id: "INT-07", name: "Google Hotels", category: "ota", status: "available", description: "Google hotel search integration" },
  { id: "INT-08", name: "Razorpay", category: "payment", status: "connected", lastSync: "2025-01-15T10:32:00", description: "Indian payment gateway" },
  { id: "INT-09", name: "Stripe", category: "payment", status: "available", description: "Global payment processing" },
  { id: "INT-10", name: "Cashfree", category: "payment", status: "available", description: "Indian payment solutions" },
  { id: "INT-11", name: "WhatsApp", category: "communication", status: "connected", lastSync: "2025-01-15T10:31:00", description: "Business messaging platform" },
  { id: "INT-12", name: "Gmail", category: "communication", status: "connected", lastSync: "2025-01-15T10:00:00", description: "Email communication" },
  { id: "INT-13", name: "Google Calendar", category: "communication", status: "connected", lastSync: "2025-01-15T09:00:00", description: "Calendar & scheduling" },
  { id: "INT-14", name: "Tally", category: "accounting", status: "available", description: "Indian accounting software" },
  { id: "INT-15", name: "Zoho Books", category: "accounting", status: "available", description: "Cloud accounting platform" },
  { id: "INT-16", name: "QuickBooks", category: "accounting", status: "available", description: "Global accounting solution" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const STATUS_META: Record<IntegrationStatus, { label: string; cls: string; icon: any }> = {
  connected: { label: "Connected", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]", icon: CheckCircle2 },
  available: { label: "Available", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]", icon: Plus },
  error: { label: "Error", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]", icon: AlertCircle },
};

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  ota: { label: "OTA Channels", icon: Globe, color: "#1B3A6B" },
  payment: { label: "Payment Gateways", icon: CreditCard, color: "#16A34A" },
  communication: { label: "Communication", icon: MessageSquare, color: "#0369A1" },
  accounting: { label: "Accounting", icon: Calculator, color: "#7C3AED" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function IntegrationsModule() {
  const { refreshTick } = useAppStore();
  const [activeTab, setActiveTab] = useState("all");

  const connectedCount = MOCK_INTEGRATIONS.filter((i) => i.status === "connected").length;
  const availableCount = MOCK_INTEGRATIONS.filter((i) => i.status === "available").length;
  const otaCount = MOCK_INTEGRATIONS.filter((i) => i.category === "ota" && i.status === "connected").length;

  const filteredIntegrations = activeTab === "all"
    ? MOCK_INTEGRATIONS
    : MOCK_INTEGRATIONS.filter((i) => i.category === activeTab);

  const connectedIntegrations = filteredIntegrations.filter((i) => i.status === "connected");
  const availableIntegrations = filteredIntegrations.filter((i) => i.status !== "connected");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Plug className="h-5 w-5 text-navy" /> Integrations Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Connect third-party services, OTAs, payment gateways & more</p>
        </div>
        <Button className="bg-navy hover:bg-navy-light text-white h-9"><Link2 className="h-4 w-4 mr-1" /> Connect New</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Connected" value={connectedCount} icon={Wifi} accent="success" />
        <KpiCard label="Available" value={availableCount} icon={WifiOff} accent="info" />
        <KpiCard label="OTA Channels" value={otaCount} icon={Globe} accent="navy" />
        <KpiCard label="Last Sync" value="2m ago" icon={RefreshCw} accent="gold" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="ota" className="text-xs">OTA Channels</TabsTrigger>
          <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
          <TabsTrigger value="communication" className="text-xs">Communication</TabsTrigger>
          <TabsTrigger value="accounting" className="text-xs">Accounting</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {/* Connected Integrations */}
          {connectedIntegrations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Connected Services
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {connectedIntegrations.map((intg) => {
                  const catMeta = CATEGORY_META[intg.category];
                  const CatIcon = catMeta.icon;
                  return (
                    <Card key={intg.id} className="hover:shadow-card-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 flex items-center justify-center rounded-lg border border-border bg-muted shrink-0">
                            <span className="text-sm font-bold text-navy">{intg.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{intg.name}</p>
                              <Badge className="text-[9px] bg-[#DCFCE7] text-[#14532D] border-[#16A34A] hover:bg-[#DCFCE7]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Connected</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{intg.description}</p>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <RefreshCw className="h-3 w-3" />
                                {intg.lastSync ? `Synced ${new Date(intg.lastSync).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}` : "Never synced"}
                              </div>
                              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2"><Settings className="h-3 w-3 mr-1" />Configure</Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Integrations */}
          {availableIntegrations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#0369A1]" /> Available Integrations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableIntegrations.map((intg) => {
                  const catMeta = CATEGORY_META[intg.category];
                  return (
                    <Card key={intg.id} className="hover:shadow-card-lg transition-shadow border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 shrink-0">
                            <span className="text-sm font-bold text-muted-foreground">{intg.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{intg.name}</p>
                              <Badge variant="outline" className="text-[9px]">Available</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{intg.description}</p>
                            <div className="mt-3 pt-2 border-t border-border">
                              <Button variant="default" size="sm" className="h-6 text-[10px] px-2 bg-navy hover:bg-navy-light text-white">
                                <Link2 className="h-3 w-3 mr-1" /> Connect
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
