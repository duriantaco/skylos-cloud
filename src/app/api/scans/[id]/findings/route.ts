import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(500, Math.max(10, parseInt(url.searchParams.get('pageSize') || '100')));
  const category = url.searchParams.get('category');
  const isNew = url.searchParams.get('isNew') === 'true';
  const search = url.searchParams.get('search')?.trim();

  let query = supabase
    .from('findings')
    .select('*', { count: 'exact' })
    .eq('scan_id', id);

  if (category && category !== 'ALL') {
    if (category === 'SECURITY') {
      query = query.in('category', ['SECURITY', 'SECRET']);
    } else {
      query = query.eq('category', category);
    }
  }

  if (isNew) {
    query = query.eq('is_new', true).eq('is_suppressed', false);
  }

  if (search) {
    const sanitized = search.replace(/[%_\\]/g, '\\$&');
    query = query.or(`message.ilike.%${sanitized}%,file_path.ilike.%${sanitized}%,rule_id.ilike.%${sanitized}%`);
  }

  query = query.order('severity');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    findings: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    hasMore: to < (count || 0) - 1,
  });
}