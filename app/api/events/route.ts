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
//
// ?status=ACTIVE (default) o ARCHIVED -> il feed principale vede solo
// ACTIVE, la pagina /archivio chiede ARCHIVED. Nota: se una notizia viene
// archiviata da un'altra scheda mentre questa e' aperta col polling
// "after", quella scheda non la vede piu' sparire in automatico (il poll
// filtra per status, quindi semplicemente non ricompare) — serve un
// refresh manuale in quel caso raro.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 300);
    const after = searchParams.get("after");
    const status = searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

    const supabase = getSupabaseAnon();
    let query = supabase
      .from("news_events")
      .select("*")
      .eq("status", status)
      .order("updated_at", { ascending: false })
      .limit(limit);

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
