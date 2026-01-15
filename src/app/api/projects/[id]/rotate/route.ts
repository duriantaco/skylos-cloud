import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const newKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

  const { error } = await supabase
    .from("projects")
    .update({ api_key: newKey })
    .eq("id", id);

  if (error) 
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, apiKey: newKey });
}