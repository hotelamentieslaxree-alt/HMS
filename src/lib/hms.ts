// ARIA HMS — API helpers
import { NextResponse } from "next/server";
import { db, ensureDbReady } from "@/lib/db";

// ─── Safe JSON parse ────────────────────────────────────────────────────────
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ─── Property ID cache (H9: avoid findFirst on every API call) ────────────────
let _cachedPropertyId: string | null = null;

/** Auto-seed a demo property if none exists (first run / Vercel cold start) */
async function ensureProperty() {
  let p = await db.property.findFirst({ orderBy: { createdAt: "asc" } });
  if (p) return p;
  // No property exists — create the demo property only (data seeded via scripts/seed.ts)
  p = await db.property.create({
    data: {
      name: "The Aurelian Grand",
      code: "TAG",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      timezone: "Asia/Calcutta",
      currency: "INR",
      starRating: 5,
      totalRooms: 26,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      businessDate: new Date(),
    },
  });
  return p;
}

/** Seed demo data for the property — runs once on first access */
async function seedDemoData(propertyId: string) {
  // Room categories — fields must match prisma schema
  await db.roomCategory.createMany({
    data: [
      { id: "cat-deluxe", propertyId, name: "Deluxe Room", code: "DLX", baseRate: 4500, maxAdults: 2, amenities: JSON.stringify(["WiFi", "TV", "AC", "Mini Bar"]) },
      { id: "cat-suite", propertyId, name: "Executive Suite", code: "EXE", baseRate: 8500, maxAdults: 3, amenities: JSON.stringify(["WiFi", "TV", "AC", "Mini Bar", "Bathtub", "Lounge"]) },
      { id: "cat-premium", propertyId, name: "Premium Room", code: "PRM", baseRate: 6500, maxAdults: 2, amenities: JSON.stringify(["WiFi", "TV", "AC", "Mini Bar", "Coffee Machine"]) },
      { id: "cat-standard", propertyId, name: "Standard Room", code: "STD", baseRate: 3000, maxAdults: 2, amenities: JSON.stringify(["WiFi", "TV", "AC"]) },
    ],
  });

  // Rooms — fields must match prisma schema (categoryId, roomNumber, currentStatus)
  const roomData: any[] = [];
  const catConfigs = [
    { catId: "cat-deluxe", prefix: "1", count: 10, floor: 1 },
    { catId: "cat-suite", prefix: "2", count: 8, floor: 2 },
    { catId: "cat-premium", prefix: "3", count: 6, floor: 3 },
    { catId: "cat-standard", prefix: "4", count: 2, floor: 4 },
  ];
  for (const cfg of catConfigs) {
    for (let i = 1; i <= cfg.count; i++) {
      const num = `${cfg.prefix}${String(i).padStart(2, "0")}`;
      roomData.push({
        propertyId,
        categoryId: cfg.catId,
        roomNumber: num,
        floor: cfg.floor,
        currentStatus: i <= 4 ? "occupied_clean" : i === 5 ? "out_of_order" : "vacant_clean",
      });
    }
  }
  await db.room.createMany({ data: roomData });

  // Demo users (one per role)
  const roles = [
    { email: "owner@aurelian.com", firstName: "Vikram", lastName: "Mehta", role: "owner", department: "Management" },
    { email: "gm@aurelian.com", firstName: "Priya", lastName: "Sharma", role: "gm", department: "Management" },
    { email: "fom@aurelian.com", firstName: "Rahul", lastName: "Kumar", role: "fom", department: "Front Office" },
    { email: "receptionist@aurelian.com", firstName: "Anita", lastName: "Patel", role: "receptionist", department: "Front Office" },
    { email: "hk_mgr@aurelian.com", firstName: "Sunita", lastName: "Devi", role: "hk_mgr", department: "Housekeeping" },
    { email: "fb_mgr@aurelian.com", firstName: "Chef", lastName: "Rajan", role: "fb_mgr", department: "F&B" },
    { email: "fin_mgr@aurelian.com", firstName: "Arun", lastName: "Gupta", role: "fin_mgr", department: "Finance" },
    { email: "eng_mgr@aurelian.com", firstName: "Deepak", lastName: "Singh", role: "eng_mgr", department: "Engineering" },
    { email: "rev_mgr@aurelian.com", firstName: "Neha", lastName: "Jain", role: "rev_mgr", department: "Revenue" },
    { email: "hr_mgr@aurelian.com", firstName: "Meera", lastName: "Reddy", role: "hr_mgr", department: "HR" },
    { email: "sales_mgr@aurelian.com", firstName: "Raj", lastName: "Malhotra", role: "sales_mgr", department: "Sales" },
    { email: "mkt_mgr@aurelian.com", firstName: "Kavita", lastName: "Nair", role: "mkt_mgr", department: "Marketing" },
    { email: "waiter@aurelian.com", firstName: "Amit", lastName: "Kumar", role: "waiter", department: "F&B" },
    { email: "technician@aurelian.com", firstName: "Sunil", lastName: "Yadav", role: "technician", department: "Engineering" },
    { email: "hk_attendant@aurelian.com", firstName: "Lakshmi", lastName: "Bai", role: "hk_attendant", department: "Housekeeping" },
    { email: "sales_exec@aurelian.com", firstName: "Vivek", lastName: "Rao", role: "sales_exec", department: "Sales" },
    { email: "mkt_exec@aurelian.com", firstName: "Pooja", lastName: "Das", role: "mkt_exec", department: "Marketing" },
  ];
  await db.user.createMany({
    data: roles.map((r, i) => ({
      propertyId,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      phone: `+91-98765${String(1000 + i).slice(-5)}`,
    })),
  });

  // Departments
  const depts = ["Management", "Front Office", "Housekeeping", "F&B", "Finance", "Engineering", "Revenue", "HR", "Sales", "Marketing"];
  await db.department.createMany({
    data: depts.map((name, i) => ({
      propertyId,
      name,
      code: name.slice(0, 3).toUpperCase(),
    })),
  });

  // Rate plan — validFrom/validTo required by schema
  const now = new Date();
  await db.ratePlan.createMany({
    data: [
      { propertyId, name: "Standard Rate", code: "RACK", mealPlan: "ep", validFrom: now, validTo: new Date(now.getTime() + 365 * 86400000) },
      { propertyId, name: "Suite Rate", code: "SUITE", mealPlan: "cp", validFrom: now, validTo: new Date(now.getTime() + 365 * 86400000) },
    ],
  });

  // ── Purchase Manager user ──────────────────────────────────────────────────
  await db.user.create({
    data: {
      propertyId,
      email: "purchase_mgr@aurelian.com",
      firstName: "Ramesh",
      lastName: "Kumar",
      role: "purchase_mgr",
      phone: "+91-9876543210",
    },
  });

  // ── Amenity Items (comprehensive list per category) ────────────────────────
  const catDeluxe = "cat-deluxe";
  const catSuite = "cat-suite";
  const amenityItems = [
    // Bedroom Linen
    { name: "King Bed Sheet", category: "bedroom_linen", subCategory: "bed_linen", sku: "BL-BS-001", unit: "pcs", unitCost: 850, quantity: 60, parLevel: 40, maxStock: 80, reorderQty: 20, seasonBuffer: 0.3, minPerRoom: 3, roomTypeId: catSuite, isConsumable: false, lifecycleDays: 180, location: "linen_room" },
    { name: "Twin Bed Sheet", category: "bedroom_linen", subCategory: "bed_linen", sku: "BL-BS-002", unit: "pcs", unitCost: 750, quantity: 80, parLevel: 50, maxStock: 100, reorderQty: 25, seasonBuffer: 0.3, minPerRoom: 3, roomTypeId: catDeluxe, isConsumable: false, lifecycleDays: 180, location: "linen_room" },
    { name: "Pillow Cover King", category: "bedroom_linen", subCategory: "pillow", sku: "BL-PC-001", unit: "pair", unitCost: 450, quantity: 100, parLevel: 60, maxStock: 120, reorderQty: 30, seasonBuffer: 0.3, minPerRoom: 4, roomTypeId: catSuite, isConsumable: false, lifecycleDays: 180, location: "linen_room" },
    { name: "Pillow Cover Standard", category: "bedroom_linen", subCategory: "pillow", sku: "BL-PC-002", unit: "pair", unitCost: 350, quantity: 120, parLevel: 80, maxStock: 150, reorderQty: 30, seasonBuffer: 0.3, minPerRoom: 4, isConsumable: false, lifecycleDays: 180, location: "linen_room" },
    { name: "Duvet King", category: "bedroom_linen", subCategory: "duvet", sku: "BL-DV-001", unit: "pcs", unitCost: 2200, quantity: 30, parLevel: 20, maxStock: 40, reorderQty: 10, seasonBuffer: 0.2, minPerRoom: 1, roomTypeId: catSuite, isConsumable: false, lifecycleDays: 365, location: "linen_room" },
    { name: "Blanket", category: "bedroom_linen", subCategory: "blanket", sku: "BL-BK-001", unit: "pcs", unitCost: 1200, quantity: 40, parLevel: 26, maxStock: 50, reorderQty: 10, seasonBuffer: 0.4, minPerRoom: 1, isConsumable: false, lifecycleDays: 540, location: "linen_room" },
    { name: "Mattress Protector", category: "bedroom_linen", subCategory: "mattress", sku: "BL-MP-001", unit: "pcs", unitCost: 900, quantity: 30, parLevel: 26, maxStock: 40, reorderQty: 8, seasonBuffer: 0.2, minPerRoom: 1, isConsumable: false, lifecycleDays: 365, location: "linen_room" },
    // Bathroom Linen
    { name: "Bath Towel Large", category: "bathroom_linen", subCategory: "bath_towel", sku: "RL-BT-001", unit: "pcs", unitCost: 550, quantity: 80, parLevel: 52, maxStock: 100, reorderQty: 20, seasonBuffer: 0.35, minPerRoom: 2, isConsumable: false, lifecycleDays: 180, location: "linen_room" },
    { name: "Hand Towel", category: "bathroom_linen", subCategory: "hand_towel", sku: "RL-HT-001", unit: "pcs", unitCost: 280, quantity: 100, parLevel: 52, maxStock: 120, reorderQty: 25, seasonBuffer: 0.35, minPerRoom: 2, isConsumable: false, lifecycleDays: 180, location: "linen_room" },
    { name: "Face Towel", category: "bathroom_linen", subCategory: "face_towel", sku: "RL-FT-001", unit: "pcs", unitCost: 180, quantity: 120, parLevel: 78, maxStock: 150, reorderQty: 30, seasonBuffer: 0.35, minPerRoom: 3, isConsumable: false, lifecycleDays: 120, location: "linen_room" },
    { name: "Bath Mat", category: "bathroom_linen", subCategory: "bath_mat", sku: "RL-BM-001", unit: "pcs", unitCost: 350, quantity: 35, parLevel: 26, maxStock: 50, reorderQty: 10, seasonBuffer: 0.3, minPerRoom: 1, isConsumable: false, lifecycleDays: 270, location: "linen_room" },
    { name: "Bathrobe", category: "bathroom_linen", subCategory: "bathrobe", sku: "RL-BR-001", unit: "pcs", unitCost: 1800, quantity: 30, parLevel: 20, maxStock: 40, reorderQty: 10, seasonBuffer: 0.4, minPerRoom: 1, roomTypeId: catSuite, isConsumable: false, lifecycleDays: 365, location: "linen_room" },
    // Bathroom Amenities
    { name: "Soap Bar", category: "bathroom_amenity", subCategory: "soap", sku: "BA-SO-001", unit: "pcs", unitCost: 45, quantity: 500, parLevel: 200, maxStock: 800, reorderQty: 200, seasonBuffer: 0.5, minPerRoom: 2, isConsumable: true, lifecycleDays: 7, location: "housekeeping_store" },
    { name: "Shampoo Bottle 30ml", category: "bathroom_amenity", subCategory: "shampoo", sku: "BA-SH-001", unit: "pcs", unitCost: 65, quantity: 400, parLevel: 156, maxStock: 600, reorderQty: 150, seasonBuffer: 0.5, minPerRoom: 2, isConsumable: true, lifecycleDays: 7, location: "housekeeping_store" },
    { name: "Conditioner 30ml", category: "bathroom_amenity", subCategory: "conditioner", sku: "BA-CO-001", unit: "pcs", unitCost: 70, quantity: 400, parLevel: 156, maxStock: 600, reorderQty: 150, seasonBuffer: 0.5, minPerRoom: 2, isConsumable: true, lifecycleDays: 7, location: "housekeeping_store" },
    { name: "Body Lotion 30ml", category: "bathroom_amenity", subCategory: "lotion", sku: "BA-LO-001", unit: "pcs", unitCost: 80, quantity: 300, parLevel: 156, maxStock: 500, reorderQty: 150, seasonBuffer: 0.5, minPerRoom: 1, isConsumable: true, lifecycleDays: 7, location: "housekeeping_store" },
    { name: "Shower Cap", category: "bathroom_amenity", subCategory: "shower_cap", sku: "BA-SC-001", unit: "pcs", unitCost: 25, quantity: 300, parLevel: 104, maxStock: 400, reorderQty: 100, seasonBuffer: 0.5, minPerRoom: 1, isConsumable: true, lifecycleDays: 1, location: "housekeeping_store" },
    { name: "Dental Kit", category: "bathroom_amenity", subCategory: "dental", sku: "BA-DK-001", unit: "pcs", unitCost: 35, quantity: 400, parLevel: 156, maxStock: 600, reorderQty: 150, seasonBuffer: 0.5, minPerRoom: 1, isConsumable: true, lifecycleDays: 1, location: "housekeeping_store" },
    { name: "Sanitary Bag", category: "bathroom_amenity", subCategory: "sanitary", sku: "BA-SB-001", unit: "pcs", unitCost: 15, quantity: 200, parLevel: 78, maxStock: 300, reorderQty: 80, seasonBuffer: 0.4, minPerRoom: 1, isConsumable: true, lifecycleDays: 1, location: "housekeeping_store" },
    // Mini Bar
    { name: "Mineral Water 500ml", category: "minibar", subCategory: "water", sku: "MB-MW-001", unit: "pcs", unitCost: 20, quantity: 200, parLevel: 78, maxStock: 400, reorderQty: 100, seasonBuffer: 0.6, minPerRoom: 2, isConsumable: true, lifecycleDays: 180, location: "minibar_store" },
    { name: "Coca Cola Can", category: "minibar", subCategory: "soft_drink", sku: "MB-CC-001", unit: "pcs", unitCost: 35, quantity: 150, parLevel: 52, maxStock: 300, reorderQty: 80, seasonBuffer: 0.6, minPerRoom: 2, isConsumable: true, lifecycleDays: 180, location: "minibar_store" },
    { name: "Beer Can", category: "minibar", subCategory: "alcohol", sku: "MB-BR-001", unit: "pcs", unitCost: 120, quantity: 80, parLevel: 26, maxStock: 150, reorderQty: 40, seasonBuffer: 0.5, minPerRoom: 1, isConsumable: true, lifecycleDays: 180, location: "minibar_store" },
    { name: "Chocolate Bar", category: "minibar", subCategory: "snack", sku: "MB-CH-001", unit: "pcs", unitCost: 80, quantity: 100, parLevel: 52, maxStock: 200, reorderQty: 50, seasonBuffer: 0.5, minPerRoom: 2, isConsumable: true, lifecycleDays: 90, location: "minibar_store" },
    { name: "Chips Packet", category: "minibar", subCategory: "snack", sku: "MB-CP-001", unit: "pcs", unitCost: 40, quantity: 120, parLevel: 52, maxStock: 200, reorderQty: 50, seasonBuffer: 0.5, minPerRoom: 1, isConsumable: true, lifecycleDays: 90, location: "minibar_store" },
    { name: "Juice Box", category: "minibar", subCategory: "juice", sku: "MB-JB-001", unit: "pcs", unitCost: 45, quantity: 100, parLevel: 52, maxStock: 200, reorderQty: 50, seasonBuffer: 0.5, minPerRoom: 1, isConsumable: true, lifecycleDays: 30, location: "minibar_store" },
    // Kitchen Equipment
    { name: "Electric Kettle", category: "kitchen", subCategory: "appliance", sku: "KT-EK-001", unit: "pcs", unitCost: 1500, quantity: 28, parLevel: 26, maxStock: 30, reorderQty: 5, seasonBuffer: 0.1, minPerRoom: 1, isConsumable: false, lifecycleDays: 730, location: "warehouse" },
    { name: "Tea Set (Cup+Saucer)", category: "kitchen", subCategory: "crockery", sku: "KT-TS-001", unit: "set", unitCost: 250, quantity: 60, parLevel: 52, maxStock: 80, reorderQty: 15, seasonBuffer: 0.3, minPerRoom: 2, isConsumable: false, lifecycleDays: 365, location: "warehouse" },
    { name: "Sugar Sachets (Box 50)", category: "kitchen", subCategory: "condiment", sku: "KT-SG-001", unit: "box", unitCost: 120, quantity: 30, parLevel: 20, maxStock: 50, reorderQty: 10, seasonBuffer: 0.4, minPerRoom: 1, isConsumable: true, lifecycleDays: 180, location: "kitchen" },
    { name: "Coffee Sachets (Box 25)", category: "kitchen", subCategory: "condiment", sku: "KT-CF-001", unit: "box", unitCost: 200, quantity: 30, parLevel: 20, maxStock: 50, reorderQty: 10, seasonBuffer: 0.4, minPerRoom: 1, isConsumable: true, lifecycleDays: 180, location: "kitchen" },
    { name: "Milk Cups (Pack 50)", category: "kitchen", subCategory: "condiment", sku: "KT-ML-001", unit: "pack", unitCost: 150, quantity: 25, parLevel: 20, maxStock: 40, reorderQty: 10, seasonBuffer: 0.4, minPerRoom: 1, isConsumable: true, lifecycleDays: 14, location: "kitchen" },
    // Electronics
    { name: "TV Remote Control", category: "electronics", subCategory: "remote", sku: "EL-TR-001", unit: "pcs", unitCost: 450, quantity: 28, parLevel: 26, maxStock: 30, reorderQty: 4, seasonBuffer: 0.1, minPerRoom: 1, isConsumable: false, lifecycleDays: 730, location: "warehouse" },
    { name: "Hair Dryer", category: "electronics", subCategory: "appliance", sku: "EL-HD-001", unit: "pcs", unitCost: 2500, quantity: 28, parLevel: 26, maxStock: 30, reorderQty: 4, seasonBuffer: 0.1, minPerRoom: 1, isConsumable: false, lifecycleDays: 730, location: "warehouse" },
    { name: "Iron Box", category: "electronics", subCategory: "appliance", sku: "EL-IB-001", unit: "pcs", unitCost: 1800, quantity: 20, parLevel: 15, maxStock: 25, reorderQty: 5, seasonBuffer: 0.1, minPerRoom: 1, isConsumable: false, lifecycleDays: 730, location: "housekeeping_store" },
    { name: "Ironing Board", category: "electronics", subCategory: "accessory", sku: "EL-IW-001", unit: "pcs", unitCost: 2200, quantity: 15, parLevel: 10, maxStock: 20, reorderQty: 5, seasonBuffer: 0.1, minPerRoom: 0.5, isConsumable: false, lifecycleDays: 1095, location: "housekeeping_store" },
    // Safety Items
    { name: "Fire Extinguisher", category: "safety", subCategory: "fire", sku: "SF-FE-001", unit: "pcs", unitCost: 3500, quantity: 30, parLevel: 30, maxStock: 35, reorderQty: 3, seasonBuffer: 0, minPerRoom: 1, isConsumable: false, lifecycleDays: 1825, location: "warehouse" },
    { name: "Flashlight", category: "safety", subCategory: "emergency", sku: "SF-FL-001", unit: "pcs", unitCost: 500, quantity: 30, parLevel: 26, maxStock: 35, reorderQty: 5, seasonBuffer: 0.1, minPerRoom: 1, isConsumable: false, lifecycleDays: 1095, location: "warehouse" },
    { name: "First Aid Kit", category: "safety", subCategory: "medical", sku: "SF-FA-001", unit: "pcs", unitCost: 800, quantity: 28, parLevel: 26, maxStock: 35, reorderQty: 5, seasonBuffer: 0.2, minPerRoom: 1, isConsumable: false, lifecycleDays: 730, location: "housekeeping_store" },
    // Stationery
    { name: "Notepad", category: "stationery", subCategory: "paper", sku: "ST-NP-001", unit: "pcs", unitCost: 30, quantity: 200, parLevel: 78, maxStock: 300, reorderQty: 80, seasonBuffer: 0.3, minPerRoom: 1, isConsumable: true, lifecycleDays: 7, location: "housekeeping_store" },
    { name: "Pen", category: "stationery", subCategory: "writing", sku: "ST-PN-001", unit: "pcs", unitCost: 25, quantity: 200, parLevel: 78, maxStock: 300, reorderQty: 80, seasonBuffer: 0.3, minPerRoom: 2, isConsumable: true, lifecycleDays: 7, location: "housekeeping_store" },
    { name: "Envelope Set", category: "stationery", subCategory: "paper", sku: "ST-EN-001", unit: "pack", unitCost: 50, quantity: 80, parLevel: 52, maxStock: 120, reorderQty: 30, seasonBuffer: 0.3, minPerRoom: 1, isConsumable: true, lifecycleDays: 30, location: "housekeeping_store" },
    { name: "Guest Directory Folder", category: "stationery", subCategory: "folder", sku: "ST-GD-001", unit: "pcs", unitCost: 120, quantity: 30, parLevel: 26, maxStock: 40, reorderQty: 8, seasonBuffer: 0.2, minPerRoom: 1, isConsumable: false, lifecycleDays: 365, location: "housekeeping_store" },
    // Living Room
    { name: "Cushion Cover", category: "living_room", subCategory: "cushion", sku: "LR-CC-001", unit: "pcs", unitCost: 350, quantity: 40, parLevel: 26, maxStock: 50, reorderQty: 10, seasonBuffer: 0.3, minPerRoom: 2, roomTypeId: catSuite, isConsumable: false, lifecycleDays: 270, location: "linen_room" },
    { name: "Throw Blanket", category: "living_room", subCategory: "throw", sku: "LR-TB-001", unit: "pcs", unitCost: 1500, quantity: 15, parLevel: 8, maxStock: 20, reorderQty: 5, seasonBuffer: 0.4, minPerRoom: 1, roomTypeId: catSuite, isConsumable: false, lifecycleDays: 365, location: "linen_room" },
  ];

  for (const item of amenityItems) {
    await db.amenityItem.create({
      data: {
        propertyId,
        ...item,
        availableQty: item.quantity - Math.floor(item.quantity * 0.3),
        issuedQty: Math.floor(item.quantity * 0.3),
        condition: "good",
      },
    });
  }

  // ── Season Configurations ──────────────────────────────────────────────────
  const year = now.getFullYear();
  await db.seasonConfig.createMany({
    data: [
      { propertyId, name: "Peak Summer", category: "bedroom_linen", multiplier: 1.4, startDate: new Date(year, 3, 1), endDate: new Date(year, 5, 30), isActive: true, autoReorder: true },
      { propertyId, name: "Peak Summer", category: "bathroom_linen", multiplier: 1.5, startDate: new Date(year, 3, 1), endDate: new Date(year, 5, 30), isActive: true, autoReorder: true },
      { propertyId, name: "Peak Summer", category: "bathroom_amenity", multiplier: 1.5, startDate: new Date(year, 3, 1), endDate: new Date(year, 5, 30), isActive: true, autoReorder: true },
      { propertyId, name: "Peak Summer", category: "minibar", multiplier: 1.6, startDate: new Date(year, 3, 1), endDate: new Date(year, 5, 30), isActive: true, autoReorder: true },
      { propertyId, name: "Monsoon", category: "bathroom_linen", multiplier: 1.3, startDate: new Date(year, 6, 1), endDate: new Date(year, 8, 30), isActive: true, autoReorder: false },
      { propertyId, name: "Wedding Season", category: "bedroom_linen", multiplier: 1.5, startDate: new Date(year, 10, 1), endDate: new Date(year, 11, 31), isActive: true, autoReorder: true },
      { propertyId, name: "Wedding Season", category: "bathroom_amenity", multiplier: 1.6, startDate: new Date(year, 10, 1), endDate: new Date(year, 11, 31), isActive: true, autoReorder: true },
      { propertyId, name: "Winter", category: "bedroom_linen", multiplier: 1.4, startDate: new Date(year, 11, 1), endDate: new Date(year + 1, 1, 28), isActive: true, autoReorder: true },
      { propertyId, name: "Conference Season", category: "stationery", multiplier: 1.5, startDate: new Date(year, 8, 1), endDate: new Date(year, 10, 30), isActive: true, autoReorder: false },
    ],
  });

  // ── Chart of Accounts ──────────────────────────────────────────────────────
  const accounts = [
    // Assets
    { code: "1000", name: "Current Assets", accountType: "asset", subType: "current_asset", normalBalance: "debit", isSystem: true },
    { code: "1100", name: "Cash in Hand", accountType: "asset", subType: "current_asset", parentCode: "1000", normalBalance: "debit", isSystem: true },
    { code: "1200", name: "Bank Account", accountType: "asset", subType: "current_asset", parentCode: "1000", normalBalance: "debit", isSystem: true },
    { code: "1300", name: "Accounts Receivable", accountType: "asset", subType: "current_asset", parentCode: "1000", normalBalance: "debit", isSystem: true },
    { code: "1400", name: "Inventory", accountType: "asset", subType: "current_asset", parentCode: "1000", normalBalance: "debit" },
    { code: "1500", name: "Petty Cash", accountType: "asset", subType: "current_asset", parentCode: "1000", normalBalance: "debit" },
    { code: "2000", name: "Fixed Assets", accountType: "asset", subType: "fixed_asset", normalBalance: "debit", isSystem: true },
    { code: "2100", name: "Building", accountType: "asset", subType: "fixed_asset", parentCode: "2000", normalBalance: "debit" },
    { code: "2200", name: "Furniture & Fixtures", accountType: "asset", subType: "fixed_asset", parentCode: "2000", normalBalance: "debit" },
    { code: "2300", name: "Equipment", accountType: "asset", subType: "fixed_asset", parentCode: "2000", normalBalance: "debit" },
    // Liabilities
    { code: "3000", name: "Current Liabilities", accountType: "liability", subType: "current_liability", normalBalance: "credit", isSystem: true },
    { code: "3100", name: "Accounts Payable", accountType: "liability", subType: "current_liability", parentCode: "3000", normalBalance: "credit", isSystem: true },
    { code: "3200", name: "GST Payable", accountType: "liability", subType: "current_liability", parentCode: "3000", normalBalance: "credit", isSystem: true },
    { code: "3300", name: "Salary Payable", accountType: "liability", subType: "current_liability", parentCode: "3000", normalBalance: "credit" },
    { code: "3400", name: "Advance from Guests", accountType: "liability", subType: "current_liability", parentCode: "3000", normalBalance: "credit" },
    // Equity
    { code: "4000", name: "Owner's Equity", accountType: "equity", normalBalance: "credit", isSystem: true },
    { code: "4100", name: "Retained Earnings", accountType: "equity", parentCode: "4000", normalBalance: "credit", isSystem: true },
    { code: "4200", name: "Drawings", accountType: "equity", parentCode: "4000", normalBalance: "debit" },
    // Revenue
    { code: "5000", name: "Room Revenue", accountType: "revenue", subType: "operating_revenue", normalBalance: "credit", isSystem: true },
    { code: "5100", name: "F&B Revenue", accountType: "revenue", subType: "operating_revenue", normalBalance: "credit", isSystem: true },
    { code: "5200", name: "Banquet Revenue", accountType: "revenue", subType: "operating_revenue", normalBalance: "credit" },
    { code: "5300", name: "Other Revenue", accountType: "revenue", subType: "other_revenue", normalBalance: "credit" },
    { code: "5400", name: "Service Charge", accountType: "revenue", subType: "other_revenue", normalBalance: "credit" },
    // Expenses
    { code: "6000", name: "Cost of Goods Sold", accountType: "expense", subType: "cost_of_goods", normalBalance: "debit", isSystem: true },
    { code: "6100", name: "Salary & Wages", accountType: "expense", subType: "payroll", normalBalance: "debit", isSystem: true },
    { code: "6200", name: "Utilities", accountType: "expense", subType: "operating_expense", normalBalance: "debit" },
    { code: "6300", name: "Maintenance", accountType: "expense", subType: "operating_expense", normalBalance: "debit" },
    { code: "6400", name: "Marketing", accountType: "expense", subType: "operating_expense", normalBalance: "debit" },
    { code: "6500", name: "Supplies", accountType: "expense", subType: "operating_expense", normalBalance: "debit" },
    { code: "6600", name: "Depreciation", accountType: "expense", subType: "non_cash", normalBalance: "debit" },
    { code: "6700", name: "Insurance", accountType: "expense", subType: "operating_expense", normalBalance: "debit" },
  ];

  const accountMap: Record<string, string> = {};
  for (const acc of accounts) {
    const parentAccountId = acc.parentCode ? accountMap[acc.parentCode] : null;
    const created = await db.account.create({
      data: {
        propertyId,
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        subType: acc.subType || null,
        parentAccountId,
        normalBalance: acc.normalBalance as "debit" | "credit",
        isSystem: acc.isSystem || false,
        balance: 0,
      },
    });
    accountMap[acc.code] = created.id;
  }

  // ── Demo Budget Entries ────────────────────────────────────────────────────
  const month = now.getMonth() + 1;
  const budgetData = [
    { code: "5000", amount: 2500000 }, { code: "5100", amount: 800000 },
    { code: "6100", amount: 1200000 }, { code: "6200", amount: 200000 },
    { code: "6300", amount: 150000 }, { code: "6400", amount: 100000 },
    { code: "6500", amount: 80000 }, { code: "6600", amount: 50000 },
  ];
  for (const b of budgetData) {
    const accId = accountMap[b.code];
    if (accId) {
      await db.budgetEntry.create({
        data: { propertyId, accountId: accId, year, month, budgetedAmount: b.amount, actualAmount: Math.round(b.amount * (0.7 + Math.random() * 0.4)) },
      });
    }
  }

  // ── Demo Billing Verifications ─────────────────────────────────────────────
  await db.billingVerification.createMany({
    data: [
      { propertyId, verificationType: "invoice", referenceNumber: "INV-2024-001", amount: 125000, verifiedAmount: 125000, status: "verified", checklist: JSON.stringify([{ item: "Invoice matched with PO", done: true }, { item: "GST verified", done: true }, { item: "Delivery confirmed", done: true }]) },
      { propertyId, verificationType: "expense", referenceNumber: "EXP-2024-015", amount: 45000, verifiedAmount: 42000, discrepancy: 3000, status: "discrepancy", checklist: JSON.stringify([{ item: "Receipt attached", done: true }, { item: "Amount matches", done: false }, { item: "Approved by HOD", done: true }]) },
      { propertyId, verificationType: "invoice", referenceNumber: "INV-2024-003", amount: 67000, verifiedAmount: 0, status: "pending", checklist: JSON.stringify([{ item: "Invoice matched with PO", done: false }, { item: "GST verified", done: false }, { item: "Delivery confirmed", done: false }]) },
    ],
  });

  // ── Demo Vendor Ratings ────────────────────────────────────────────────────
  const vendors = await db.vendor.findMany({ where: { propertyId }, take: 3 });
  for (const v of vendors) {
    await db.vendorRating.create({
      data: {
        propertyId,
        vendorId: v.id,
        qualityScore: 7 + Math.floor(Math.random() * 3),
        deliveryScore: 6 + Math.floor(Math.random() * 4),
        priceScore: 7 + Math.floor(Math.random() * 3),
        communicationScore: 6 + Math.floor(Math.random() * 3),
        overallScore: 7 + Math.random() * 2,
        review: "Good supplier, on-time delivery",
      },
    });
  }

  // ── Demo Sales Leads ──────────────────────────────────────────────────────
  const salesUsers = await db.user.findMany({
    where: { propertyId, role: { in: ["sales_mgr", "sales_exec"] } },
  });
  const salesMgr = salesUsers.find((u) => u.role === "sales_mgr");
  const salesExec = salesUsers.find((u) => u.role === "sales_exec");
  const assignId1 = salesMgr?.id ?? null;
  const assignId2 = salesExec?.id ?? null;

  const leadData = [
    { companyName: "Tata Group", contactName: "Rajesh Sharma", contactEmail: "rajesh.sharma@tata.com", contactPhone: "+91 98200 12345", source: "referral", status: "qualified", estimatedValue: 4500000, probability: 60, assignedToId: assignId1, lastContactedAt: new Date("2026-06-28T10:30:00Z"), notes: "Corporate retreat for 200 pax, Q3 2026" },
    { companyName: "Infosys Ltd", contactName: "Anita Desai", contactEmail: "anita.d@infosys.com", contactPhone: "+91 99001 56789", source: "linkedin", status: "proposal", estimatedValue: 3200000, probability: 75, assignedToId: assignId2, lastContactedAt: new Date("2026-06-30T14:00:00Z"), notes: "Annual conference, 3-day event" },
    { companyName: "Reliance Industries", contactName: "Mukesh Patel", contactEmail: "m.patel@reliance.com", contactPhone: "+91 98765 43210", source: "direct", status: "new", estimatedValue: 8500000, probability: 15, assignedToId: assignId1, lastContactedAt: new Date("2026-07-01T09:00:00Z"), notes: "Exploring luxury corporate stay options" },
    { companyName: "Wipro Technologies", contactName: "Kavitha Reddy", contactEmail: "kavitha.r@wipro.com", contactPhone: "+91 99876 11111", source: "website", status: "contacted", estimatedValue: 1800000, probability: 30, assignedToId: assignId2, lastContactedAt: new Date("2026-06-25T16:30:00Z"), notes: "IT summit for 150 delegates" },
    { companyName: "Mahindra & Mahindra", contactName: "Sunil Kulkarni", contactEmail: "sunil.k@mahindra.com", contactPhone: "+91 98123 45678", source: "referral", status: "negotiation", estimatedValue: 5600000, probability: 85, assignedToId: assignId2, lastContactedAt: new Date("2026-07-01T11:00:00Z"), notes: "Board meeting + gala dinner, Dec 2026" },
    { companyName: "ICICI Bank", contactName: "Deepak Joshi", contactEmail: "deepak.j@icici.com", contactPhone: "+91 99234 56789", source: "referral", status: "won", estimatedValue: 2200000, probability: 100, assignedToId: assignId1, lastContactedAt: new Date("2026-06-20T10:00:00Z"), notes: "Training program booked for Aug 2026" },
    { companyName: "HDFC Life", contactName: "Ritu Kapoor", contactEmail: "ritu.k@hdfclife.com", contactPhone: "+91 98345 67890", source: "cold_call", status: "lost", estimatedValue: 3900000, probability: 0, assignedToId: assignId2, lastContactedAt: new Date("2026-06-15T13:00:00Z"), notes: "Went with competitor - pricing issue" },
    { companyName: "Bajaj Finserv", contactName: "Nitin Bajaj", contactEmail: "nitin.b@bajaj.com", contactPhone: "+91 99456 78901", source: "ota_partner", status: "qualified", estimatedValue: 2800000, probability: 55, assignedToId: assignId2, lastContactedAt: new Date("2026-06-29T15:00:00Z"), notes: "Annual offsite, 120 rooms needed" },
    { companyName: "Larsen & Toubro", contactName: "Arun Subramaniam", contactEmail: "arun.s@lnt.com", contactPhone: "+91 99567 89012", source: "linkedin", status: "contacted", estimatedValue: 6100000, probability: 25, assignedToId: assignId1, lastContactedAt: new Date("2026-06-27T09:30:00Z"), notes: "Engineering summit, 250 attendees" },
    { companyName: "Adani Group", contactName: "Priti Adani", contactEmail: "priti.a@adani.com", contactPhone: "+91 99678 90123", source: "direct", status: "new", estimatedValue: 12000000, probability: 10, assignedToId: assignId2, lastContactedAt: new Date("2026-07-01T08:00:00Z"), notes: "VIP guest program inquiry" },
    { companyName: "Godrej Industries", contactName: "Nisaba Godrej", contactEmail: "nisaba@godrej.com", contactPhone: "+91 99789 01234", source: "referral", status: "proposal", estimatedValue: 3400000, probability: 70, assignedToId: assignId2, lastContactedAt: new Date("2026-06-30T12:00:00Z"), notes: "Leadership retreat, 50 pax" },
    { companyName: "Hindustan Unilever", contactName: "Sanjiv Mehta", contactEmail: "sanjiv.m@hul.com", contactPhone: "+91 99890 12345", source: "website", status: "negotiation", estimatedValue: 7800000, probability: 80, assignedToId: assignId1, lastContactedAt: new Date("2026-07-01T10:00:00Z"), notes: "Global strategy meeting, block of 80 rooms" },
  ];

  const createdLeads: { id: string }[] = [];
  for (const ld of leadData) {
    const lead = await db.lead.create({
      data: { propertyId, ...ld, contactEmail: ld.contactEmail ?? null, contactPhone: ld.contactPhone ?? null, notes: ld.notes ?? null },
    });
    createdLeads.push({ id: lead.id });
  }

  // ── Demo Deals ────────────────────────────────────────────────────────────
  if (createdLeads.length >= 6) {
    const dealData = [
      { title: "Tata Corporate Retreat", leadId: createdLeads[0].id, value: 4500000, stage: "qualification", probability: 60, closeDate: new Date("2026-08-15T00:00:00Z"), assignedToId: assignId1, notes: "Corporate retreat package" },
      { title: "Infosys Annual Conference", leadId: createdLeads[1].id, value: 3200000, stage: "proposal", probability: 75, closeDate: new Date("2026-07-30T00:00:00Z"), assignedToId: assignId2, notes: "3-day conference" },
      { title: "Mahindra Board Meeting", leadId: createdLeads[4].id, value: 5600000, stage: "negotiation", probability: 85, closeDate: new Date("2026-07-20T00:00:00Z"), assignedToId: assignId2, notes: "Board meeting + gala" },
      { title: "ICICI Training Program", leadId: createdLeads[5].id, value: 2200000, stage: "closed_won", probability: 100, closeDate: new Date("2026-06-20T00:00:00Z"), assignedToId: assignId1, notes: "Training program confirmed" },
      { title: "Bajaj Annual Offsite", leadId: createdLeads[7].id, value: 2800000, stage: "qualification", probability: 55, closeDate: new Date("2026-09-01T00:00:00Z"), assignedToId: assignId2, notes: "Annual offsite planning" },
      { title: "L&T Engineering Summit", leadId: createdLeads[8].id, value: 6100000, stage: "prospecting", probability: 25, closeDate: new Date("2026-10-15T00:00:00Z"), assignedToId: assignId1, notes: "Engineering summit proposal" },
      { title: "Godrej Leadership Retreat", leadId: createdLeads[10].id, value: 3400000, stage: "proposal", probability: 70, closeDate: new Date("2026-08-20T00:00:00Z"), assignedToId: assignId2, notes: "Leadership retreat" },
      { title: "HUL Global Strategy Meet", leadId: createdLeads[11].id, value: 7800000, stage: "negotiation", probability: 80, closeDate: new Date("2026-07-25T00:00:00Z"), assignedToId: assignId1, notes: "Strategy meeting booking" },
    ];
    for (const dd of dealData) {
      await db.deal.create({
        data: { propertyId, ...dd, closeDate: dd.closeDate ?? null, notes: dd.notes ?? null },
      });
    }
  }
}

export const PROPERTY_ID = async () => {
  if (_cachedPropertyId) return _cachedPropertyId;
  // Ensure DB schema is ready (Vercel serverless cold start)
  await ensureDbReady();
  const p = await ensureProperty();
  _cachedPropertyId = p.id;
  return p.id;
};

/** Force re-fetch of cached property id (used after property mutations). */
export function invalidatePropertyCache() {
  _cachedPropertyId = null;
}

// ─── Standard JSON responses ─────────────────────────────────────────────────
export function ok<T>(data: T, meta?: Record<string, any>) {
  return NextResponse.json({
    success: true,
    data,
    meta: meta ?? { timestamp: new Date().toISOString() },
    errors: null,
  });
}

export function fail(message: string, code = "ERROR", status = 400, field?: string) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      errors: [{ code, message, field }],
    },
    { status }
  );
}

// ─── Body parsing ────────────────────────────────────────────────────────────
export async function parseBody(req: Request) {
  try {
    const text = await req.text();
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

// ─── withHandler: wrap an API route handler with try/catch ──────────────────
export function withHandler<
  A extends any[],
  R extends Response | Promise<Response>
>(fn: (...args: A) => R) {
  return async (...args: A): Promise<Response> => {
    try {
      await ensureDbReady();
      return await fn(...args);
    } catch (e: any) {
      const message = e?.message || "Internal server error";
      const code = e?.code || "INTERNAL";
      if (e?.code === "P2002") {
        return fail(`Duplicate value for ${e?.meta?.target?.join(", ") || "field"}`, "DUPLICATE", 409);
      }
      if (e?.code === "P2025") {
        return fail("Record not found", "NOT_FOUND", 404);
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("[API ERROR]", e);
      }
      return fail(message, code, 500);
    }
  };
}

// ─── Atomic sequence-number generation ──────────────────────────────────────
export async function nextNumber(
  model: "reservation" | "posOrder" | "folio",
  field: "confirmationNumber" | "kotNumber" | "folioNumber",
  opts?: { where?: any; prefix?: string; base?: number }
): Promise<string | number> {
  const where = opts?.where;
  let max: number = opts?.base ?? 0;

  if (model === "reservation" && field === "confirmationNumber") {
    const rows = await db.reservation.findMany({ where, select: { confirmationNumber: true } });
    for (const r of rows) {
      const m = /(\d+)\s*$/.exec(r.confirmationNumber || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${opts?.prefix ?? "AUR"}-${max + 1}`;
  }

  if (model === "posOrder" && field === "kotNumber") {
    const agg = await db.posOrder.aggregate({ where, _max: { kotNumber: true } });
    max = Math.max(max, agg._max.kotNumber ?? 1099);
    return max + 1;
  }

  if (model === "folio" && field === "folioNumber") {
    const rows = await db.folio.findMany({ where, select: { folioNumber: true } });
    for (const r of rows) {
      const m = /(\d+)\s*$/.exec(r.folioNumber || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${opts?.prefix ?? "F"}-${max + 1}`;
  }

  throw new Error(`nextNumber: unsupported ${model}.${field}`);
}

// ─── Real-time broadcast (best-effort) ───────────────────────────────────────
export async function broadcast(event: string, payload: any, propertyId?: string) {
  if (process.env.VERCEL) return;
  try {
    await fetch("http://localhost:3003/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload, propertyId }),
    });
  } catch { /* best-effort */ }
}

// ─── Audit log (best-effort) ─────────────────────────────────────────────────
export async function logAudit(opts: {
  propertyId?: string; userId?: string; userRole?: string; userEmail?: string;
  action: string; entityType?: string; entityId?: string;
  oldValue?: any; newValue?: any; ipAddress?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        propertyId: opts.propertyId ?? null, userId: opts.userId ?? null,
        userRole: opts.userRole ?? null, user_email: opts.userEmail ?? null,
        action: opts.action, entityType: opts.entityType ?? null, entityId: opts.entityId ?? null,
        oldValue: opts.oldValue ? JSON.stringify(opts.oldValue) : null,
        newValue: opts.newValue ? JSON.stringify(opts.newValue) : null,
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch { /* best-effort */ }
}

// ─── Formatting helpers ──────────────────────────────────────────────────────
export function formatCurrency(n: number, currency = "₹") {
  const v = Math.round(n * 100) / 100;
  return `${currency}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function nightsBetween(checkIn: Date, checkOut: Date) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── KPI calculations ────────────────────────────────────────────────────────
export function calcKPIs(opts: {
  occupiedRooms: number; totalRooms: number; outOfOrderRooms: number;
  roomRevenue: number; totalRevenue: number; operatingExpenses: number;
}) {
  const availableRooms = opts.totalRooms - opts.outOfOrderRooms;
  const occupancyRate = availableRooms > 0 ? (opts.occupiedRooms / availableRooms) * 100 : 0;
  const adr = opts.occupiedRooms > 0 ? opts.roomRevenue / opts.occupiedRooms : 0;
  const revpar = availableRooms > 0 ? opts.roomRevenue / availableRooms : 0;
  const trevpar = availableRooms > 0 ? opts.totalRevenue / availableRooms : 0;
  const goppar = availableRooms > 0 ? (opts.totalRevenue - opts.operatingExpenses) / availableRooms : 0;
  const cpor = opts.occupiedRooms > 0 ? opts.operatingExpenses / opts.occupiedRooms : 0;
  return {
    occupancyRate: Math.round(occupancyRate * 10) / 10, adr: Math.round(adr),
    revpar: Math.round(revpar), trevpar: Math.round(trevpar),
    goppar: Math.round(goppar), cpor: Math.round(cpor),
    availableRooms, occupiedRooms: opts.occupiedRooms,
    outOfOrderRooms: opts.outOfOrderRooms, totalRooms: opts.totalRooms,
  };
}
