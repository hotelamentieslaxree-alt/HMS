// POST /api/ai/chat — AI chat endpoint using z-ai-web-dev-sdk
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

// Suggestions based on context
const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    "What's the current occupancy rate?",
    "Show me today's revenue summary",
    "Any important alerts I should know about?",
  ],
  reservations: [
    "How many check-ins today?",
    "Show pending reservations",
    "What's the cancellation rate this week?",
  ],
  rooms: [
    "Which rooms need housekeeping?",
    "Show out-of-order rooms",
    "What's the average room rate today?",
  ],
  hospital: [
    "How many patients are currently admitted?",
    "Show today's appointment schedule",
    "Which doctors are on duty?",
  ],
  inventory: [
    "Which items are running low on stock?",
    "Show pending purchase orders",
    "What's the inventory valuation?",
  ],
  finance: [
    "What's the outstanding receivables?",
    "Show expense summary this month",
    "Which invoices are overdue?",
  ],
  tasks: [
    "What are my pending tasks?",
    "Show urgent tasks for today",
    "How many tasks were completed this week?",
  ],
  default: [
    "What can you help me with?",
    "Show me a summary of today's operations",
    "Any alerts or issues I should know about?",
  ],
};

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.message) {
    return fail("message is required", "VALIDATION", 400);
  }

  const message: string = body.message;
  const context: string = body.context || "default";

  let reply: string;

  try {
    // Try using z-ai-web-dev-sdk
    const { createSdk } = await import("z-ai-web-dev-sdk");
    const sdk = createSdk({ apiKey: process.env.ZAI_API_KEY || "" });

    const systemPrompt = `You are ARIA AI, the intelligent assistant for the ARIA Hospitality Operating System.
You help hotel staff with operations, reservations, guest management, housekeeping, F&B, finance, and more.
Be concise, professional, and helpful. If you don't know specific data, suggest where to find it in the system.
Current context: ${context}`;

    const response = await sdk.llm.chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "default",
    });

    reply = response?.choices?.[0]?.message?.content || response?.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch {
    // Fallback: return a helpful mock response
    reply = generateFallbackResponse(message, context);
  }

  // Get context-appropriate suggestions
  const suggestions = CONTEXT_SUGGESTIONS[context] || CONTEXT_SUGGESTIONS.default;

  // Audit (best-effort, don't log full conversation for privacy)
  await logAudit({
    propertyId,
    action: "AI_CHAT",
    entityType: "AiChat",
    newValue: { context, messageLength: message.length },
  });

  // Broadcast AI activity (for live feed / admin dashboard)
  await broadcast("ai:chat", { context }, propertyId);

  return ok({ reply, suggestions });
});

/** Generate a helpful fallback response when the SDK is unavailable */
function generateFallbackResponse(message: string, context: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("occupancy") || lower.includes("occupy")) {
    return "I'd recommend checking the Dashboard module for real-time occupancy data. You can see the current occupancy rate, available rooms, and room status grid there.";
  }

  if (lower.includes("revenue") || lower.includes("income") || lower.includes("sales")) {
    return "For revenue insights, visit the Finance module or check the Dashboard for today's revenue KPIs including ADR, RevPAR, and TRevPAR.";
  }

  if (lower.includes("reservation") || lower.includes("booking")) {
    return "You can manage all reservations in the Reservations module. Use filters to find specific bookings by date, status, or guest name.";
  }

  if (lower.includes("patient") || lower.includes("doctor") || lower.includes("appointment")) {
    return "The Hospital module provides full patient, doctor, and appointment management. Check the appointments view for today's schedule.";
  }

  if (lower.includes("stock") || lower.includes("inventory") || lower.includes("supplier")) {
    return "The Inventory module tracks stock levels, vendor management, and purchase orders. Check the low-stock alerts for items that need reordering.";
  }

  if (lower.includes("invoice") || lower.includes("expense") || lower.includes("bill")) {
    return "Financial records are in the Finance module. You can view invoices, expenses, and cashbook entries with filtering by status and date.";
  }

  if (lower.includes("task") || lower.includes("todo") || lower.includes("pending")) {
    return "The Tasks module helps you track and manage tasks across departments. Filter by status, priority, or assignee to find what you need.";
  }

  if (lower.includes("help") || lower.includes("what can")) {
    return "I'm ARIA AI, your hospitality operations assistant. I can help you navigate the system, understand modules like Reservations, Front Office, Housekeeping, POS, Hospital, Inventory, Finance, and more. Just ask about any area of operations!";
  }

  return `I understand you're asking about "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}". While I'm currently in limited mode, I recommend exploring the ${context !== "default" ? context : "Dashboard"} module for the most up-to-date information. Feel free to ask about specific modules or operations!`;
}
