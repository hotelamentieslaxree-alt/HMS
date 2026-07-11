// ARIA HMS — AI Center Module (Feature cards, NL search, Chat interface)
"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Bot, Calendar, DollarSign, Package, MessageSquare,
  TrendingUp, FileText, Search, Send, Mic, Brain, Cpu,
  Zap, ArrowRight, Star, Clock, Lightbulb, BarChart3,
  MessageCircle, Wand2, Target, LineChart,
} from "lucide-react";

// ─── AI FEATURE CARDS ────────────────────────────────────────────────

const AI_FEATURES = [
  { id: "receptionist", title: "AI Receptionist", description: "Automated guest check-in/out, voice assistance, and FAQ handling", icon: Bot, status: "active", color: "#1B3A6B" },
  { id: "booking", title: "AI Booking Assistant", description: "Smart booking management, overbooking prevention, and rate suggestions", icon: Calendar, status: "active", color: "#16A34A" },
  { id: "pricing", title: "AI Pricing Assistant", description: "Dynamic pricing recommendations based on demand, events, and competition", icon: DollarSign, status: "active", color: "#C9952A" },
  { id: "advisor", title: "AI Business Advisor", description: "Strategic insights, performance analysis, and growth recommendations", icon: Lightbulb, status: "active", color: "#0369A1" },
  { id: "inventory", title: "AI Inventory Predictor", description: "Demand forecasting and automated reorder point suggestions", icon: Package, status: "beta", color: "#7C3AED" },
  { id: "complaint", title: "AI Complaint Analyzer", description: "Sentiment analysis, complaint categorization, and auto-response drafting", icon: MessageSquare, status: "beta", color: "#D97706" },
  { id: "revenue", title: "AI Revenue Forecast", description: "Revenue prediction models with scenario planning and trend analysis", icon: LineChart, status: "active", color: "#16A34A" },
  { id: "reports", title: "AI Report Generator", description: "Auto-generate daily, weekly, monthly reports with natural language summaries", icon: FileText, status: "coming_soon", color: "#6B7280" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  beta: { label: "Beta", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  coming_soon: { label: "Coming Soon", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

// ─── MOCK CHAT MESSAGES ──────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", role: "assistant", content: "Hello! I'm ARIA AI Assistant. I can help you with hotel operations, revenue insights, guest management, and more. How can I help you today?", timestamp: new Date(Date.now() - 60000) },
];

const SUGGESTED_QUERIES = [
  "What's today's occupancy rate?",
  "Show me revenue trends this week",
  "Which rooms need housekeeping?",
  "Predict next week's bookings",
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function AiCenterModule() {
  const { refreshTick } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeCount = AI_FEATURES.filter((f) => f.status === "active").length;
  const betaCount = AI_FEATURES.filter((f) => f.status === "beta").length;

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've analyzed your query: "${userMsg.content}". Based on current data, here's what I found:\n\n• Current occupancy is at 78% with 47 rooms occupied\n• Revenue today is ₹1,84,500, which is 12% above target\n• 3 rooms are pending housekeeping\n\nWould you like me to drill deeper into any of these metrics?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestedQuery = (query: string) => {
    setInput(query);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7C3AED]" /> AI Center
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Intelligent automation and AI-powered insights for your hotel</p>
        </div>
      </div>

      {/* Natural Language Search */}
      <Card className="border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C3AED]/10 shrink-0">
              <Brain className="h-5 w-5 text-[#7C3AED]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#7C3AED] mb-1">Ask ARIA AI anything about your hotel operations</p>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g., What's my expected occupancy next weekend?"
                  className="pl-9 h-9 border-[#7C3AED]/20 focus:border-[#7C3AED]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Button className="bg-[#7C3AED] hover:bg-[#7C3AED]/80 text-white h-9"><Sparkles className="h-4 w-4 mr-1" /> Ask AI</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="AI Features" value={AI_FEATURES.length} icon={Cpu} accent="navy" />
        <KpiCard label="Active" value={activeCount} icon={Zap} accent="success" />
        <KpiCard label="Beta" value={betaCount} icon={Star} accent="warning" />
        <KpiCard label="Queries Today" value={142} icon={MessageCircle} accent="info" delta={18} deltaLabel="vs yesterday" />
      </div>

      {/* AI Feature Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Wand2 className="h-4 w-4 text-[#7C3AED]" /> AI Capabilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AI_FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;
            const statusMeta = STATUS_META[feature.status];
            return (
              <Card key={feature.id} className="hover:shadow-card-lg transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg" style={{ backgroundColor: feature.color + "15" }}>
                      <FeatureIcon className="h-5 w-5" style={{ color: feature.color }} />
                    </div>
                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-medium", statusMeta.cls)}>{statusMeta.label}</span>
                  </div>
                  <p className="text-sm font-semibold mb-1">{feature.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.description}</p>
                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 group-hover:text-[#7C3AED]">
                      Open <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="border-[#7C3AED]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#7C3AED]" /> ARIA AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div ref={scrollRef} className="h-72 overflow-y-auto px-4 py-2 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-navy text-white"
                    : "bg-muted border border-border"
                )}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-border/50">
                      <Sparkles className="h-3 w-3 text-[#7C3AED]" />
                      <span className="text-[10px] font-medium text-[#7C3AED]">ARIA AI</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn("text-[9px] mt-1", msg.role === "user" ? "text-white/60" : "text-muted-foreground")}>
                    {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-[#7C3AED] animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">ARIA is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Queries */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-border">
              {SUGGESTED_QUERIES.map((q) => (
                <Button key={q} variant="outline" size="sm" className="h-6 text-[10px] rounded-full" onClick={() => handleSuggestedQuery(q)}>
                  {q}
                </Button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask ARIA anything..."
                className="flex-1 h-9 text-xs"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button variant="outline" size="sm" className="h-9 w-9 p-0"><Mic className="h-4 w-4" /></Button>
              <Button className="bg-[#7C3AED] hover:bg-[#7C3AED]/80 text-white h-9 w-9 p-0" onClick={handleSend} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
