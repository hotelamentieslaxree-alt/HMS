// ARIA HMS — Marketing Campaigns API
import { NextRequest } from "next/server";
import { ok, parseBody, withHandler } from "@/lib/hms";

// Mock campaigns data
const campaigns = [
  { id: "c1", propertyId: "prop1", name: "Summer Getaway 2024", type: "social", platform: "instagram", status: "active", budget: 150000, spent: 87500, impressions: 450000, clicks: 22500, conversions: 850, leads: 320, revenue: 425000, startDate: "2024-03-01", endDate: "2024-06-30", targetAudience: "Luxury travelers 25-45", objective: "conversions" },
  { id: "c2", propertyId: "prop1", name: "Business Conference Package", type: "email", platform: "multi", status: "active", budget: 50000, spent: 32000, impressions: 120000, clicks: 8400, conversions: 420, leads: 180, revenue: 280000, startDate: "2024-02-15", endDate: "2024-05-15", targetAudience: "Corporate planners", objective: "lead_gen" },
  { id: "c3", propertyId: "prop1", name: "Weekend Brunch Promo", type: "ppc", platform: "google", status: "active", budget: 80000, spent: 55000, impressions: 320000, clicks: 16000, conversions: 640, leads: 240, revenue: 192000, startDate: "2024-01-01", endDate: "2024-12-31", targetAudience: "Local foodies", objective: "sales" },
  { id: "c4", propertyId: "prop1", name: "Wedding Season 2024", type: "social", platform: "facebook", status: "paused", budget: 200000, spent: 145000, impressions: 800000, clicks: 40000, conversions: 1600, leads: 640, revenue: 1200000, startDate: "2024-01-01", endDate: "2024-03-31", targetAudience: "Engaged couples", objective: "conversions" },
  { id: "c5", propertyId: "prop1", name: "Loyalty Rewards Program", type: "email", platform: "multi", status: "completed", budget: 30000, spent: 28000, impressions: 50000, clicks: 5000, conversions: 750, leads: 150, revenue: 375000, startDate: "2024-02-01", endDate: "2024-03-31", targetAudience: "Repeat guests", objective: "engagement" },
  { id: "c6", propertyId: "prop1", name: "Influencer Collab - Travel", type: "influencer", platform: "instagram", status: "draft", budget: 100000, spent: 0, impressions: 0, clicks: 0, conversions: 0, leads: 0, revenue: 0, startDate: "2024-04-01", endDate: "2024-06-30", targetAudience: "Travel influencers 100K+", objective: "awareness" },
  { id: "c7", propertyId: "prop1", name: "SEO Content Push", type: "seo", platform: "multi", status: "active", budget: 40000, spent: 22000, impressions: 200000, clicks: 10000, conversions: 300, leads: 120, revenue: 150000, startDate: "2024-01-01", endDate: "2024-12-31", targetAudience: "Organic search", objective: "traffic" },
  { id: "c8", propertyId: "prop1", name: "Corporate Retreat Package", type: "display", platform: "linkedin", status: "active", budget: 60000, spent: 35000, impressions: 180000, clicks: 7200, conversions: 360, leads: 200, revenue: 540000, startDate: "2024-03-01", endDate: "2024-08-31", targetAudience: "HR managers", objective: "lead_gen" },
];

export const GET = withHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const type = url.searchParams.get("type");

  let filtered = [...campaigns];
  if (status) filtered = filtered.filter(c => c.status === status);
  if (platform) filtered = filtered.filter(c => c.platform === platform);
  if (type) filtered = filtered.filter(c => c.type === type);

  return ok(filtered, { total: filtered.length });
});

export const POST = withHandler(async (req: NextRequest) => {
  const body = await parseBody(req);
  const newCampaign = {
    id: `c${Date.now()}`,
    propertyId: "prop1",
    ...body,
    spent: 0, impressions: 0, clicks: 0, conversions: 0, leads: 0, revenue: 0,
  };
  campaigns.push(newCampaign);
  return ok(newCampaign);
});
