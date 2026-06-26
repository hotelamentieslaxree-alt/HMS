// ARIA HMS — Seed script
// Populates a luxury hotel property with rooms, guests, reservations,
// F&B outlets/menu, housekeeping tasks, rates, staff, and audit logs.
// Run: bun run db:seed

import { PrismaClient } from "@prisma/client";
import { addDays, addHours, startOfDay, subDays, format } from "date-fns";

const db = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

async function main() {
  console.log("🌱 Seeding ARIA HMS...");

  // Clean slate
  await db.$transaction([
    db.nightAuditLog.deleteMany(),
    db.shiftHandover.deleteMany(),
    db.notification.deleteMany(),
    db.auditLog.deleteMany(),
    db.maintenanceTicket.deleteMany(),
    db.posOrderLine.deleteMany(),
    db.posOrder.deleteMany(),
    db.menuItem.deleteMany(),
    db.menuCategory.deleteMany(),
    db.restaurantTable.deleteMany(),
    db.outlet.deleteMany(),
    db.lostFound.deleteMany(),
    db.housekeepingTask.deleteMany(),
    db.payment.deleteMany(),
    db.folioLine.deleteMany(),
    db.folio.deleteMany(),
    db.reservation.deleteMany(),
    db.company.deleteMany(),
    db.guest.deleteMany(),
    db.roomStatusLog.deleteMany(),
    db.ratePlan.deleteMany(),
    db.room.deleteMany(),
    db.roomCategory.deleteMany(),
    db.user.deleteMany(),
    db.department.deleteMany(),
    db.property.deleteMany(),
  ]);

  // ── Property ──────────────────────────────────────────────
  const property = await db.property.create({
    data: {
      name: "The Aurelian Grand",
      code: "AUR",
      city: "Mumbai",
      state: "Maharashtra",
      country: "IN",
      timezone: "Asia/Calcutta",
      currency: "INR",
      starRating: 5,
      totalRooms: 80,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      gstNumber: "27AABCA1234L1Z5",
      taxId: "AABCA1234L",
      businessDate: startOfDay(new Date()),
    },
  });

  // ── Departments ───────────────────────────────────────────
  const departments = await Promise.all(
    [
      { name: "Front Office", code: "FO" },
      { name: "Housekeeping", code: "HK" },
      { name: "Food & Beverage", code: "FB" },
      { name: "Engineering", code: "ENG" },
      { name: "Human Resources", code: "HR" },
      { name: "Finance", code: "FIN" },
      { name: "Security", code: "SEC" },
    ].map((d) =>
      db.department.create({ data: { ...d, propertyId: property.id } })
    )
  );
  const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));

  // ── Staff / Users ─────────────────────────────────────────
  const staffSeeds = [
    { first: "Vikram", last: "Mehta", role: "owner", level: 1, dept: null, email: "vikram.mehta@aurelian.com", code: "OWNER" },
    { first: "Anita", last: "Rao", role: "gm", level: 2, dept: null, email: "anita.rao@aurelian.com", code: "GM001" },
    { first: "Rajesh", last: "Iyer", role: "fom", level: 3, dept: "FO", email: "rajesh.iyer@aurelian.com", code: "FOM01" },
    { first: "Priya", last: "Nair", role: "hk_mgr", level: 3, dept: "HK", email: "priya.nair@aurelian.com", code: "HKM01" },
    { first: "Sanjay", last: "Kapoor", role: "fb_mgr", level: 3, dept: "FB", email: "sanjay.kapoor@aurelian.com", code: "FBM01" },
    { first: "Meera", last: "Joshi", role: "rev_mgr", level: 3, dept: "FO", email: "meera.joshi@aurelian.com", code: "REV01" },
    { first: "Arvind", last: "Shetty", role: "fin_mgr", level: 3, dept: "FIN", email: "arvind.shetty@aurelian.com", code: "FIN01" },
    { first: "Deepak", last: "Reddy", role: "eng_mgr", level: 3, dept: "ENG", email: "deepak.reddy@aurelian.com", code: "ENG01" },
    { first: "Sunita", last: "Pillai", role: "hr_mgr", level: 3, dept: "HR", email: "sunita.pillai@aurelian.com", code: "HRM01" },
    { first: "Karthik", last: "Subram", role: "receptionist", level: 4, dept: "FO", email: "karthik.s@aurelian.com", code: "FOS01" },
    { first: "Neha", last: "Gupta", role: "receptionist", level: 4, dept: "FO", email: "neha.gupta@aurelian.com", code: "FOS02" },
    { first: "Lakshmi", last: "Devi", role: "hk_attendant", level: 4, dept: "HK", email: "lakshmi.d@aurelian.com", code: "HKS01" },
    { first: "Mohammed", last: "Ali", role: "hk_attendant", level: 4, dept: "HK", email: "mohammed.a@aurelian.com", code: "HKS02" },
    { first: "Ravi", last: "Kumar", role: "waiter", level: 4, dept: "FB", email: "ravi.k@aurelian.com", code: "FBS01" },
    { first: "Fatima", last: "Sheikh", role: "waiter", level: 4, dept: "FB", email: "fatima.s@aurelian.com", code: "FBS02" },
    { first: "Imran", last: "Khan", role: "technician", level: 4, dept: "ENG", email: "imran.k@aurelian.com", code: "ENG02" },
  ];

  const users = await Promise.all(
    staffSeeds.map((s) =>
      db.user.create({
        data: {
          propertyId: property.id,
          email: s.email,
          firstName: s.first,
          lastName: s.last,
          role: s.role,
          roleLevel: s.level,
          departmentId: s.dept ? deptByCode[s.dept].id : null,
          employeeCode: s.code,
          phone: `+91 98${randInt(10000000, 99999999)}`,
          avatarUrl: null,
        },
      })
    )
  );
  const userByRole = Object.fromEntries(users.map((u) => [u.role, u]));
  const hkAttendants = users.filter((u) => u.role === "hk_attendant");
  const waiters = users.filter((u) => u.role === "waiter");
  const receptionists = users.filter((u) => u.role === "receptionist");

  // ── Room Categories ───────────────────────────────────────
  const categories = await Promise.all(
    [
      { name: "Deluxe King", code: "DLK", maxAdults: 2, maxChildren: 1, baseRate: 8500, amenities: ["King bed","Free WiFi","Rain shower","Smart TV","City view","Mini bar"] },
      { name: "Deluxe Twin", code: "DLT", maxAdults: 2, maxChildren: 1, baseRate: 8500, amenities: ["Twin beds","Free WiFi","Rain shower","Smart TV","City view","Mini bar"] },
      { name: "Premier Suite", code: "PRS", maxAdults: 3, maxChildren: 2, baseRate: 16500, amenities: ["King bed","Living room","Free WiFi","Bathtub","Espresso machine","Lounge access","Sea view"] },
      { name: "Executive Club", code: "EXC", maxAdults: 2, maxChildren: 1, baseRate: 12500, amenities: ["King bed","Club lounge access","Free WiFi","Rain shower","Espresso machine","Evening cocktails"] },
      { name: "Presidential Suite", code: "PSC", maxAdults: 4, maxChildren: 2, baseRate: 45000, amenities: ["2 bedrooms","Private terrace","Butler service","Jacuzzi","Dining room","Panoramic view","Private bar"] },
    ].map((c) =>
      db.roomCategory.create({
        data: {
          propertyId: property.id,
          name: c.name,
          code: c.code,
          maxAdults: c.maxAdults,
          maxChildren: c.maxChildren,
          baseRate: c.baseRate,
          amenities: JSON.stringify(c.amenities),
        },
      })
    )
  );
  const catByCode = Object.fromEntries(categories.map((c) => [c.code, c]));

  // ── Rooms (floors 1–8) ────────────────────────────────────
  const roomStatuses = ["vacant_clean","vacant_dirty","occupied_clean","occupied_dirty","vacant_clean","vacant_clean","occupied_clean","vacant_clean","out_of_order"];
  const rooms: any[] = [];
  for (let floor = 1; floor <= 8; floor++) {
    for (let n = 1; n <= 10; n++) {
      const roomNumber = `${floor}${n.toString().padStart(2, "0")}`;
      // Distribute categories by floor
      let code = "DLK";
      if (n >= 8) code = "EXC";
      if (floor === 8 && n === 10) code = "PSC";
      if (floor === 8 && (n === 7 || n === 8 || n === 9)) code = "PRS";
      if (n === 9) code = floor % 2 === 0 ? "DLT" : "DLK";
      const isAccessible = floor === 1 && n <= 2;
      const status = roomStatuses[(floor + n) % roomStatuses.length];
      const room = await db.room.create({
        data: {
          propertyId: property.id,
          categoryId: catByCode[code].id,
          roomNumber,
          floor,
          wing: floor <= 4 ? "West" : "East",
          currentStatus: status,
          isSmoking: false,
          isAccessible,
        },
      });
      rooms.push(room);
    }
  }
  // Block one room
  await db.room.update({
    where: { id: rooms[14].id },
    data: { currentStatus: "out_of_order", blockedReason: "AC compressor replacement", blockedUntil: addDays(new Date(), 2) },
  });

  // ── Rate Plans ────────────────────────────────────────────
  const ratePlans = await Promise.all(
    [
      { name: "Best Available Rate", code: "BAR", mealPlan: "ep", refundable: true, markup: 0 },
      { name: "Bed & Breakfast", code: "BB", mealPlan: "cp", refundable: true, markup: 1200 },
      { name: "Half Board", code: "MAP", mealPlan: "map", refundable: true, markup: 2800 },
      { name: "Non-Refundable Saver", code: "NRF", mealPlan: "ep", refundable: false, markup: -800 },
      { name: "Corporate Negotiated", code: "CORP", mealPlan: "cp", refundable: true, markup: 600 },
      { name: "Weekend Getaway", code: "WKND", mealPlan: "map", refundable: true, markup: 1800 },
    ].map((rp) =>
      db.ratePlan.create({
        data: {
          propertyId: property.id,
          name: rp.name,
          code: rp.code,
          mealPlan: rp.mealPlan,
          isRefundable: rp.refundable,
          advancePurchaseDays: rp.code === "NRF" ? 7 : 0,
          minStayNights: rp.code === "WKND" ? 2 : 1,
          maxStayNights: 30,
          validFrom: subDays(new Date(), 30),
          validTo: addDays(new Date(), 365),
          markupPercent: rp.markup,
          categories: { connect: categories.map((c) => ({ id: c.id })) },
        },
      })
    )
  );
  const rpByCode = Object.fromEntries(ratePlans.map((r) => [r.code, r]));

  // ── Companies ─────────────────────────────────────────────
  const companies = await Promise.all(
    [
      { name: "Tata Consultancy Services", gst: "27AAACT2727Q1ZW", terms: "Net 30", credit: 500000, rate: 11000 },
      { name: "Infosys Limited", gst: "29AAACI4799L1ZB", terms: "Net 45", credit: 750000, rate: 11500 },
      { name: "Reliance Industries", gst: "27AAACR5055K1Z5", terms: "Net 30", credit: 1000000, rate: 12000 },
      { name: "HDFC Bank", gst: "27AAACH2702H1Z5", terms: "Net 15", credit: 400000, rate: 10000 },
    ].map((c) =>
      db.company.create({
        data: {
          name: c.name,
          gstNumber: c.gst,
          address: "Mumbai, Maharashtra",
          creditLimit: c.credit,
          paymentTerms: c.terms,
          negotiatedRate: c.rate,
          contactName: "Travel Desk",
          contactEmail: "travel@" + c.name.split(" ")[0].toLowerCase() + ".com",
        },
      })
    )
  );

  // ── Guests ────────────────────────────────────────────────
  const firstNames = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rohan","Ananya","Diya","Saanvi","Aadhya","Pari","Myra","Riya","Sara","Anika","Kiara","James","Emily","Michael","Sophia","Daniel","Olivia","David","Emma","John","Sarah","Chen","Wei","Yuki","Tanaka","Hiroshi","Mei","Lin","Fatima","Omar","Hassan","Aisha","Yusuf","Layla","Ibrahim","Noor"];
  const lastNames = ["Sharma","Verma","Patel","Reddy","Nair","Iyer","Kapoor","Malhotra","Chopra","Gupta","Joshi","Mehta","Rao","Kumar","Singh","Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Wilson","Anderson","Taylor","Thomas","Lee","Wang","Liu","Suzuki","Tanaka","Kim","Park","Khan","Sheikh","Ali","Hassan","Rahman","Patel","Shah","Desai"];
  const nationalities = ["IN","IN","IN","IN","US","GB","AE","SG","JP","AU","DE","FR","CA"];
  const titles = ["Mr","Mrs","Ms","Dr","Prof"];
  const tiers = ["silver","silver","silver","gold","gold","platinum","none","silver","gold","silver"];

  const guests: any[] = [];
  for (let i = 0; i < 120; i++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const nat = pick(nationalities);
    const g = await db.guest.create({
      data: {
        title: pick(titles),
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g,"")}${randInt(1,99)}@example.com`,
        phone: `+91 9${randInt(100000000, 999999999)}`,
        nationality: nat,
        idType: nat === "IN" ? pick(["aadhaar","driving_license","passport"]) : "passport",
        idNumber: uid("ID"),
        address: `${randInt(1,200)}, Bandra West, Mumbai`,
        city: "Mumbai",
        state: "Maharashtra",
        country: "IN",
        loyaltyTier: pick(tiers),
        loyaltyPoints: randInt(0, 25000),
        preferences: JSON.stringify({
          floor: pick(["high","low","any"]),
          pillow: pick(["soft","firm"]),
          dietary: pick(["none","vegetarian","vegan","jain"]),
          newspaper: pick(["none","Times of India","Economic Times"]),
        }),
        vipStatus: Math.random() < 0.12,
        totalStays: randInt(1, 24),
        totalRevenue: randInt(15000, 850000),
      },
    });
    guests.push(g);
  }

  // ── Reservations (spread across past/today/future) ────────
  const sources = ["direct","direct","direct","booking_com","expedia","makemytrip","goibibo","corporate","walk_in","phone"];
  const today = startOfDay(new Date());
  let confCounter = 1000;

  const reservationDates: { offset: number; status: string }[] = [
    ...Array.from({ length: 8 }, () => ({ offset: -randInt(2, 10), status: "checked_out" })),
    ...Array.from({ length: 18 }, () => ({ offset: 0, status: pick(["checked_in","confirmed","confirmed","checked_in"]) })),
    ...Array.from({ length: 4 }, () => ({ offset: 0, status: pick(["cancelled","no_show"]) })),
    ...Array.from({ length: 22 }, () => ({ offset: randInt(1, 14), status: "confirmed" })),
    ...Array.from({ length: 3 }, () => ({ offset: randInt(1, 14), status: "tentative" })),
  ];

  for (const r of reservationDates) {
    const guest = pick(guests);
    const cat = pick(categories);
    const nights = r.status === "checked_out" ? randInt(1, 4) : randInt(1, 5);
    const checkIn = addDays(today, r.offset);
    const checkOut = addDays(checkIn, nights);
    const rp = pick(ratePlans);
    const source = pick(sources);
    const rate = cat.baseRate + rp.markupPercent;
    const adults = randInt(1, cat.maxAdults);
    const children = randInt(0, cat.maxChildren);
    const otaPct = source === "direct" || source === "corporate" || source === "walk_in" || source === "phone" ? 0 : pick([10,12.5,15,18,20]);
    const grossRevenue = rate * nights;
    const otaCommissionAmount = Math.round((grossRevenue * otaPct) / 100);
    const netRevenue = grossRevenue - otaCommissionAmount;
    const company = source === "corporate" ? pick(companies) : null;
    const confirmationNumber = `AUR-${++confCounter}`;

    // Assign a room if checked-in or checked-out
    let assignedRoom: any = null;
    if (r.status === "checked_in" || r.status === "checked_out") {
      assignedRoom = rooms.find((rm) => rm.categoryId === cat.id && (rm.currentStatus === "occupied_clean" || rm.currentStatus === "occupied_dirty"));
      if (!assignedRoom) assignedRoom = pick(rooms.filter((rm) => rm.categoryId === cat.id));
    }

    const actualCheckIn = r.status === "checked_in" || r.status === "checked_out" ? addHours(checkIn, randInt(13, 22)) : null;
    const actualCheckOut = r.status === "checked_out" ? addHours(checkOut, randInt(8, 12)) : null;

    const reservation = await db.reservation.create({
      data: {
        propertyId: property.id,
        confirmationNumber,
        bookingSource: source,
        status: r.status,
        primaryGuestId: guest.id,
        companyId: company?.id ?? null,
        categoryId: cat.id,
        roomId: assignedRoom?.id ?? null,
        ratePlanId: rp.id,
        ratePerNight: rate,
        totalNights: nights,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        actualCheckIn,
        actualCheckOut,
        adults,
        children,
        infants: 0,
        specialRequests: pick(["High floor please","Quiet room","Late check-in","Anniversary stay","Baby cot required",""]),
        internalNotes: Math.random() < 0.2 ? "VIP guest — inform GM on arrival" : null,
        otaCommissionPercent: otaPct,
        otaCommissionAmount,
        netRevenue,
        depositAmount: source === "direct" ? Math.round(grossRevenue * 0.2) : 0,
        cancellationReason: r.status === "cancelled" ? "Guest changed travel plans" : r.status === "no_show" ? "Did not arrive" : null,
        cancelledAt: r.status === "cancelled" || r.status === "no_show" ? addHours(checkIn, 10) : null,
        cancelledBy: r.status === "cancelled" || r.status === "no_show" ? userByRole.fom.id : null,
      },
    });

    // Folio for checked-in / checked-out
    if (r.status === "checked_in" || r.status === "checked_out") {
      const roomCharges = rate * nights;
      const taxAmount = Math.round(roomCharges * 0.12);
      // Extra charges (F&B, minibar)
      const fbCharge = randInt(0, 1) === 1 ? randInt(800, 4500) : 0;
      const minibarCharge = randInt(0, 1) === 1 ? randInt(250, 1200) : 0;
      const laundryCharge = randInt(0, 1) === 1 ? randInt(400, 1800) : 0;
      const subtotal = roomCharges + fbCharge + minibarCharge + laundryCharge;
      const totalTax = taxAmount + Math.round((fbCharge + minibarCharge + laundryCharge) * 0.05);
      const total = subtotal + totalTax;

      const folio = await db.folio.create({
        data: {
          reservationId: reservation.id,
          folioNumber: `F-${confirmationNumber}`,
          folioType: "room",
          status: r.status === "checked_out" ? "closed" : "open",
          subtotal,
          taxAmount: totalTax,
          totalAmount: total,
          paidAmount: r.status === "checked_out" ? total : Math.round(total * 0.3),
          balance: r.status === "checked_out" ? 0 : total - Math.round(total * 0.3),
          closedAt: r.status === "checked_out" ? actualCheckOut : null,
          closedBy: r.status === "checked_out" ? userByRole.receptionist[0]?.id ?? userByRole.fom.id : null,
        },
      });

      await db.folioLine.createMany({
        data: [
          { folioId: folio.id, transactionType: "charge", description: `Room charge — ${cat.name} × ${nights} nights`, amount: roomCharges, taxCode: "GST12", taxAmount, departmentCode: "ROOM", postedBy: userByRole.fom.id, referenceType: "room_rate" },
          ...(fbCharge ? [{ folioId: folio.id, transactionType: "charge" as const, description: "F&B — The Saffron Restaurant", amount: fbCharge, taxCode: "GST5", taxAmount: Math.round(fbCharge*0.05), departmentCode: "FB", outletCode: "SAF", postedBy: userByRole.fb_mgr.id, referenceType: "pos_order" }] : []),
          ...(minibarCharge ? [{ folioId: folio.id, transactionType: "charge" as const, description: "Minibar consumption", amount: minibarCharge, taxCode: "GST5", taxAmount: Math.round(minibarCharge*0.05), departmentCode: "MINIBAR", postedBy: userByRole.hk_mgr.id, referenceType: "minibar" }] : []),
          ...(laundryCharge ? [{ folioId: folio.id, transactionType: "charge" as const, description: "Laundry service", amount: laundryCharge, taxCode: "GST18", taxAmount: Math.round(laundryCharge*0.18), departmentCode: "LAUNDRY", postedBy: userByRole.hk_mgr.id, referenceType: "manual" }] : []),
        ],
      });

      if (folio.paidAmount > 0) {
        await db.payment.create({
          data: {
            folioId: folio.id,
            amount: folio.paidAmount,
            paymentMethod: pick(["credit_card","upi","cash","debit_card"]),
            cardLast4: randInt(1000,9999).toString(),
            cardType: pick(["Visa","Mastercard","Amex"]),
            status: "completed",
            processedBy: userByRole.receptionist[0]?.id ?? userByRole.fom.id,
            paymentReference: uid("PAY"),
          },
        });
      }
    }

    // If checked-in, update room status to occupied
    if (r.status === "checked_in" && assignedRoom) {
      await db.room.update({
        where: { id: assignedRoom.id },
        data: { currentStatus: "occupied_clean" },
      });
    }
    if (r.status === "checked_out" && assignedRoom) {
      await db.room.update({
        where: { id: assignedRoom.id },
        data: { currentStatus: "vacant_dirty" },
      });
    }
  }

  // ── Housekeeping tasks ────────────────────────────────────
  const hkTypes = ["checkout_cleaning","stayover","turndown","deep_clean","inspection"];
  const hkPriorities = ["urgent","high","normal","normal","low"];
  const dirtyOrOccRooms = rooms.filter((r) => ["vacant_dirty","occupied_dirty","occupied_clean"].includes(r.currentStatus));
  for (let i = 0; i < 24; i++) {
    const room = pick(dirtyOrOccRooms.length ? dirtyOrOccRooms : rooms);
    const taskType = room.currentStatus === "vacant_dirty" ? "checkout_cleaning" : pick(hkTypes);
    const status = pick(["pending","in_progress","completed","completed","inspected"]);
    await db.housekeepingTask.create({
      data: {
        propertyId: property.id,
        roomId: room.id,
        taskType,
        assignedToId: pick(hkAttendants).id,
        priority: pick(hkPriorities),
        status,
        scheduledFor: today,
        startedAt: status !== "pending" ? addHours(new Date(), -randInt(1,4)) : null,
        completedAt: status === "completed" || status === "inspected" ? addHours(new Date(), -randInt(0,3)) : null,
        inspectedById: status === "inspected" ? userByRole.hk_mgr.id : null,
        inspectedAt: status === "inspected" ? addHours(new Date(), -randInt(0,2)) : null,
        checklist: JSON.stringify([
          { item: "Bed linen changed", done: true },
          { item: "Bathroom sanitized", done: true },
          { item: "Towels replaced", done: status !== "pending" },
          { item: "Amenities restocked", done: status !== "pending" },
          { item: "Floor vacuumed", done: status === "completed" || status === "inspected" },
          { item: "Minibar checked", done: status === "completed" || status === "inspected" },
        ]),
        notes: pick(["","Guest requested extra pillows","VIP room — champagne setup",""]),
      },
    });
  }

  // ── Outlets & Menu ────────────────────────────────────────
  const outletData = [
    { name: "The Saffron", code: "SAF", type: "restaurant", tables: 16 },
    { name: "Skyline Bar", code: "SKY", type: "bar", tables: 12 },
    { name: "Atrium Café", code: "ATR", type: "cafe", tables: 8 },
    { name: "24h In-Room Dining", code: "IRD", type: "room_service", tables: 0 },
    { name: "Poolside Grill", code: "POOL", type: "pool_bar", tables: 10 },
  ];
  const outlets: any[] = [];
  for (const o of outletData) {
    const outlet = await db.outlet.create({
      data: { propertyId: property.id, name: o.name, code: o.code, type: o.type, tableCount: o.tables },
    });
    outlets.push(outlet);
    // Tables
    for (let t = 1; t <= o.tables; t++) {
      await db.restaurantTable.create({
        data: {
          outletId: outlet.id,
          tableNumber: `T${t}`,
          capacity: pick([2, 2, 4, 4, 4, 6, 8]),
          status: pick(["available","available","available","occupied","reserved"]),
          section: o.tables > 12 ? pick(["Window","Center","Patio"]) : null,
        },
      });
    }
  }
  const restaurantOutlet = outlets.find((o) => o.code === "SAF")!;
  const barOutlet = outlets.find((o) => o.code === "SKY")!;
  const cafeOutlet = outlets.find((o) => o.code === "ATR")!;

  const menuData: { outlet: any; categories: { name: string; items: { name: string; desc?: string; price: number; type: string; diet: string; time?: number; featured?: boolean }[] }[] }[] = [
    {
      outlet: restaurantOutlet,
      categories: [
        { name: "Breakfast", items: [
          { name: "Masala Dosa", desc: "Crispy rice crepe, spiced potato, sambar, chutney", price: 380, type: "food", diet: "veg", time: 12, featured: true },
          { name: "Eggs Benedict", desc: "Poached eggs, hollandaise, English muffin", price: 520, type: "food", diet: "contains_egg", time: 15 },
          { name: "Avocado Toast", desc: "Sourdough, smashed avocado, chili flakes", price: 480, type: "food", diet: "veg", time: 10 },
          { name: "Idli Sambar", desc: "Steamed rice cakes, lentil broth", price: 280, type: "food", diet: "veg", time: 10 },
          { name: "Fresh Fruit Platter", desc: "Seasonal fruits with honey yogurt", price: 340, type: "food", diet: "veg", time: 8 },
        ]},
        { name: "Starters", items: [
          { name: "Paneer Tikka", desc: "Char-grilled cottage cheese, mint chutney", price: 560, type: "food", diet: "veg", time: 18, featured: true },
          { name: "Tandoori Prawns", desc: "Clay oven prawns, ajwain, lemon", price: 780, type: "food", diet: "non_veg", time: 20 },
          { name: "Burrata & Heirloom Tomato", desc: "Burrata, basil oil, balsamic pearls", price: 720, type: "food", diet: "veg", time: 12 },
          { name: "Crispy Corn Kernels", desc: "Spiced fried corn, curry leaves", price: 420, type: "food", diet: "veg", time: 14 },
        ]},
        { name: "Mains", items: [
          { name: "Butter Chicken", desc: "Tandoor chicken, tomato cream curry", price: 720, type: "food", diet: "non_veg", time: 22, featured: true },
          { name: "Dal Makhani", desc: "Black lentils, butter, slow-cooked overnight", price: 480, type: "food", diet: "veg", time: 15 },
          { name: "Grilled Sea Bass", desc: "Mediterranean vegetables, lemon butter", price: 1240, type: "food", diet: "non_veg", time: 25 },
          { name: "Wild Mushroom Risotto", desc: "Arborio rice, parmesan, truffle oil", price: 780, type: "food", diet: "veg", time: 22 },
          { name: "Lamb Rogan Josh", desc: "Kashmiri lamb curry, aromatic spices", price: 980, type: "food", diet: "non_veg", time: 28 },
        ]},
        { name: "Desserts", items: [
          { name: "Gulab Jamun", desc: "Warm milk dumplings, saffron syrup", price: 320, type: "food", diet: "veg", time: 8, featured: true },
          { name: "Molten Chocolate Lava Cake", desc: "Vanilla ice cream, berry compote", price: 420, type: "food", diet: "veg", time: 12 },
          { name: "Tiramisu", desc: "Coffee mascarpone, cocoa", price: 380, type: "food", diet: "contains_egg", time: 6 },
        ]},
      ],
    },
    {
      outlet: barOutlet,
      categories: [
        { name: "Signature Cocktails", items: [
          { name: "Aurelian Martini", desc: "Gin, elderflower, cucumber, lime", price: 680, type: "beverage", diet: "contains_alcohol", time: 6, featured: true },
          { name: "Mumbai Mule", desc: "Vodka, ginger beer, mint, lime", price: 620, type: "beverage", diet: "contains_alcohol", time: 5 },
          { name: "Saffron Sour", desc: "Bourbon, saffron, lemon, egg white", price: 720, type: "beverage", diet: "contains_alcohol", time: 7 },
        ]},
        { name: "Wine by Glass", items: [
          { name: "Sauvignon Blanc", desc: "Crisp, citrus, Marlborough NZ", price: 540, type: "beverage", diet: "contains_alcohol", time: 3 },
          { name: "Shiraz", desc: "Full-bodied, dark fruit, Australia", price: 580, type: "beverage", diet: "contains_alcohol", time: 3 },
          { name: "Prosecco", desc: "Sparkling, Veneto Italy", price: 520, type: "beverage", diet: "contains_alcohol", time: 3 },
        ]},
        { name: "Bar Bites", items: [
          { name: "Truffle Fries", desc: "Parmesan, truffle oil, herbs", price: 380, type: "food", diet: "veg", time: 10, featured: true },
          { name: "Chicken Satay", desc: "Skewers, peanut sauce, pickled cucumber", price: 520, type: "food", diet: "non_veg", time: 14 },
          { name: "Loaded Nachos", desc: "Cheese, jalapeños, salsa, guacamole", price: 460, type: "food", diet: "veg", time: 12 },
        ]},
      ],
    },
    {
      outlet: cafeOutlet,
      categories: [
        { name: "Coffee", items: [
          { name: "Single Origin Espresso", desc: "Arabica blend, Coorg", price: 180, type: "beverage", diet: "veg", time: 4, featured: true },
          { name: "Cappuccino", desc: "Double shot, steamed milk, foam", price: 220, type: "beverage", diet: "veg", time: 5 },
          { name: "Cold Brew", desc: "18-hour steep, smooth", price: 260, type: "beverage", diet: "veg", time: 4 },
          { name: "Masala Chai", desc: "Spiced Assam tea, milk", price: 140, type: "beverage", diet: "veg", time: 5 },
        ]},
        { name: "Bakery", items: [
          { name: "Almond Croissant", desc: "Buttery, almond cream, toasted", price: 280, type: "food", diet: "veg", time: 3, featured: true },
          { name: "Blueberry Muffin", desc: "Fresh blueberries, vanilla", price: 220, type: "food", diet: "veg", time: 3 },
          { name: "Avocado Toast", desc: "Sourdough, chili flakes, lime", price: 380, type: "food", diet: "veg", time: 8 },
        ]},
      ],
    },
  ];

  for (const od of menuData) {
    for (let ci = 0; ci < od.categories.length; ci++) {
      const c = od.categories[ci];
      const cat = await db.menuCategory.create({
        data: { outletId: od.outlet.id, name: c.name, sortOrder: ci, mealPeriod: JSON.stringify([]) },
      });
      for (const it of c.items) {
        await db.menuItem.create({
          data: {
            categoryId: cat.id,
            name: it.name,
            description: it.desc,
            price: it.price,
            itemType: it.type,
            dietType: it.diet,
            allergens: JSON.stringify([]),
            preparationTimeMinutes: it.time ?? 12,
            isAvailable: true,
            isFeatured: it.featured ?? false,
            recipeCost: Math.round(it.price * 0.35),
          },
        });
      }
    }
  }

  // ── A few POS orders ──────────────────────────────────────
  const restaurantTables = await db.restaurantTable.findMany({ where: { outletId: restaurantOutlet.id } });
  const restaurantMenu = await db.menuItem.findMany({
    where: { category: { outletId: restaurantOutlet.id } },
  });
  for (let i = 0; i < 8; i++) {
    const table = pick(restaurantTables);
    const status = pick(["draft","sent_to_kitchen","in_preparation","ready","served","billed","paid","void"]);
    const numItems = randInt(2, 5);
    const chosen = Array.from({ length: numItems }, () => pick(restaurantMenu));
    let subtotal = 0;
    const order = await db.posOrder.create({
      data: {
        outletId: restaurantOutlet.id,
        tableId: table.id,
        orderType: "dine_in",
        status,
        waiterId: pick(waiters).id,
        guestsCount: randInt(1, 4),
        notes: pick(["","No spice","Tableside service",""]),
        kotNumber: status !== "draft" ? randInt(1001, 1099) : null,
        billedAt: ["billed","paid"].includes(status) ? addHours(new Date(), -randInt(0,2)) : null,
        paidAt: status === "paid" ? addHours(new Date(), -randInt(0,1)) : null,
      },
    });
    for (const item of chosen) {
      const qty = randInt(1, 3);
      subtotal += item.price * qty;
      await db.posOrderLine.create({
        data: {
          orderId: order.id,
          itemId: item.id,
          quantity: qty,
          unitPrice: item.price,
          status: ["draft","sent_to_kitchen"].includes(status) ? "pending" : "served",
        },
      });
    }
    const tax = Math.round(subtotal * 0.05);
    await db.posOrder.update({
      where: { id: order.id },
      data: { subtotal, taxAmount: tax, totalAmount: subtotal + tax },
    });
  }

  // ── Maintenance tickets ───────────────────────────────────
  const maintTickets = [
    { title: "AC not cooling in room 305", category: "hvac", priority: "high", room: rooms[34] },
    { title: "Leaking faucet — room 412", category: "plumbing", priority: "normal", room: rooms[51] },
    { title: "Replace corridor lights floor 6", category: "electrical", priority: "low", room: null },
    { title: "Elevator 2 making noise", category: "electrical", priority: "urgent", room: null },
    { title: "TV remote not working room 208", category: "av", priority: "low", room: rooms[17] },
  ];
  for (const t of maintTickets) {
    await db.maintenanceTicket.create({
      data: {
        propertyId: property.id,
        roomId: t.room?.id ?? null,
        title: t.title,
        description: "Reported by Front Office",
        priority: t.priority,
        status: pick(["open","in_progress","completed"]),
        category: t.category,
        raisedBy: userByRole.fom.id,
        assignedTo: userByRole.technician?.id ?? userByRole.eng_mgr.id,
        completedAt: Math.random() < 0.3 ? addHours(new Date(), -randInt(1, 24)) : null,
      },
    });
  }

  // ── Audit logs ────────────────────────────────────────────
  const rec1 = receptionists[0] ?? userByRole.fom;
  const auditActions = [
    { action: "LOGIN", entity: "auth", by: userByRole.fom },
    { action: "RESERVATION_CREATED", entity: "reservation", by: rec1 },
    { action: "CHECKIN", entity: "reservation", by: rec1 },
    { action: "RATE_OVERRIDE", entity: "rate_plan", by: userByRole.rev_mgr },
    { action: "ROOM_STATUS_CHANGED", entity: "room", by: userByRole.hk_mgr },
    { action: "PAYMENT_PROCESSED", entity: "payment", by: rec1 },
    { action: "VOID_LINE", entity: "folio_line", by: userByRole.fom },
    { action: "CHECKOUT", entity: "reservation", by: rec1 },
    { action: "DISCOUNT_APPLIED", entity: "folio", by: userByRole.fom },
    { action: "HK_TASK_ASSIGNED", entity: "housekeeping_task", by: userByRole.hk_mgr },
    { action: "MENU_PRICE_UPDATED", entity: "menu_item", by: userByRole.fb_mgr },
    { action: "LOGIN", entity: "auth", by: userByRole.gm },
  ];
  for (let i = 0; i < 40; i++) {
    const a = pick(auditActions);
    await db.auditLog.create({
      data: {
        propertyId: property.id,
        userId: a.by.id,
        userRole: a.by.role,
        user_email: a.by.email,
        action: a.action,
        entityType: a.entity,
        entityId: uid("E"),
        oldValue: Math.random() < 0.5 ? JSON.stringify({ value: pick([1,2,3]) }) : null,
        newValue: JSON.stringify({ value: pick([4,5,6]) }),
        ipAddress: `192.168.1.${randInt(2, 254)}`,
        occurredAt: addHours(new Date(), -randInt(0, 72)),
      },
    });
  }

  // ── Notifications ─────────────────────────────────────────
  const notifs = [
    { type: "approval", title: "Rate override needs approval", message: "Front Office requested 25% discount on BAR for reservation AUR-1056" },
    { type: "alert", title: "VIP arrival in 2 hours", message: "Mr. James Smith (Platinum) arriving — Premier Suite 807" },
    { type: "warning", title: "Room 305 AC issue", message: "Maintenance ticket raised — guest requested room change" },
    { type: "info", title: "Night audit pending", message: "Today's night audit has not been initiated yet" },
    { type: "success", title: "Channel sync complete", message: "Booking.com inventory synced — 80 rooms pushed" },
    { type: "alert", title: "Low minibar stock", message: "Floor 3 minibar cart below 30% stock" },
  ];
  for (const n of notifs) {
    await db.notification.create({
      data: { propertyId: property.id, type: n.type, title: n.title, message: n.message, isRead: Math.random() < 0.3 },
    });
  }

  // ── Shift handover ────────────────────────────────────────
  await db.shiftHandover.create({
    data: {
      propertyId: property.id,
      fromUser: userByRole.fom.id,
      toUser: userByRole.fom.id,
      shift: "morning",
      notes: "Morning shift smooth. 14 arrivals, 9 departures processed. Room 305 AC issue escalated to engineering. Corporate booking for TCS — 8 rooms block for next week.",
      openIssues: "VIP arrival James Smith at 4 PM — Premier Suite prep in progress",
    },
  });

  // ── Past night audit logs ─────────────────────────────────
  for (let d = 1; d <= 3; d++) {
    await db.nightAuditLog.create({
      data: {
        propertyId: property.id,
        businessDate: subDays(today, d),
        status: "completed",
        startedAt: subDays(addHours(today, 23), d),
        completedAt: subDays(addHours(today, 23.5), d),
        startedBy: userByRole.fom.id,
        postingsCount: randInt(28, 42),
        revenuePosted: randInt(285000, 425000),
      },
    });
  }

  console.log(`✅ Seeded complete.`);
  console.log(`   Property: ${property.name}`);
  console.log(`   Rooms: ${rooms.length}`);
  console.log(`   Staff: ${users.length}`);
  console.log(`   Guests: ${guests.length}`);
  console.log(`   Outlets: ${outlets.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
