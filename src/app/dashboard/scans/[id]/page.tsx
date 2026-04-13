import { createClient } from "@/utils/supabase/server";
import ScanDetailsClient from "@/components/ScanDetailsClient";
import { redirect } from "next/navigation";

export default async function ScanDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: scan } = await supabase
    .from("scans")
    .select("id, tool, defense_score")
    .eq("id", id)
    .single();

  if (scan && (scan.tool === "skylos-defend" || !!scan.defense_score)) {
    redirect(`/dashboard/scans/${id}/defense`);
  }

  return <ScanDetailsClient />;
}
