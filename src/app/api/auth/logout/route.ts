// Auth — Logout (stateless, just returns success)
import { ok } from "@/lib/hms";

export async function POST() {
  return ok({ loggedOut: true });
}
