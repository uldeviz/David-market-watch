import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Due modalita':
//  - carico iniziale: ?sinceMinutes=1440&limit=80 -> ultime 24h
//  - polling successivo: ?after=<updated_at ISO> -> SOLO righe cambiate da
//    allora (nuove notizie + prezzi/verdetti aggiornati su notizie gia'
//    viste). Tiene il traffico verso Supabase molto piu' basso del
//    ri-scaricare tutta la lista ad ogni giro.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const after = searchParams.get("after");

    const supabase = getSupabaseAnon();
    let query = supabase.from("news_events").select("*").order("updated_at", { ascending: false }).limit(limit);

    if (after) {
      query = query.gt("updated_at", after);
    } else {
      const sinceMinutes = Number(searchParams.get("sinceMinutes") ?? 1440);
      const since = new Date(Date.now() - sinceMinutes * 60_000).toISOString();
      query = query.gte("published_at", since);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ events: data ?? [], serverTime: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
