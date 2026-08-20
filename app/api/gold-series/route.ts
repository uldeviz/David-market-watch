import { NextResponse } from "next/server";
import { fetchIntraday } from "@/lib/prices.mjs";
import { getSupabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [series, eventsRes] = await Promise.all([
      fetchIntraday("GOLD", 240).catch(() => []),
      getSupabaseAnon()
        .from("news_events")
        .select("id,title,impact_level,impact_score,published_at,assets")
        .contains("assets", ["GOLD"])
        .gte("published_at", new Date(Date.now() - 240 * 60_000).toISOString())
        .order("published_at", { ascending: false })
        .limit(30),
    ]);

    return NextResponse.json({
      series,
      events: eventsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err), series: [], events: [] }, { status: 200 });
  }
}
