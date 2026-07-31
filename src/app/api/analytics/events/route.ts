import { NextResponse } from "next/server";
import {
  insertAnalyticsEvent,
  validateAnalyticsEvent,
} from "@/lib/analytics/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public write-only analytics ingest.
 * Always returns a small JSON body; never throws to the client UX path.
 * Does not expose analytics rows or secrets.
 */
export async function POST(request: Request) {
  try {
    // Ignore Next.js / browser prefetch when identifiable
    const purpose = request.headers.get("purpose") ?? "";
    const nextPrefetch = request.headers.get("next-router-prefetch");
    if (
      purpose.toLowerCase() === "prefetch" ||
      nextPrefetch === "1" ||
      request.headers.get("x-middleware-prefetch") === "1"
    ) {
      return NextResponse.json({ ok: true });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const validated = validateAnalyticsEvent(body);
    if (!validated.ok) {
      // Soft-fail for rate limits / bots / excluded paths — do not look like an outage
      const soft =
        validated.error === "rate_limited" ||
        validated.error === "bot_excluded" ||
        validated.error === "excluded_path";
      return NextResponse.json(
        { ok: soft },
        { status: soft ? 200 : 400 }
      );
    }

    const result = await insertAnalyticsEvent(validated.event);
    return NextResponse.json({ ok: result.ok });
  } catch (err) {
    console.error("[POST /api/analytics/events]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    // Never break the caller — acknowledge softly
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
