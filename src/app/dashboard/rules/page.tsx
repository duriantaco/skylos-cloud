import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Code2, FileCode, Shield, Zap, BookOpen,
  ToggleLeft, ToggleRight, Trash2, Pencil
} from "lucide-react";
import dogImg from "../../../../public/assets/favicon-96x96.png";
import { CreateRuleModal } from "@/components/rules/CreateRuleModal";
import { RuleActions } from "@/components/rules/RuleActions";

const RULE_LIMITS: Record<string, number> = {
  free: 0,
  pro: 20,
  team: 70,
  enterprise: 999999
};

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(plan, name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) return redirect("/dashboard");

  const orgId = member.org_id;
  const plan = (member.organizations as any)?.plan || "free";
  const canUseRules = ["pro", "team", "enterprise"].includes(plan);
  const canUsePython = ["team", "enterprise"].includes(plan);
  const maxRules = RULE_LIMITS[plan] || 0;

  // Get custom rules
  const { data: rules } = await supabase
    .from("custom_rules")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const ruleCount = rules?.length || 0;

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900">Custom Rules</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Custom Rules</h1>
            <p className="text-slate-500 text-sm mt-1">
              Enforce your organization's coding standards
            </p>
          </div>
          
          {canUseRules && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                {ruleCount} / {maxRules === 999999 ? '∞' : maxRules} rules
              </span>
              <CreateRuleModal 
                orgId={orgId} 
                canUsePython={canUsePython}
                disabled={ruleCount >= maxRules}
              />
            </div>
          )}
        </div>

        {/* Upgrade CTA for free users */}
        {!canUseRules && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Shield className="w-8 h-8 text-gray-700" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Enforce Your Standards Across All Repos
                </h2>
                <p className="text-slate-600 mb-4 max-w-2xl">
                  Custom rules let you codify your organization's specific requirements. 
                  Ensure every endpoint uses your auth decorator, every service inherits 
                  from BaseService, and every database call uses parameterized queries.
                </p>
                <div className="grid md:grid-cols-2 gap-2 mb-6 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                    YAML-based rules (no code required)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                    Sync rules across all repositories
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                    Block PRs that violate policies
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                    Python plugins for advanced logic
                  </div>
                </div>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  Upgrade to Pro — $49/mo
                  <Zap className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        {canUseRules && (
          <div className="space-y-4">
            {/* Templates hint */}
            {ruleCount === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
                <Code2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No custom rules yet
                </h3>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                  Create your first rule to start enforcing your coding standards.
                  Start from a template or write your own.
                </p>
                <CreateRuleModal orgId={orgId} canUsePython={canUsePython} />
              </div>
            )}

            {/* Rules */}
            {rules && rules.length > 0 && (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div 
                    key={rule.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg ${
                          rule.enabled 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "bg-slate-100 text-slate-400"
                        }`}>
                          {rule.rule_type === "python" 
                            ? <Code2 className="w-5 h-5" />
                            : <FileCode className="w-5 h-5" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium text-slate-900">
                              {rule.rule_id}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              rule.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                              rule.severity === "HIGH" ? "bg-orange-100 text-orange-700" :
                              rule.severity === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {rule.severity}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                              {rule.category}
                            </span>
                            {!rule.enabled && (
                              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
                                Disabled
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-900">{rule.name}</h3>
                          {rule.description && (
                            <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <RuleActions rule={rule} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}