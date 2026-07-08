// ARIA HMS — Documents Module (Grid/List view, Categories, Upload, Search)
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, Upload, Search, Grid, List, Folder,
  File, FileImage, FileSpreadsheet, FileClock, Download,
  Eye, Trash2, MoreVertical, Plus, Filter, Clock,
  HardDrive, Shield, Building2, Receipt, FileQuestion,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────

type DocCategory = "contracts" | "invoices" | "reports" | "policies" | "others";

interface DocItem {
  id: string;
  name: string;
  category: DocCategory;
  type: "pdf" | "doc" | "xlsx" | "img";
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "active" | "archived" | "draft";
}

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_DOCS: DocItem[] = [
  { id: "DOC-001", name: "Corporate Agreement - TCS Ltd", category: "contracts", type: "pdf", size: "2.4 MB", uploadedBy: "Karan Rao", uploadedAt: "2025-01-14", status: "active" },
  { id: "DOC-002", name: "Invoice #INV-2403 - January", category: "invoices", type: "pdf", size: "156 KB", uploadedBy: "Priya Sharma", uploadedAt: "2025-01-13", status: "active" },
  { id: "DOC-003", name: "Monthly Revenue Report - Dec 2024", category: "reports", type: "xlsx", size: "1.8 MB", uploadedBy: "Anita Desai", uploadedAt: "2025-01-05", status: "active" },
  { id: "DOC-004", name: "Hotel Fire Safety Policy", category: "policies", type: "doc", size: "890 KB", uploadedBy: "Raj Malhotra", uploadedAt: "2024-12-20", status: "active" },
  { id: "DOC-005", name: "Property Insurance Renewal", category: "contracts", type: "pdf", size: "3.1 MB", uploadedBy: "Karan Rao", uploadedAt: "2025-01-10", status: "active" },
  { id: "DOC-006", name: "Guest Feedback Summary Q4", category: "reports", type: "xlsx", size: "2.2 MB", uploadedBy: "Suresh Menon", uploadedAt: "2025-01-08", status: "active" },
  { id: "DOC-007", name: "Staff Handbook 2025", category: "policies", type: "doc", size: "4.5 MB", uploadedBy: "HR Dept", uploadedAt: "2025-01-02", status: "active" },
  { id: "DOC-008", name: "Kitchen Layout Blueprint", category: "others", type: "img", size: "5.6 MB", uploadedBy: "Raj Malhotra", uploadedAt: "2024-11-15", status: "archived" },
  { id: "DOC-009", name: "GST Return - Q3 2024", category: "invoices", type: "pdf", size: "420 KB", uploadedBy: "Priya Sharma", uploadedAt: "2024-10-15", status: "archived" },
  { id: "DOC-010", name: "Vendor Agreement - Linen Solutions", category: "contracts", type: "pdf", size: "1.2 MB", uploadedBy: "Karan Rao", uploadedAt: "2025-01-12", status: "active" },
  { id: "DOC-011", name: "Occupancy Forecast 2025", category: "reports", type: "xlsx", size: "980 KB", uploadedBy: "Anita Desai", uploadedAt: "2025-01-11", status: "draft" },
  { id: "DOC-012", name: "Emergency Evacuation Plan", category: "policies", type: "pdf", size: "1.5 MB", uploadedBy: "Raj Malhotra", uploadedAt: "2024-09-01", status: "active" },
];

// ─── CATEGORY META ───────────────────────────────────────────────────

const CATEGORY_META: Record<DocCategory, { label: string; icon: any; color: string }> = {
  contracts: { label: "Contracts", icon: Shield, color: "#1B3A6B" },
  invoices: { label: "Invoices", icon: Receipt, color: "#16A34A" },
  reports: { label: "Reports", icon: FileSpreadsheet, color: "#0369A1" },
  policies: { label: "Policies", icon: Building2, color: "#7C3AED" },
  others: { label: "Others", icon: FileQuestion, color: "#6B7280" },
};

const TYPE_ICON: Record<string, { icon: any; color: string }> = {
  pdf: { icon: FileText, color: "#DC2626" },
  doc: { icon: File, color: "#0369A1" },
  xlsx: { icon: FileSpreadsheet, color: "#16A34A" },
  img: { icon: FileImage, color: "#7C3AED" },
};

const DOC_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  archived: { label: "Archived", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  draft: { label: "Draft", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function DocumentsModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredDocs = useMemo(() => {
    return MOCK_DOCS.filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, activeCategory]);

  const totalDocs = MOCK_DOCS.length;
  const activeDocs = MOCK_DOCS.filter((d) => d.status === "active").length;
  const totalSize = "23.8 MB";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Folder className="h-5 w-5 text-navy" /> Document Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Store, organize and manage all property documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-navy hover:bg-navy-light text-white h-9"><Upload className="h-4 w-4 mr-1" /> Upload Document</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Documents" value={totalDocs} icon={FileText} accent="navy" />
        <KpiCard label="Active" value={activeDocs} icon={FileClock} accent="success" />
        <KpiCard label="Storage Used" value={totalSize} icon={HardDrive} accent="info" />
        <KpiCard label="Categories" value={5} icon={Folder} accent="gold" />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search documents..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button variant={activeCategory === "all" ? "default" : "outline"} size="sm" className="h-8 text-xs shrink-0" onClick={() => setActiveCategory("all")}>All</Button>
          {(Object.entries(CATEGORY_META) as [DocCategory, typeof CATEGORY_META[DocCategory]][]).map(([key, meta]) => {
            const CatIcon = meta.icon;
            return (
              <Button key={key} variant={activeCategory === key ? "default" : "outline"} size="sm" className="h-8 text-xs shrink-0" onClick={() => setActiveCategory(key)}>
                <CatIcon className="h-3 w-3 mr-1" />{meta.label}
              </Button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1 border border-border rounded-md p-0.5">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode("grid")}><Grid className="h-3 w-3" /></Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode("list")}><List className="h-3 w-3" /></Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredDocs.map((doc) => {
            const typeMeta = TYPE_ICON[doc.type] ?? TYPE_ICON.pdf;
            const catMeta = CATEGORY_META[doc.category];
            const statusMeta = DOC_STATUS_META[doc.status] ?? DOC_STATUS_META.active;
            const TypeIcon = typeMeta.icon;
            const CatIcon = catMeta.icon;
            return (
              <Card key={doc.id} className="hover:shadow-card-lg transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: typeMeta.color + "15" }}>
                      <TypeIcon className="h-5 w-5" style={{ color: typeMeta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><CatIcon className="h-3 w-3" style={{ color: catMeta.color }} />{catMeta.label}</span>
                        <span className="text-[10px] text-muted-foreground">· {doc.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-1">
                      <span className={cn("inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium", statusMeta.cls)}>{statusMeta.label}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-3 w-3" />{fmtDate(doc.uploadedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Download className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Trash2 className="h-3 w-3 text-[#DC2626]" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Name</TableHead>
                  <TableHead className="text-[11px]">Category</TableHead>
                  <TableHead className="text-[11px]">Type</TableHead>
                  <TableHead className="text-[11px]">Size</TableHead>
                  <TableHead className="text-[11px]">Uploaded By</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px]">Date</TableHead>
                  <TableHead className="text-[11px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const typeMeta = TYPE_ICON[doc.type] ?? TYPE_ICON.pdf;
                  const catMeta = CATEGORY_META[doc.category];
                  const statusMeta = DOC_STATUS_META[doc.status] ?? DOC_STATUS_META.active;
                  const TypeIcon = typeMeta.icon;
                  const CatIcon = catMeta.icon;
                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 shrink-0" style={{ color: typeMeta.color }} />
                          <span className="truncate max-w-[200px]">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="flex items-center gap-1"><CatIcon className="h-3 w-3" style={{ color: catMeta.color }} />{catMeta.label}</span>
                      </TableCell>
                      <TableCell className="text-xs uppercase">{doc.type}</TableCell>
                      <TableCell className="text-xs">{doc.size}</TableCell>
                      <TableCell className="text-xs">{doc.uploadedBy}</TableCell>
                      <TableCell><span className={cn("inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium", statusMeta.cls)}>{statusMeta.label}</span></TableCell>
                      <TableCell className="text-xs">{fmtDate(doc.uploadedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Eye className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Download className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
