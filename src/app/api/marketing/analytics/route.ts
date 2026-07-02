// ARIA HMS — Marketing Analytics API
import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/hms";

export const GET = withHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30";

  // Mock analytics data
  const analytics = {
    channelPerformance: [
      { channel: "Instagram", spend: 87500, revenue: 425000, roas: 4.86, leads: 320 },
      { channel: "Facebook", spend: 145000, revenue: 1200000, roas: 8.28, leads: 640 },
      { channel: "Google Ads", spend: 55000, revenue: 192000, roas: 3.49, leads: 240 },
      { channel: "LinkedIn", spend: 35000, revenue: 540000, roas: 15.43, leads: 200 },
      { channel: "YouTube", spend: 18000, revenue: 96000, roas: 5.33, leads: 80 },
      { channel: "Email", spend: 28000, revenue: 375000, roas: 13.39, leads: 150 },
    ],
    trafficTrend: [
      { month: "Oct", paid: 28000, organic: 35000 },
      { month: "Nov", paid: 32000, organic: 38000 },
      { month: "Dec", paid: 45000, organic: 42000 },
      { month: "Jan", paid: 38000, organic: 40000 },
      { month: "Feb", paid: 42000, organic: 48000 },
    ],
    funnelBreakdown: [
      { stage: "Impressions", value: 2120000, fill: "#F5A623" },
      { stage: "Clicks", value: 109100, fill: "#C9952A" },
      { stage: "Page Views", value: 65000, fill: "#1B3A6B" },
      { stage: "Add to Cart", value: 12000, fill: "#0369A1" },
      { stage: "Signups", value: 4800, fill: "#16A34A" },
    ],
    audienceDemographics: [
      { segment: "25-34", value: 35, fill: "#F5A623" },
      { segment: "35-44", value: 28, fill: "#1B3A6B" },
      { segment: "45-54", value: 18, fill: "#C9952A" },
      { segment: "18-24", value: 12, fill: "#16A34A" },
      { segment: "55+", value: 7, fill: "#7C3AED" },
    ],
    topContent: [
      { id: 1, title: "Poolside Luxury Suite Tour", platform: "instagram", views: 125000, likes: 8500, shares: 1200, ctr: 4.2 },
      { id: 2, title: "Chef's Special Brunch Menu", platform: "facebook", views: 89000, likes: 6200, shares: 890, ctr: 3.8 },
      { id: 3, title: "Wedding Venue Showcase", platform: "youtube", views: 67000, likes: 4100, shares: 650, ctr: 5.1 },
      { id: 4, title: "Corporate Event Package", platform: "linkedin", views: 45000, likes: 2800, shares: 420, ctr: 6.2 },
      { id: 5, title: "Spa & Wellness Retreat", platform: "instagram", views: 38000, likes: 3200, shares: 380, ctr: 3.5 },
    ],
    kpis: {
      totalSpend: 74000,
      conversions: 9200,
      avgCpa: 8.55,
      roas: 5.88,
      totalFollowers: 180000,
      pageViews: 12000,
    },
  };

  return NextResponse.json({ success: true, data: analytics });
});
