import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SuppressionsTable from "@/components/suppressions/SuppressionsTable";

export default async function SuppressionsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log('[dashboard/projects/[id]/suppressions] getUser:', { user: user?.email ?? null, error: authErr?.message ?? null });
  if (!user) {
    console.log('[dashboard/projects/[id]/suppressions] no user, redirecting to /login');
    return redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/projects/${id}`} className="text-slate-500 hover:text-slate-900 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="font-bold text-lg text-slate-900">Suppressions</div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Suppression Audit</h1>
          <p className="text-slate-500 text-sm mt-1">
            Review who suppressed what, why, and when it expires. Revoke anytime.
          </p>
        </div>

        <SuppressionsTable projectId={id} />
      </div>
    </main>
  );
}
