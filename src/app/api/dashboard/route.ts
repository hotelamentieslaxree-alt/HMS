// GET /api/dashboard — live KPIs + room status grid + arrivals/departures + activity feed
import { db } from "@/lib/db";
import { ok, calcKPIs, PROPERTY_ID, withHandler } from "@/lib/hms";
import { startOfDay, addDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const propertyId = await PROPERTY_ID();
  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) return ok({});

  const today = startOfDay(new Date());

  // Rooms
  const rooms = await db.room.findMany({
    where: { propertyId },
    include: { category: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
  });
  const totalRooms = rooms.length;
  const outOfOrderRooms = rooms.filter((r) => r.currentStatus === "out_of_order" || r.currentStatus === "out_of_service").length;
  const occupiedRooms = rooms.filter((r) => r.currentStatus === "occupied_clean" || r.currentStatus === "occupied_dirty").length;

  // Room status counts
  const statusCounts: Record<string, number> = {};
  for (const r of rooms) statusCounts[r.currentStatus] = (statusCounts[r.currentStatus] ?? 0) + 1;

  // Today's reservations
  const arrivalsToday = await db.reservation.findMany({
    where: {
      propertyId,
      checkInDate: { lte: endOfDay(today) },
      checkOutDate: { gt: today },
      status: { in: ["confirmed", "tentative"] },
    },
    include: { primaryGuest: true, category: true, room: true, ratePlan: true },
    orderBy: { checkInDate: "asc" },
    take: 50,
  });

  const departuresToday = await db.reservation.findMany({
    where: {
      propertyId,
      checkOutDate: { lte: endOfDay(today), gte: today },
      status: "checked_in",
    },
    include: { primaryGuest: true, category: true, room: true, ratePlan: true },
    orderBy: { checkOutDate: "asc" },
    take: 50,
  });

  const inHouse = await db.reservation.findMany({
    where: { propertyId, status: "checked_in" },
    include: { primaryGuest: true, category: true, room: true },
    orderBy: { actualCheckIn: "desc" },
  });

  // Revenue (last 30 days from checked-out reservations + folios)
  const thirtyDaysAgo = addDays(today, -30);
  const recentFolios = await db.folio.findMany({
    where: { reservation: { propertyId, status: { in: ["checked_out", "checked_in"] } } },
    include: { reservation: true, lines: true },
  });

  let roomRevenue = 0;
  let totalRevenue = 0;
  const revenueByDay: Record<string, { room: number; fb: number; other: number; total: number }> = {};
  for (const f of recentFolios) {
    for (const line of f.lines) {
      if (line.isVoided) continue;
      const day = format(line.postedAt, "yyyy-MM-dd");
      if (new Date(day) < thirtyDaysAgo) continue;
      if (!revenueByDay[day]) revenueByDay[day] = { room: 0, fb: 0, other: 0, total: 0 };
      const amt = line.amount;
      if (line.departmentCode === "ROOM") {
        revenueByDay[day].room += amt;
        roomRevenue += amt;
      } else if (line.departmentCode === "FB") {
        revenueByDay[day].fb += amt;
      } else {
        revenueByDay[day].other += amt;
      }
      revenueByDay[day].total += amt;
      totalRevenue += amt;
    }
  }
  const revenueSeries = Object.entries(revenueByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, room: Math.round(v.room), fb: Math.round(v.fb), other: Math.round(v.other), total: Math.round(v.total) }));

  // Channel mix (booking sources for last 30 days)
  const channelReservations = await db.reservation.findMany({
    where: { propertyId, createdAt: { gte: thirtyDaysAgo } },
    select: { bookingSource: true, netRevenue: true },
  });
  const channelMix: Record<string, { count: number; revenue: number }> = {};
  for (const r of channelReservations) {
    if (!channelMix[r.bookingSource]) channelMix[r.bookingSource] = { count: 0, revenue: 0 };
    channelMix[r.bookingSource].count++;
    channelMix[r.bookingSource].revenue += r.netRevenue;
  }
  const channelSeries = Object.entries(channelMix).map(([source, v]) => ({
    source,
    count: v.count,
    revenue: Math.round(v.revenue),
  }));

  // Housekeeping tasks today
  const hkTasks = await db.housekeepingTask.findMany({
    where: { propertyId, scheduledFor: { gte: today, lt: addDays(today, 1) } },
    include: { room: { include: { category: true } }, assignee: true },
    orderBy: { priority: "asc" },
  });
  const hkSummary = {
    pending: hkTasks.filter((t) => t.status === "pending").length,
    inProgress: hkTasks.filter((t) => t.status === "in_progress").length,
    completed: hkTasks.filter((t) => t.status === "completed").length,
    inspected: hkTasks.filter((t) => t.status === "inspected").length,
    total: hkTasks.length,
  };

  // Maintenance tickets open
  const openTickets = await db.maintenanceTicket.count({ where: { propertyId, status: { in: ["open", "in_progress"] } } });

  // POS orders today
  const posOrdersToday = await db.posOrder.count({ where: { outlet: { propertyId }, createdAt: { gte: today } } });
  const posRevenueToday = await db.posOrder.aggregate({
    where: { outlet: { propertyId }, status: "paid", createdAt: { gte: today } },
    _sum: { totalAmount: true },
  });

  // Audit feed (recent 15)
  const auditFeed = await db.auditLog.findMany({
    where: { propertyId },
    orderBy: { occurredAt: "desc" },
    take: 15,
  });

  // Notifications
  const notifications = await db.notification.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const kpis = calcKPIs({
    occupiedRooms,
    totalRooms,
    outOfOrderRooms,
    roomRevenue,
    totalRevenue,
    operatingExpenses: totalRevenue * 0.42, // simulated 42% cost ratio
  });

  // Department health
  const departmentHealth = [
    { code: "FO", name: "Front Office", status: "healthy", metric: `${inHouse.length} in-house`, detail: `${arrivalsToday.length} arrivals · ${departuresToday.length} departures` },
    { code: "HK", name: "Housekeeping", status: hkSummary.pending > 5 ? "busy" : "healthy", metric: `${hkSummary.completed}/${hkSummary.total} done`, detail: `${hkSummary.pending} pending · ${hkSummary.inProgress} active` },
    { code: "FB", name: "Food & Beverage", status: "healthy", metric: `${posOrdersToday} orders`, detail: `₹${(posRevenueToday._sum.totalAmount ?? 0).toLocaleString("en-IN")} revenue` },
    { code: "ENG", name: "Engineering", status: openTickets > 3 ? "busy" : "healthy", metric: `${openTickets} open tickets`, detail: openTickets > 0 ? "Action required" : "All systems nominal" },
  ];

  return ok({
    property,
    businessDate: property.businessDate,
    kpis,
    statusCounts,
    roomGrid: rooms,
    arrivalsToday: arrivalsToday.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      guestName: `${r.primaryGuest.title} ${r.primaryGuest.firstName} ${r.primaryGuest.lastName}`,
      vip: r.primaryGuest.vipStatus,
      phone: r.primaryGuest.phone,
      category: r.category.name,
      ratePerNight: r.ratePerNight,
      nights: r.totalNights,
      status: r.status,
      bookingSource: r.bookingSource,
      adults: r.adults,
      children: r.children,
      specialRequests: r.specialRequests,
      assignedRoom: r.room?.roomNumber ?? null,
    })),
    departuresToday: departuresToday.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      guestName: `${r.primaryGuest.title} ${r.primaryGuest.firstName} ${r.primaryGuest.lastName}`,
      vip: r.primaryGuest.vipStatus,
      category: r.category.name,
      roomNumber: r.room?.roomNumber ?? null,
      balance: 0,
      nights: r.totalNights,
    })),
    inHouseCount: inHouse.length,
    revenueSeries,
    channelSeries,
    hkSummary,
    hkTasks: hkTasks.slice(0, 8),
    departmentHealth,
    openTickets,
    auditFeed: auditFeed.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      userRole: a.userRole,
      userEmail: a.user_email,
      occurredAt: a.occurredAt,
    })),
    notifications,
  });
});

function endOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}
