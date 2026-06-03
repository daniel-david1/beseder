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

function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

interface MembershipRow {
  role: string;
}

// GET: member fetches owner's brand data
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const brand_id = req.nextUrl.searchParams.get("brand_id");
    const owner_user_id = req.nextUrl.searchParams.get("owner_user_id");
    if (!brand_id || !owner_user_id) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    // Verify membership
    const { data: membership } = await supabase
      .from("brand_members")
      .select("role")
      .eq("brand_id", brand_id)
      .eq("member_user_id", user.id)
      .eq("owner_user_id", owner_user_id)
      .single();

    if (!membership) return NextResponse.json({ error: "No access" }, { status: 403 });

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on this server" }, { status: 500 });
    }

    const { data, error } = await adminClient
      .from("user_data")
      .select("brands")
      .eq("user_id", owner_user_id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Owner data not found" }, { status: 404 });

    // Find the specific brand
    const brands = data.brands as Array<{ id: string }>;
    const brand = brands?.find(b => b.id === brand_id);
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    return NextResponse.json({ brand, role: (membership as MembershipRow).role });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: member (editor) saves changes back to owner's brand
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { brand_id, owner_user_id, brand } = await req.json() as {
      brand_id?: string;
      owner_user_id?: string;
      brand?: unknown;
    };
    if (!brand_id || !owner_user_id || !brand) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Verify editor membership
    const { data: membership } = await supabase
      .from("brand_members")
      .select("role")
      .eq("brand_id", brand_id)
      .eq("member_user_id", user.id)
      .eq("owner_user_id", owner_user_id)
      .single();

    if (!membership) return NextResponse.json({ error: "No access" }, { status: 403 });
    if ((membership as MembershipRow).role !== 'editor') return NextResponse.json({ error: "Read only" }, { status: 403 });

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on this server" }, { status: 500 });
    }

    // Fetch current brands
    const { data: ownerData } = await adminClient
      .from("user_data")
      .select("brands")
      .eq("user_id", owner_user_id)
      .single();

    if (!ownerData) return NextResponse.json({ error: "Owner not found" }, { status: 404 });

    const brands = (ownerData.brands as Array<{ id: string }>) ?? [];
    const idx = brands.findIndex(b => b.id === brand_id);
    if (idx === -1) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    brands[idx] = brand as { id: string };

    await adminClient
      .from("user_data")
      .upsert({ user_id: owner_user_id, brands, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
