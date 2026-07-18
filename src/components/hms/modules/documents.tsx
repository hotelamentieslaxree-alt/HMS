// ARIA HMS — Documents Module (Grid/List view, Categories, Upload, Search)
"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtDate } from "../shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Upload, Search, Grid, List, Folder,
  File, FileImage, FileSpreadsheet, FileClock, Download,
  Eye, Trash2, Clock,
  HardDrive, Shield, Building2, Receipt, FileQuestion,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiDelete } from "@/lib/api";

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

// ─── HELPERS ────────────────────────────────────────────────────────

function sizeToBytes(size: string): number {
  const match = size.match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "KB") return Math.round(val * 1024);
  if (unit === "MB") return Math.round(val * 1024 * 1024);
  if (unit === "GB") return Math.round(val * 1024 * 1024 * 1024);
  return 0;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function DocumentsModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("general");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview dialog state
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);

  // Delete confirmation state
  const [deleteDoc, setDeleteDoc] = useState<DocItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Local docs list (mutated on upload/delete)
  const [docs, setDocs] = useState<DocItem[]>(MOCK_DOCS);

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, activeCategory, docs]);

  const totalDocs = docs.length;
  const activeDocs = docs.filter((d) => d.status === "active").length;
  const totalSize = "23.8 MB";

  // ─── Upload handler ────────────────────────────────────────────
  const handleUploadClick = useCallback(() => {
    setUploadName("");
    setUploadCategory("general");
    setUploadFile(null);
    setUploadOpen(true);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName) setUploadName(file.name);
    }
  }, [uploadName]);

  const handleUploadSubmit = useCallback(async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName || uploadFile.name);
      formData.append("category", uploadCategory);

      const result = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!result.ok) {
        const json = await result.json().catch(() => null);
        throw new Error(json?.errors?.[0]?.message || "Upload failed");
      }

      const json = await result.json();
      const newDoc: DocItem = {
        id: json.data.id,
        name: uploadName || uploadFile.name,
        category: uploadCategory as DocCategory || "others",
        type: (uploadFile.name.split(".").pop() as DocItem["type"]) || "doc",
        size: uploadFile.size > 1024 * 1024
          ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(uploadFile.size / 1024)} KB`,
        uploadedBy: "You",
        uploadedAt: new Date().toISOString().slice(0, 10),
        status: "active",
      };

      setDocs((prev) => [newDoc, ...prev]);
      setUploadOpen(false);
      toast.success(`"${newDoc.name}" uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadName, uploadCategory]);

  // ─── View/Preview handler ─────────────────────────────────────
  const handleViewDoc = useCallback((doc: DocItem) => {
    setPreviewDoc(doc);
  }, []);

  // ─── Download handler ─────────────────────────────────────────
  const handleDownloadDoc = useCallback(async (doc: DocItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = doc.type === "xlsx" ? "xlsx" : doc.type === "img" ? "png" : doc.type === "doc" ? "docx" : "pdf";
      a.download = `${doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloading "${doc.name}"`);
    } catch (err: any) {
      toast.error(err.message || "Download failed");
    }
  }, []);

  // ─── Delete handler ───────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/documents/${deleteDoc.id}`);
      setDocs((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      toast.success(`"${deleteDoc.name}" deleted`);
      setDeleteDoc(null);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [deleteDoc]);

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
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={handleUploadClick}>
            <Upload className="h-4 w-4 mr-1" /> Upload Document
          </Button>
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
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleViewDoc(doc)} title="View"><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownloadDoc(doc)} title="Download"><Download className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDeleteDoc(doc)} title="Delete"><Trash2 className="h-3 w-3 text-[#DC2626]" /></Button>
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
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleViewDoc(doc)} title="View"><Eye className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownloadDoc(doc)} title="Download"><Download className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDeleteDoc(doc)} title="Delete"><Trash2 className="h-3 w-3 text-[#DC2626]" /></Button>
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

      {/* ─── Upload Dialog ────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Select a file and provide details for the document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">File</label>
              <input
                ref={fileInputRef}
                type="file"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-muted file:text-foreground file:text-sm file:font-medium file:mr-2 file:px-2 file:py-1 file:rounded-sm"
                onChange={handleFileSelect}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Document Name</label>
              <Input
                placeholder="Enter document name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="policies">Policies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={handleUploadSubmit} disabled={uploading || !uploadFile}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ───────────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && (() => {
                const typeMeta = TYPE_ICON[previewDoc.type] ?? TYPE_ICON.pdf;
                const TypeIcon = typeMeta.icon;
                return <TypeIcon className="h-5 w-5" style={{ color: typeMeta.color }} />;
              })()}
              {previewDoc?.name}
            </DialogTitle>
            <DialogDescription>Document preview</DialogDescription>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Category</p>
                  <p className="font-medium capitalize">{previewDoc.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium uppercase">{previewDoc.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Size</p>
                  <p className="font-medium">{previewDoc.size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium", DOC_STATUS_META[previewDoc.status]?.cls)}>
                    {DOC_STATUS_META[previewDoc.status]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Uploaded By</p>
                  <p className="font-medium">{previewDoc.uploadedBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Upload Date</p>
                  <p className="font-medium">{fmtDate(previewDoc.uploadedAt)}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Preview not available for this file type.</p>
                <p className="text-xs mt-1">Download the file to view its contents.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
            {previewDoc && (
              <Button className="bg-navy hover:bg-navy-light text-white" onClick={() => { handleDownloadDoc(previewDoc); setPreviewDoc(null); }}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────── */}
      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => { if (!open) setDeleteDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteDoc?.name}&quot;</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
