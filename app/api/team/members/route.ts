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

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const brand_id = req.nextUrl.searchParams.get("brand_id");
    if (!brand_id) return NextResponse.json({ error: "Missing brand_id" }, { status: 400 });

    const [{ data: members }, { data: invitations }] = await Promise.all([
      supabase.from("brand_members").select("*").eq("brand_id", brand_id).eq("owner_user_id", user.id),
      supabase.from("brand_invitations").select("*").eq("brand_id", brand_id).eq("owner_user_id", user.id).eq("status", "pending"),
    ]);

    return NextResponse.json({ members: members ?? [], invitations: invitations ?? [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { member_id, invitation_id } = await req.json() as { member_id?: string; invitation_id?: string };

    if (member_id) {
      await supabase.from("brand_members").delete().eq("id", member_id).eq("owner_user_id", user.id);
    }
    if (invitation_id) {
      await supabase.from("brand_invitations").update({ status: "revoked" }).eq("id", invitation_id).eq("owner_user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { member_id, role } = await req.json() as { member_id?: string; role?: string };
    if (!member_id || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    await supabase.from("brand_members").update({ role }).eq("id", member_id).eq("owner_user_id", user.id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
