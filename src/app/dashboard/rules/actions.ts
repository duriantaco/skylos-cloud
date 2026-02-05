"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

async function getOrgContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(plan)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) {
    return { error: "No organization found" };
  }

  const plan = (member.organizations as any)?.plan || "free";
  
  return { 
    supabase, 
    user, 
    orgId: member.org_id, 
    plan,
    canUseRules: ["free", "pro", "team", "enterprise"].includes(plan),
    canUsePython: ["team", "enterprise"].includes(plan)
  };
}

function getRuleLimit(plan: string): number {
  const limits: Record<string, number> = {
    free: 3,
    pro: 50,
    team: 100,
    enterprise: 999999
  };
  return limits[plan] || 0;
}


export async function createRule(formData: FormData) {
  const ctx = await getOrgContext();
  if ("error" in ctx) 
    return { success: false, error: ctx.error };
  
  const { supabase, orgId, plan, canUseRules, canUsePython, user } = ctx;

  if (!canUseRules) {
    return { success: false, error: "Upgrade to Pro to use custom rules" };
  }

  const { count } = await supabase
    .from("custom_rules")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  const limit = getRuleLimit(plan);
  if ((count || 0) >= limit) {
    return { 
      success: false, 
      error: `Rule limit reached (${limit} rules on ${plan} plan)`,
      upgrade_url: "/dashboard/settings?upgrade=true",
    };
  }

  const ruleType = String(formData.get("rule_type") || "yaml");
  
  if (ruleType === "python" && !canUsePython) {
    return { success: false, error: "Python rules require Team plan or higher" };
  }

  let yamlConfig = null;
  const yamlConfigStr = formData.get("yaml_config");
  if (yamlConfigStr) {
    try {
      yamlConfig = JSON.parse(String(yamlConfigStr));
    } catch {
      return { success: false, error: "Invalid JSON in rule configuration" };
    }
  }

  const { data, error } = await supabase
    .from("custom_rules")
    .insert({
      org_id: orgId,
      rule_id: String(formData.get("rule_id")).toUpperCase(),
      name: String(formData.get("name")),
      description: formData.get("description") || null,
      severity: String(formData.get("severity") || "MEDIUM"),
      category: String(formData.get("category") || "custom"),
      rule_type: ruleType,
      yaml_config: yamlConfig,
      python_code: ruleType === "python" ? formData.get("python_code") : null,
      enabled: true,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A rule with this ID already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/rules");
  return { success: true, rule: data };
}

export async function updateRule(ruleId: string, formData: FormData) {
  const ctx = await getOrgContext();
  if ("error" in ctx) 
    return { success: false, error: ctx.error };
  
  const { supabase, orgId, canUsePython } = ctx;

  const ruleType = String(formData.get("rule_type") || "yaml");
  
  if (ruleType === "python" && !canUsePython) {
    return { success: false, error: "Python rules require Team plan or higher" };
  }

  let yamlConfig = null;
  const yamlConfigStr = formData.get("yaml_config");
  if (yamlConfigStr) {
    try {
      yamlConfig = JSON.parse(String(yamlConfigStr));
    } catch {
      return { success: false, error: "Invalid JSON in rule configuration" };
    }
  }

  const { error } = await supabase
    .from("custom_rules")
    .update({
      name: String(formData.get("name")),
      description: formData.get("description") || null,
      severity: String(formData.get("severity") || "MEDIUM"),
      category: String(formData.get("category") || "custom"),
      rule_type: ruleType,
      yaml_config: yamlConfig,
      python_code: ruleType === "python" ? formData.get("python_code") : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", ruleId)
    .eq("org_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/rules");
  return { success: true };
}

export async function toggleRule(ruleId: string, enabled: boolean) {
  const ctx = await getOrgContext();
  if ("error" in ctx) 
    return { success: false, error: ctx.error };
  
  const { supabase, orgId } = ctx;

  const { error } = await supabase
    .from("custom_rules")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", ruleId)
    .eq("org_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/rules");
  return { success: true, enabled };
}

export async function deleteRule(ruleId: string) {
  const ctx = await getOrgContext();
  if ("error" in ctx) 
    return { success: false, error: ctx.error };
  
  const { supabase, orgId } = ctx;

  const { error } = await supabase
    .from("custom_rules")
    .delete()
    .eq("id", ruleId)
    .eq("org_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/rules");
  return { success: true };
}

export async function duplicateRule(ruleId: string) {
  const ctx = await getOrgContext();
  if ("error" in ctx) 
    return { success: false, error: ctx.error };
  
  const { supabase, orgId, plan, user } = ctx;

  const { count } = await supabase
    .from("custom_rules")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  const limit = getRuleLimit(plan);
  if ((count || 0) >= limit) {
    return { success: false, error: `Rule limit reached` };
  }

  const { data: original, error: fetchError } = await supabase
    .from("custom_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !original) {
    return { success: false, error: "Rule not found" };
  }


  const { data, error } = await supabase
    .from("custom_rules")
    .insert({
      org_id: orgId,
      rule_id: `${original.rule_id}-COPY`,
      name: `${original.name} (Copy)`,
      description: original.description,
      severity: original.severity,
      category: original.category,
      rule_type: original.rule_type,
      yaml_config: original.yaml_config,
      python_code: original.python_code,
      enabled: false,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/rules");
  return { success: true, rule: data };
}