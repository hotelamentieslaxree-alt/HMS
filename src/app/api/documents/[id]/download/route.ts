// GET /api/documents/[id]/download — download document (returns metadata as JSON since we don't store actual files)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, withHandler, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;

  const document = await db.document.findFirst({
    where: { id, propertyId, status: { not: "deleted" } },
  });

  if (!document) {
    return fail("Document not found", "NOT_FOUND", 404);
  }

  // Since we're using SQLite and not storing actual files,
  // return a JSON payload that the client can use for download simulation.
  // In production, this would stream the file from S3/GCS.
  const downloadData = {
    id: document.id,
    name: document.name,
    fileType: document.fileType,
    fileSize: document.fileSize,
    category: document.category,
    createdAt: document.createdAt.toISOString(),
    // Generate a placeholder content for demo purposes
    content: `This is a simulated download for: ${document.name}\nFile type: ${document.fileType || "unknown"}\nSize: ${document.fileSize} bytes\nCategory: ${document.category}\nVersion: ${document.version}`,
  };

  // Return as downloadable text file
  return new Response(downloadData.content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${document.name.replace(/[^a-zA-Z0-9._-]/g, "_")}${document.fileType ? `.${document.fileType}` : ".txt"}"`,
    },
  });
});
