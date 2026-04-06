import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing authorization code." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not complete sign-in." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, redirectTo: next });
}
