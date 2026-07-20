// GET /api/documents — list documents for property
// POST /api/documents — create document (metadata only)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const where: any = { propertyId };
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { tags: { contains: search } },
    ];
  }

  const documents = await db.document.findMany({
    where,
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(documents.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    fileType: d.fileType,
    fileUrl: d.fileUrl,
    fileSize: d.fileSize,
    uploadedById: d.uploadedById,
    uploadedBy: d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : null,
    tags: JSON.parse(d.tags || "[]"),
    isTemplate: d.isTemplate,
    version: d.version,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  })));
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.name) {
    return fail("name is required", "VALIDATION", 400);
  }

  const document = await db.document.create({
    data: {
      propertyId,
      name: body.name,
      category: body.category || "general",
      fileType: body.fileType || null,
      fileUrl: body.fileUrl || null,
      fileSize: body.fileSize || 0,
      uploadedById: body.uploadedById || null,
      tags: body.tags ? JSON.stringify(body.tags) : "[]",
      isTemplate: body.isTemplate || false,
      version: body.version || 1,
      status: body.status || "active",
    },
  });

  await logAudit({
    propertyId,
    action: "DOCUMENT_CREATED",
    entityType: "Document",
    entityId: document.id,
    newValue: document,
  });

  await broadcast("documents:created", document, propertyId);

  return ok(document);
});
