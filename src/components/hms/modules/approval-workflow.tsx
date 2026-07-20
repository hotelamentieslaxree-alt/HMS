// ARIA HMS — Shared Digital Signature Approval Workflow Components
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, XCircle, Minus, PenTool, Type, Eraser,
  Signature, ChevronRight, User, Calendar, MessageSquare, Shield,
  Loader2, AlertCircle,
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────

export type ApprovalStatus = "approved" | "pending" | "rejected" | "not_required";

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  roleTitle: string;
  approverName: string | null;
  status: ApprovalStatus;
  timestamp: string | null;
  reason: string | null;
  signatureData: string | null; // base64 data URL
  isCurrentStep: boolean;
}

export interface ApprovalWorkflowProps {
  documentTitle: string;
  documentId: string;
  documentType: string; // e.g., "Purchase Order", "Payment", "Request"
  steps: ApprovalStep[];
  onApprove: (stepId: string, signatureData: string, reason?: string) => Promise<void>;
  onReject: (stepId: string, signatureData: string, reason: string) => Promise<void>;
  currentUserName?: string;
  currentRoleTitle?: string;
  readOnly?: boolean;
}

export interface DigitalSignaturePadProps {
  onSign: (signatureData: string) => void;
  signerName: string;
  signerRole?: string;
  onCancel?: () => void;
  compact?: boolean;
}

export interface ApprovalBadgeProps {
  status: ApprovalStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

// ─── APPROVAL BADGE ──────────────────────────────────────────────────

const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; icon: any; bgCls: string; textCls: string; dotColor: string }> = {
  approved: { label: "Approved", icon: CheckCircle2, bgCls: "bg-[#DCFCE7]", textCls: "text-[#14532D]", dotColor: "#16A34A" },
  pending: { label: "Pending", icon: Clock, bgCls: "bg-[#FEF3C7]", textCls: "text-[#78350F]", dotColor: "#D97706" },
  rejected: { label: "Rejected", icon: XCircle, bgCls: "bg-[#FEE2E2]", textCls: "text-[#7F1D1D]", dotColor: "#DC2626" },
  not_required: { label: "Not Required", icon: Minus, bgCls: "bg-[#F3F4F6]", textCls: "text-[#4B5563]", dotColor: "#6B7280" },
};

export function ApprovalBadge({ status, size = "sm", showLabel = true }: ApprovalBadgeProps) {
  const meta = APPROVAL_STATUS_META[status];
  const Icon = meta.icon;
  const sizeMap = {
    sm: { badge: "px-1.5 py-0.5 text-[10px]", icon: "h-3 w-3", dot: "h-1.5 w-1.5" },
    md: { badge: "px-2 py-1 text-xs", icon: "h-3.5 w-3.5", dot: "h-2 w-2" },
    lg: { badge: "px-2.5 py-1 text-sm", icon: "h-4 w-4", dot: "h-2 w-2" },
  };
  const s = sizeMap[size];

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap", meta.bgCls, meta.textCls, s.badge)}>
      <Icon className={s.icon} />
      {showLabel && meta.label}
    </span>
  );
}

// ─── DIGITAL SIGNATURE PAD ──────────────────────────────────────────

export function DigitalSignaturePad({ onSign, signerName, signerRole, onCancel, compact = false }: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(signerName);
  const [isSigned, setIsSigned] = useState(false);
  const [signedData, setSignedData] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1B3A6B";
  }, [mode]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  }, []);

  const handleSign = useCallback(() => {
    let dataUrl: string;

    if (mode === "draw") {
      if (!hasDrawn) {
        toast.error("Please draw your signature first");
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL("image/png");
    } else {
      if (!typedName.trim()) {
        toast.error("Please type your name first");
        return;
      }
      // Create a typed signature as canvas image
      const tmpCanvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      tmpCanvas.width = 400 * dpr;
      tmpCanvas.height = 120 * dpr;
      const ctx = tmpCanvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 400, 120);
      ctx.font = 'italic 36px "Georgia", "Times New Roman", serif';
      ctx.fillStyle = "#1B3A6B";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 200, 55);
      dataUrl = tmpCanvas.toDataURL("image/png");
    }

    setSignedData(dataUrl);
    setSignedAt(new Date().toISOString());
    setIsSigned(true);
    onSign(dataUrl);
  }, [mode, hasDrawn, typedName, onSign]);

  if (isSigned && signedData) {
    return (
      <div className="rounded-lg border-2 border-[#16A34A] bg-[#DCFCE7]/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
          <span className="text-xs font-semibold text-[#14532D]">Digitally Signed</span>
        </div>
        <div className="bg-white rounded-md border border-[#16A34A]/30 p-2 mb-2">
          <img
            src={signedData}
            alt="Digital Signature"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {signerName}</span>
          {signerRole && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {signerRole}</span>}
          {signedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(signedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card", compact ? "p-3" : "p-4")}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Signature className="h-4 w-4 text-navy" />
          <span className="text-xs font-semibold text-foreground">Digital Signature</span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            variant={mode === "draw" ? "default" : "ghost"}
            size="sm"
            className={cn("h-6 text-[10px] px-2", mode === "draw" && "bg-navy hover:bg-navy-light text-white")}
            onClick={() => setMode("draw")}
          >
            <PenTool className="h-3 w-3 mr-1" /> Draw
          </Button>
          <Button
            variant={mode === "type" ? "default" : "ghost"}
            size="sm"
            className={cn("h-6 text-[10px] px-2", mode === "type" && "bg-navy hover:bg-navy-light text-white")}
            onClick={() => setMode("type")}
          >
            <Type className="h-3 w-3 mr-1" /> Type
          </Button>
        </div>
      </div>

      {mode === "draw" ? (
        <>
          {/* Signature Canvas */}
          <div className="relative rounded-md border-2 border-dashed border-[#1B3A6B]/30 bg-white mb-2">
            <canvas
              ref={canvasRef}
              className={cn("w-full cursor-crosshair touch-none", compact ? "h-24" : "h-32")}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground/50 italic">Sign here with your mouse or finger</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={clearCanvas}>
              <Eraser className="h-3 w-3 mr-1" /> Clear
            </Button>
            <span className="text-[10px] text-muted-foreground">Using pen: {signerName}</span>
          </div>
        </>
      ) : (
        <>
          {/* Type Name */}
          <div className="space-y-2 mb-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Type your full name</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter your name"
                className="h-8 text-xs"
              />
            </div>
            {typedName.trim() && (
              <div className="rounded-md border-2 border-dashed border-[#1B3A6B]/30 bg-white p-4 text-center">
                <span className="text-2xl italic font-serif text-navy" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
                  {typedName}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Sign Button */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        {onCancel && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
        )}
        <div className="flex-1" />
        <Button
          className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white h-8 text-xs"
          onClick={handleSign}
        >
          <Signature className="h-3.5 w-3.5 mr-1" /> Sign & Confirm
        </Button>
      </div>
    </div>
  );
}

// ─── APPROVAL WORKFLOW ──────────────────────────────────────────────────

export function ApprovalWorkflow({
  documentTitle,
  documentId,
  documentType,
  steps,
  onApprove,
  onReject,
  currentUserName,
  currentRoleTitle,
  readOnly = false,
}: ApprovalWorkflowProps) {
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps.find((s) => s.isCurrentStep && s.status === "pending");

  const handleStartApproval = (type: "approve" | "reject") => {
    if (!currentStep) return;
    setActionType(type);
    setApprovalReason("");
    setRejectionReason("");
    setCapturedSignature(null);
    setSelectedStep(currentStep);
  };

  const handleSignatureCapture = useCallback((sigData: string) => {
    setCapturedSignature(sigData);
  }, []);

  const handleSubmitAction = async () => {
    if (!selectedStep || !capturedSignature) return;
    if (actionType === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === "approve") {
        await onApprove(selectedStep.id, capturedSignature, approvalReason || undefined);
        toast.success(`${documentType} approved successfully`);
      } else {
        await onReject(selectedStep.id, capturedSignature, rejectionReason);
        toast.success(`${documentType} rejected`);
      }
      setSelectedStep(null);
      setActionType(null);
      setCapturedSignature(null);
      setApprovalReason("");
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err.message || `Failed to ${actionType} ${documentType.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const approvedCount = steps.filter((s) => s.status === "approved").length;
  const totalRequired = steps.filter((s) => s.status !== "not_required").length;
  const progressPct = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;

  return (
    <Card className="border-[#1B3A6B]/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1B3A6B]" />
            Approval Workflow
          </CardTitle>
          <div className="flex items-center gap-2">
            <ApprovalBadge status={currentStep ? "pending" : (approvedCount === totalRequired ? "approved" : "not_required")} size="sm" />
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{approvedCount}/{totalRequired} approved ({progressPct}%)</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1B3A6B] to-[#C9952A] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Timeline */}
        <div className="relative space-y-0">
          {steps.map((step, index) => {
            const meta = APPROVAL_STATUS_META[step.status];
            const StepIcon = meta.icon;
            const isLast = index === steps.length - 1;
            const isActive = step.isCurrentStep && step.status === "pending";

            return (
              <div key={step.id} className="relative">
                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[15px] top-[32px] w-0.5",
                      step.status === "approved" ? "bg-[#16A34A]" : "bg-border"
                    )}
                    style={{ height: "calc(100% - 16px)" }}
                  />
                )}

                <div className={cn("flex gap-3 pb-4", isLast && "pb-0")}>
                  {/* Step Indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                        step.status === "approved" && "bg-[#DCFCE7] border-[#16A34A]",
                        step.status === "rejected" && "bg-[#FEE2E2] border-[#DC2626]",
                        step.status === "pending" && isActive && "bg-[#FEF3C7] border-[#C9952A] ring-2 ring-[#C9952A]/30",
                        step.status === "pending" && !isActive && "bg-[#F3F4F6] border-[#6B7280]",
                        step.status === "not_required" && "bg-[#F3F4F6] border-[#6B7280]"
                      )}
                    >
                      <StepIcon className={cn("h-4 w-4", meta.textCls)} />
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{step.roleTitle}</span>
                      <ApprovalBadge status={step.status} size="sm" showLabel />
                      {isActive && (
                        <span className="text-[10px] font-medium text-[#C9952A] bg-[#C9952A]/10 px-1.5 py-0.5 rounded">Action Required</span>
                      )}
                    </div>
                    {step.approverName && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" /> {step.approverName}
                      </p>
                    )}
                    {step.timestamp && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(step.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    )}
                    {step.reason && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                        <MessageSquare className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                        <span className={cn(step.status === "rejected" && "text-[#DC2626] font-medium")}>{step.reason}</span>
                      </p>
                    )}
                    {/* Signature Display */}
                    {step.signatureData && step.status === "approved" && (
                      <div className="mt-2 rounded-md border border-[#16A34A]/20 bg-[#DCFCE7]/20 p-1.5 inline-block">
                        <img src={step.signatureData} alt={`Signature of ${step.approverName}`} className="h-10 w-auto object-contain" />
                      </div>
                    )}
                    {step.signatureData && step.status === "rejected" && (
                      <div className="mt-2 rounded-md border border-[#DC2626]/20 bg-[#FEE2E2]/20 p-1.5 inline-block">
                        <img src={step.signatureData} alt={`Signature of ${step.approverName}`} className="h-10 w-auto object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons for Current Approver */}
        {currentStep && !readOnly && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-[#C9952A]" />
              <span className="text-xs font-medium text-foreground">
                Your approval is required as <span className="font-semibold text-navy">{currentStep.roleTitle}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-[#16A34A] hover:bg-[#14532D] text-white h-9 text-xs"
                onClick={() => handleStartApproval("approve")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button
                variant="outline"
                className="h-9 text-xs text-[#DC2626] border-[#DC2626]/30 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                onClick={() => handleStartApproval("reject")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedStep && !!actionType} onOpenChange={(open) => { if (!open) { setSelectedStep(null); setActionType(null); setCapturedSignature(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <><CheckCircle2 className="h-5 w-5 text-[#16A34A]" /> Approve {documentType}</>
              ) : (
                <><XCircle className="h-5 w-5 text-[#DC2626]" /> Reject {documentType}</>
              )}
            </DialogTitle>
            <DialogDescription>
              {documentTitle} — {selectedStep?.roleTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Document Info */}
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{documentType}</span>
                <span className="text-xs font-mono font-semibold text-navy">{documentId}</span>
              </div>
              <p className="text-xs font-medium mt-1">{documentTitle}</p>
            </div>

            {actionType === "approve" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Comments (optional)</Label>
                <Textarea
                  className="text-xs"
                  placeholder="Add any comments about this approval..."
                  rows={2}
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                />
              </div>
            )}

            {actionType === "reject" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Reason for Rejection *</Label>
                <Textarea
                  className="text-xs"
                  placeholder="Explain why this is being rejected..."
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            {/* Digital Signature */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Digital Signature *</Label>
              <DigitalSignaturePad
                onSign={handleSignatureCapture}
                signerName={currentUserName || "Unknown User"}
                signerRole={currentRoleTitle}
                compact
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-9" onClick={() => { setSelectedStep(null); setActionType(null); setCapturedSignature(null); }}>Cancel</Button>
            <Button
              className={cn(
                "h-9 text-white",
                actionType === "approve" ? "bg-[#16A34A] hover:bg-[#14532D]" : "bg-[#DC2626] hover:bg-[#991B1B]"
              )}
              disabled={!capturedSignature || isSubmitting || (actionType === "reject" && !rejectionReason.trim())}
              onClick={handleSubmitAction}
            >
              {isSubmitting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Processing...</>
              ) : actionType === "approve" ? (
                <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm Approval</>
              ) : (
                <><XCircle className="h-3.5 w-3.5 mr-1" /> Confirm Rejection</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── APPROVAL HISTORY COMPONENT ──────────────────────────────────────

export interface ApprovalHistoryEntry {
  id: string;
  documentType: string;
  documentId: string;
  documentTitle: string;
  action: "approved" | "rejected";
  approverName: string;
  approverRole: string;
  timestamp: string;
  reason: string | null;
  signatureData: string | null;
}

export function ApprovalHistory({ entries }: { entries: ApprovalHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No approval history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "rounded-lg border p-3 transition-colors hover:bg-muted/30",
            entry.action === "approved" ? "border-[#16A34A]/20" : "border-[#DC2626]/20"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                entry.action === "approved" ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"
              )}>
                {entry.action === "approved" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {entry.documentTitle}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {entry.documentType} — {entry.documentId}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {entry.approverName}</span>
                  <span className="flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" /> {entry.approverRole}</span>
                </div>
                {entry.reason && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">&ldquo;{entry.reason}&rdquo;</p>
                )}
                {entry.signatureData && (
                  <div className="mt-1.5 inline-block rounded border border-border/50 p-1">
                    <img src={entry.signatureData} alt="Signature" className="h-8 w-auto object-contain" />
                  </div>
                )}
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
