"use server"

import { revalidatePath } from "next/cache"
import { ensureWorkspace } from "@/lib/ensureWorkspace"
import { supabaseAdmin } from "@/utils/supabase/admin"

export async function devUpdatePlan(formData: FormData) {
  if (process.env.BETA_DEV_TOGGLE !== "true") {
    return { success: false, error: "Dev toggle disabled" }
  }

  const plan = String(formData.get("plan") ?? "free")

  const { user, orgId, supabase } = await ensureWorkspace()
  if (!user || !orgId) return { success: false, error: "No workspace" }

  const { data: staffRow } = await supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!staffRow) return { success: false, error: "Forbidden (not staff)" }

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update({ plan })
    .eq("id", orgId)
    .select("plan")
    .maybeSingle()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Update failed" }
  }

  revalidatePath("/dashboard/settings")
  return { success: true, plan: data.plan }
}
