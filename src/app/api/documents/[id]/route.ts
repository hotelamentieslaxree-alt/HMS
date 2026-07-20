// GET /api/documents/[id] — get single document
// DELETE /api/documents/[id] — delete document
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;

  const document = await db.document.findFirst({
    where: { id, propertyId },
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!document) {
    return fail("Document not found", "NOT_FOUND", 404);
  }

  return ok({
    id: document.id,
    name: document.name,
    category: document.category,
    fileType: document.fileType,
    fileUrl: document.fileUrl,
    fileSize: document.fileSize,
    uploadedById: document.uploadedById,
    uploadedBy: document.uploadedBy ? `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}` : null,
    tags: JSON.parse(document.tags || "[]"),
    isTemplate: document.isTemplate,
    version: document.version,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });
});

export const DELETE = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;

  const document = await db.document.findFirst({
    where: { id, propertyId },
  });

  if (!document) {
    return fail("Document not found", "NOT_FOUND", 404);
  }

  // Soft-delete: set status to "deleted"
  const deleted = await db.document.update({
    where: { id },
    data: { status: "deleted" },
  });

  await logAudit({
    propertyId,
    action: "DOCUMENT_DELETED",
    entityType: "Document",
    entityId: id,
    oldValue: document,
    newValue: deleted,
  });

  await broadcast("documents:deleted", { id }, propertyId);

  return ok({ id, status: "deleted" });
});
