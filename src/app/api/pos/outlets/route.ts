// GET /api/pos/outlets — list all outlets with tables + stats
import { db } from "@/lib/db";
import { ok, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const propertyId = await PROPERTY_ID();
  const outlets = await db.outlet.findMany({
    where: { propertyId },
    include: {
      tables: true,
      _count: { select: { orders: true, menuCategories: true } },
    },
    orderBy: { name: "asc" },
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const result = [];
  for (const o of outlets) {
    const ordersToday = await db.posOrder.count({ where: { outletId: o.id, createdAt: { gte: today } } });
    const revenueToday = await db.posOrder.aggregate({
      where: { outletId: o.id, status: "paid", createdAt: { gte: today } },
      _sum: { totalAmount: true },
    });
    const activeOrders = await db.posOrder.count({ where: { outletId: o.id, status: { in: ["draft","sent_to_kitchen","in_preparation","ready","served","billed"] } } });
    result.push({
      id: o.id, name: o.name, code: o.code, type: o.type, isActive: o.isActive,
      tableCount: o.tableCount,
      tablesAvailable: o.tables.filter((t) => t.status === "available").length,
      tablesOccupied: o.tables.filter((t) => t.status === "occupied").length,
      tablesReserved: o.tables.filter((t) => t.status === "reserved").length,
      ordersToday,
      activeOrders,
      revenueToday: revenueToday._sum.totalAmount ?? 0,
    });
  }
  return ok(result);
});
