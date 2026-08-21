import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Usa SEMPRE il client service_role (server-side, mai esposto al browser)
// perche' il client anon (usato dal resto della dashboard) e' di sola
// lettura via RLS — archiviare/eliminare deve passare per qui, non per una
// chiamata diretta da client a Supabase.

// PATCH { status: "ARCHIVED" | "ACTIVE" } -> archivia o ripristina.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    const status = body?.status;
    if (status !== "ARCHIVED" && status !== "ACTIVE") {
      return NextResponse.json({ error: "status deve essere ARCHIVED o ACTIVE" }, { status: 400 });
    }
    const supabase = getSupabaseService();
    const { error } = await supabase.from("news_events").update({ status }).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE -> cancellazione permanente, nessun modo di recuperarla dopo.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseService();
    const { error } = await supabase.from("news_events").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
