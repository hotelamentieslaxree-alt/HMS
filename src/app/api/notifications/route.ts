// /api/notifications — list + mark read
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function GET() {
  const propertyId = await PROPERTY_ID();
  const notifications = await db.notification.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unreadCount = await db.notification.count({ where: { propertyId, isRead: false } });
  return ok({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  if (body.markReadId) {
    const updated = await db.notification.update({ where: { id: body.markReadId }, data: { isRead: true } });
    return ok(updated);
  }
  if (body.markAllRead) {
    await db.notification.updateMany({ where: { propertyId, isRead: false }, data: { isRead: true } });
    return ok({ markedAll: true });
  }
  const { type = "info", title, message } = body;
  if (!title || !message) return fail("title and message required", "VALIDATION");
  const n = await db.notification.create({ data: { propertyId, type, title, message } });
  return ok(n);
}
