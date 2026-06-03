import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
      },
    }
  );
}

interface InviteRow {
  id: string;
  brand_id: string;
  brand_name: string;
  brand_emoji: string;
  owner_user_id: string;
  invited_email: string;
  role: 'viewer' | 'editor';
  token: string;
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

    const { token } = await req.json() as { token?: string };
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    // Find invitation
    const { data: invite, error: invErr } = await supabase
      .from("brand_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invErr || !invite) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

    const inv = invite as InviteRow;

    // Can't accept your own brand invitation
    if (inv.owner_user_id === user.id) {
      return NextResponse.json({ error: "own_brand" }, { status: 400 });
    }

    // Update invitation to accepted
    await supabase
      .from("brand_invitations")
      .update({ status: "accepted", member_user_id: user.id, accepted_at: new Date().toISOString() })
      .eq("id", inv.id);

    // Create brand_members row (upsert)
    await supabase
      .from("brand_members")
      .upsert({
        brand_id: inv.brand_id,
        brand_name: inv.brand_name,
        brand_emoji: inv.brand_emoji,
        owner_user_id: inv.owner_user_id,
        member_user_id: user.id,
        member_email: user.email!,
        role: inv.role,
      }, { onConflict: "brand_id,member_user_id" });

    return NextResponse.json({
      success: true,
      brand_id: inv.brand_id,
      brand_name: inv.brand_name,
      brand_emoji: inv.brand_emoji,
      role: inv.role,
      owner_user_id: inv.owner_user_id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Just get invitation info by token (for the accept page)
  try {
    const supabase = createClient();
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const { data: invite, error } = await supabase
      .from("brand_invitations")
      .select("brand_name, brand_emoji, invited_email, role, status, owner_user_id")
      .eq("token", token)
      .single();

    if (error || !invite) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(invite);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
