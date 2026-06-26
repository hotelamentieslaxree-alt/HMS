// /api/reports — daily revenue summary, occupancy trend, channel production, GST, folio audit
import { db } from "@/lib/db";
import { ok, PROPERTY_ID, calcKPIs, withHandler } from "@/lib/hms";
import { startOfDay, addDays, subDays, format, eachDayOfInterval } from "date-fns";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "daily_revenue";
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const today = startOfDay(new Date());

  const from = fromStr ? new Date(fromStr) : subDays(today, 29);
  const to = toStr ? new Date(toStr) : today;

  if (type === "daily_revenue") {
    return ok(await dailyRevenue(propertyId, from, to));
  }
  if (type === "occupancy") {
    return ok(await occupancyReport(propertyId, from, to));
  }
  if (type === "channel_production") {
    return ok(await channelProduction(propertyId, from, to));
  }
  if (type === "gst") {
    return ok(await gstReport(propertyId, from, to));
  }
  if (type === "folio_audit") {
    return ok(await folioAudit(propertyId, today));
  }
  if (type === "arrivals_departures") {
    return ok(await arrivalsDepartures(propertyId, today));
  }
  if (type === "housekeeping_productivity") {
    return ok(await hkProductivity(propertyId, today));
  }
  if (type === "payment_methods") {
    return ok(await paymentMethods(propertyId, from, to));
  }
  return ok({ error: "Unknown report type" });
});

async function dailyRevenue(propertyId: string, from: Date, to: Date) {
  const folios = await db.folio.findMany({
    where: { reservation: { propertyId }, lines: { some: { postedAt: { gte: from, lte: endOfDay(to) } } } },
    include: { reservation: true, lines: true },
  });
  const byDay: Record<string, any> = {};
  for (const f of folios) {
    for (const l of f.lines) {
      if (l.isVoided) continue;
      if (l.postedAt < from || l.postedAt > endOfDay(to)) continue;
      const day = format(l.postedAt, "yyyy-MM-dd");
      if (!byDay[day]) byDay[day] = { day, room: 0, fb: 0, minibar: 0, laundry: 0, spa: 0, other: 0, tax: 0, total: 0 };
      const amt = l.amount;
      if (l.departmentCode === "ROOM") byDay[day].room += amt;
      else if (l.departmentCode === "FB") byDay[day].fb += amt;
      else if (l.departmentCode === "MINIBAR") byDay[day].minibar += amt;
      else if (l.departmentCode === "LAUNDRY") byDay[day].laundry += amt;
      else if (l.departmentCode === "SPA") byDay[day].spa += amt;
      else if (l.transactionType === "charge") byDay[day].other += amt;
      byDay[day].tax += l.taxAmount;
      if (l.transactionType === "charge") byDay[day].total += amt + l.taxAmount;
    }
  }
  return Object.values(byDay).map((d: any) => ({ ...d, room: Math.round(d.room), fb: Math.round(d.fb), minibar: Math.round(d.minibar), laundry: Math.round(d.laundry), spa: Math.round(d.spa), other: Math.round(d.other), tax: Math.round(d.tax), total: Math.round(d.total) })).sort((a, b) => a.day.localeCompare(b.day));
}

async function occupancyReport(propertyId: string, from: Date, to: Date) {
  const days = eachDayOfInterval({ start: from, end: to });
  const result = [];
  for (const day of days) {
    const start = startOfDay(day);
    const end = endOfDay(day);
    const inHouse = await db.reservation.count({
      where: {
        propertyId, status: "checked_in",
        actualCheckIn: { lte: end },
        OR: [{ actualCheckOut: null }, { actualCheckOut: { gte: start } }],
      },
    });
    // For past days, also include checked_out guests whose stay overlapped that day
    const checkedOut = await db.reservation.count({
      where: {
        propertyId, status: "checked_out",
        actualCheckIn: { lte: end },
        actualCheckOut: { gte: start },
      },
    });
    const totalRooms = await db.room.count({ where: { propertyId } });
    const ooo = await db.room.count({ where: { propertyId, currentStatus: { in: ["out_of_order", "out_of_service"] } } });
    const occupied = inHouse + checkedOut;
    const available = totalRooms - ooo;
    const occRate = available > 0 ? (occupied / available) * 100 : 0;
    result.push({
      day: format(day, "yyyy-MM-dd"),
      occupied, available, totalRooms, ooo,
      occupancyRate: Math.round(occRate * 10) / 10,
    });
  }
  return result;
}

async function channelProduction(propertyId: string, from: Date, to: Date) {
  const reservations = await db.reservation.findMany({
    where: { propertyId, createdAt: { gte: from, lte: endOfDay(to) } },
    select: { bookingSource: true, netRevenue: true, otaCommissionAmount: true, totalNights: true, status: true },
  });
  const byChannel: Record<string, any> = {};
  for (const r of reservations) {
    if (!byChannel[r.bookingSource]) byChannel[r.bookingSource] = { source: r.bookingSource, reservations: 0, roomNights: 0, grossRevenue: 0, commission: 0, netRevenue: 0, cancellations: 0 };
    byChannel[r.bookingSource].reservations++;
    byChannel[r.bookingSource].roomNights += r.totalNights;
    byChannel[r.bookingSource].grossRevenue += r.netRevenue + r.otaCommissionAmount;
    byChannel[r.bookingSource].commission += r.otaCommissionAmount;
    byChannel[r.bookingSource].netRevenue += r.netRevenue;
    if (r.status === "cancelled" || r.status === "no_show") byChannel[r.bookingSource].cancellations++;
  }
  return Object.values(byChannel).map((c: any) => ({ ...c, grossRevenue: Math.round(c.grossRevenue), commission: Math.round(c.commission), netRevenue: Math.round(c.netRevenue) }));
}

async function gstReport(propertyId: string, from: Date, to: Date) {
  const folios = await db.folio.findMany({
    where: { reservation: { propertyId }, lines: { some: { postedAt: { gte: from, lte: endOfDay(to) } } } },
    include: { lines: true, reservation: { include: { primaryGuest: true, company: true } } },
  });
  const gst: Record<string, any> = {
    GST5: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    GST12: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    GST18: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    GST28: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  };
  let grandTaxable = 0, grandTax = 0;
  for (const f of folios) {
    for (const l of f.lines) {
      if (l.isVoided || l.transactionType !== "charge") continue;
      if (l.postedAt < from || l.postedAt > endOfDay(to)) continue;
      const code = l.taxCode || "GST18";
      if (!gst[code]) continue;
      gst[code].taxable += l.amount;
      gst[code].cgst += l.taxAmount / 2;
      gst[code].sgst += l.taxAmount / 2;
      gst[code].total += l.taxAmount;
      grandTaxable += l.amount;
      grandTax += l.taxAmount;
    }
  }
  for (const k of Object.keys(gst)) {
    gst[k].taxable = Math.round(gst[k].taxable);
    gst[k].cgst = Math.round(gst[k].cgst);
    gst[k].sgst = Math.round(gst[k].sgst);
    gst[k].igst = Math.round(gst[k].igst);
    gst[k].total = Math.round(gst[k].total);
  }
  return {
    period: { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") },
    byTaxCode: gst,
    grandTaxable: Math.round(grandTaxable),
    grandTax: Math.round(grandTax),
    grandTotal: Math.round(grandTaxable + grandTax),
  };
}

async function folioAudit(propertyId: string, day: Date) {
  const start = startOfDay(day);
  const end = endOfDay(day);
  const folios = await db.folio.findMany({
    where: { reservation: { propertyId }, createdAt: { gte: start, lte: end } },
    include: { reservation: { include: { primaryGuest: true } }, lines: true, payments: true },
  });
  return {
    day: format(day, "yyyy-MM-dd"),
    count: folios.length,
    open: folios.filter((f) => f.status === "open").length,
    closed: folios.filter((f) => f.status === "closed").length,
    totalCharges: Math.round(folios.reduce((s, f) => s + f.lines.filter((l) => !l.isVoided && l.transactionType === "charge").reduce((a, l) => a + l.amount, 0), 0)),
    totalTax: Math.round(folios.reduce((s, f) => s + f.lines.filter((l) => !l.isVoided && l.transactionType === "charge").reduce((a, l) => a + l.taxAmount, 0), 0)),
    totalPayments: Math.round(folios.reduce((s, f) => s + f.payments.filter((p) => p.status === "completed").reduce((a, p) => a + p.amount, 0), 0)),
    voids: folios.reduce((s, f) => s + f.lines.filter((l) => l.isVoided).length, 0),
  };
}

async function arrivalsDepartures(propertyId: string, day: Date) {
  const start = startOfDay(day);
  const end = endOfDay(day);
  const arrivals = await db.reservation.findMany({
    where: { propertyId, checkInDate: { gte: start, lte: end } },
    include: { primaryGuest: true, category: true, room: true },
  });
  const departures = await db.reservation.findMany({
    where: { propertyId, checkOutDate: { gte: start, lte: end }, status: { in: ["checked_in", "checked_out"] } },
    include: { primaryGuest: true, category: true, room: true },
  });
  const inHouse = await db.reservation.findMany({
    where: { propertyId, status: "checked_in" },
    include: { primaryGuest: true, room: true, category: true },
  });
  return {
    day: format(day, "yyyy-MM-dd"),
    arrivals: arrivals.length, departures: departures.length, inHouse: inHouse.length,
    arrivalsList: arrivals.map((r) => ({
      confirmation: r.confirmationNumber, name: `${r.primaryGuest.firstName} ${r.primaryGuest.lastName}`,
      vip: r.primaryGuest.vipStatus, category: r.category.name, room: r.room?.roomNumber, status: r.status,
    })),
    departuresList: departures.map((r) => ({
      confirmation: r.confirmationNumber, name: `${r.primaryGuest.firstName} ${r.primaryGuest.lastName}`,
      room: r.room?.roomNumber, status: r.status,
    })),
  };
}

async function hkProductivity(propertyId: string, day: Date) {
  const start = startOfDay(day);
  const tasks = await db.housekeepingTask.findMany({
    where: { propertyId, scheduledFor: { gte: start, lt: addDays(start, 1) } },
    include: { assignee: true, room: true },
  });
  const byAttendant: Record<string, any> = {};
  for (const t of tasks) {
    const name = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned";
    if (!byAttendant[name]) byAttendant[name] = { attendant: name, assigned: 0, completed: 0, inspected: 0, avgMinutes: 0, totalTime: 0 };
    byAttendant[name].assigned++;
    if (t.status === "completed" || t.status === "inspected") byAttendant[name].completed++;
    if (t.status === "inspected") byAttendant[name].inspected++;
    if (t.startedAt && t.completedAt) byAttendant[name].totalTime += (t.completedAt.getTime() - t.startedAt.getTime()) / 60000;
  }
  return Object.values(byAttendant).map((a: any) => ({
    ...a,
    avgMinutes: a.completed > 0 ? Math.round(a.totalTime / a.completed) : 0,
    completionRate: a.assigned > 0 ? Math.round((a.completed / a.assigned) * 100) : 0,
  }));
}

async function paymentMethods(propertyId: string, from: Date, to: Date) {
  const payments = await db.payment.findMany({
    where: { folio: { reservation: { propertyId } }, processedAt: { gte: from, lte: endOfDay(to) } },
  });
  const byMethod: Record<string, any> = {};
  for (const p of payments) {
    if (!byMethod[p.paymentMethod]) byMethod[p.paymentMethod] = { method: p.paymentMethod, count: 0, total: 0 };
    byMethod[p.paymentMethod].count++;
    byMethod[p.paymentMethod].total += p.amount;
  }
  return Object.values(byMethod).map((m: any) => ({ ...m, total: Math.round(m.total) }));
}

function endOfDay(d: Date) { const n = new Date(d); n.setHours(23, 59, 59, 999); return n; }
