// POST /api/documents/upload — upload document with file metadata
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const formData = await req.formData();

  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string || file?.name || "Untitled";
  const category = formData.get("category") as string || "general";
  const uploadedById = formData.get("uploadedById") as string || null;

  if (!file) {
    return fail("No file provided", "VALIDATION", 400);
  }

  // Determine file type from extension
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const fileTypeMap: Record<string, string> = {
    pdf: "pdf", doc: "doc", docx: "docx", xls: "xlsx", xlsx: "xlsx",
    jpg: "jpg", jpeg: "jpg", png: "png", gif: "gif", svg: "svg",
    csv: "csv", txt: "txt",
  };
  const fileType = fileTypeMap[ext] || ext || null;

  // For SQLite: store metadata only (no actual file storage)
  // In production, you'd upload to S3/GCS and store the URL
  const document = await db.document.create({
    data: {
      propertyId,
      name,
      category,
      fileType,
      fileUrl: null, // No actual file storage in SQLite mode
      fileSize: file.size,
      uploadedById,
      tags: "[]",
      isTemplate: false,
      version: 1,
      status: "active",
    },
  });

  await logAudit({
    propertyId,
    action: "DOCUMENT_UPLOADED",
    entityType: "Document",
    entityId: document.id,
    newValue: { ...document, fileName: file.name, fileType, fileSize: file.size },
  });

  await broadcast("documents:uploaded", document, propertyId);

  return ok({
    ...document,
    fileName: file.name,
  });
});
