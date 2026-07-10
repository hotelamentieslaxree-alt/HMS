// ARIA HMS — Social Accounts API
import { NextRequest } from "next/server";
import { ok, parseBody, withHandler } from "@/lib/hms";

// Mock social accounts data
const socialAccounts = [
  { id: "sa1", propertyId: "prop1", platform: "instagram", handle: "@aureliangrand", displayName: "The Aurelian Grand", avatarUrl: null, followerCount: 45200, followingCount: 850, postCount: 1240, engagementRate: 4.2, isActive: true, lastSyncedAt: "2024-03-15T10:30:00Z" },
  { id: "sa2", propertyId: "prop1", platform: "facebook", handle: "TheAurelianGrand", displayName: "The Aurelian Grand Mumbai", avatarUrl: null, followerCount: 89000, followingCount: 320, postCount: 2100, engagementRate: 3.1, isActive: true, lastSyncedAt: "2024-03-15T10:25:00Z" },
  { id: "sa3", propertyId: "prop1", platform: "linkedin", handle: "the-aurelian-grand", displayName: "The Aurelian Grand", avatarUrl: null, followerCount: 15200, followingCount: 450, postCount: 320, engagementRate: 5.8, isActive: true, lastSyncedAt: "2024-03-15T09:00:00Z" },
  { id: "sa4", propertyId: "prop1", platform: "youtube", handle: "@AurelianGrandHotel", displayName: "Aurelian Grand Hotel", avatarUrl: null, followerCount: 12800, followingCount: 0, postCount: 85, engagementRate: 6.2, isActive: true, lastSyncedAt: "2024-03-14T18:00:00Z" },
  { id: "sa5", propertyId: "prop1", platform: "twitter", handle: "@aureliangrand", displayName: "Aurelian Grand", avatarUrl: null, followerCount: 22800, followingCount: 1200, postCount: 5600, engagementRate: 2.4, isActive: true, lastSyncedAt: "2024-03-15T10:00:00Z" },
  { id: "sa6", propertyId: "prop1", platform: "tiktok", handle: "@aureliangrand", displayName: "Aurelian Grand", avatarUrl: null, followerCount: 6800, followingCount: 50, postCount: 45, engagementRate: 8.5, isActive: false, lastSyncedAt: "2024-03-10T12:00:00Z" },
  { id: "sa7", propertyId: "prop1", platform: "pinterest", handle: "aureliangrand", displayName: "The Aurelian Grand", avatarUrl: null, followerCount: 3200, followingCount: 200, postCount: 450, engagementRate: 1.8, isActive: false, lastSyncedAt: null },
];

export const GET = withHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");

  let filtered = [...socialAccounts];
  if (platform) filtered = filtered.filter(a => a.platform === platform);

  return ok(filtered, { total: filtered.length });
});

export const POST = withHandler(async (req: NextRequest) => {
  const body = await parseBody(req);
  const newAccount = {
    id: `sa${Date.now()}`,
    propertyId: "prop1",
    ...body,
    followerCount: 0, followingCount: 0, postCount: 0, engagementRate: 0,
    isActive: true, lastSyncedAt: null,
  };
  socialAccounts.push(newAccount);
  return ok(newAccount);
});
