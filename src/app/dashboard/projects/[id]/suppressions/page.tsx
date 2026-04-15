import { redirect } from "next/navigation";
import SuppressionsTable from "@/components/suppressions/SuppressionsTable";
import { ensureWorkspace } from "@/lib/ensureWorkspace";

export default async function SuppressionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, orgId } = await ensureWorkspace();
  const { id } = await params;

  if (!user) return redirect("/login");
  if (!orgId) return redirect("/dashboard");

  return (
    <div className="py-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Suppression audit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review who suppressed what, why, and when it expires. Revoke anytime.
        </p>
      </div>

      <SuppressionsTable projectId={id} />
    </div>
  );
}
