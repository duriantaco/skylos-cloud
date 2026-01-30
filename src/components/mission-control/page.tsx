// app/dashboard/mission-control/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MissionControl from "@/components/mission-control/MissionControl";

export default async function MissionControlPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) return redirect("/dashboard");

  return <MissionControl orgId={member.org_id} />;
}