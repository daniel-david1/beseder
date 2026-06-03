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

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { brand_id, brand_name, brand_emoji, invited_email, role } = await req.json() as {
      brand_id?: string;
      brand_name?: string;
      brand_emoji?: string;
      invited_email?: string;
      role?: string;
    };
    if (!brand_id || !invited_email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Check if already a member
    const { data: existing } = await supabase
      .from("brand_members")
      .select("id")
      .eq("brand_id", brand_id)
      .eq("member_email", invited_email)
      .single();
    if (existing) return NextResponse.json({ error: "already_member" }, { status: 409 });

    // Check pending invite
    const { data: existingInvite } = await supabase
      .from("brand_invitations")
      .select("id, token")
      .eq("brand_id", brand_id)
      .eq("invited_email", invited_email)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json({ token: (existingInvite as { id: string; token: string }).token });
    }

    const { data: invite, error } = await supabase
      .from("brand_invitations")
      .insert({
        brand_id,
        brand_name: brand_name ?? "",
        brand_emoji: brand_emoji ?? '📁',
        owner_user_id: user.id,
        invited_email,
        role: role ?? 'editor',
      })
      .select("token")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ token: (invite as { token: string }).token });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
