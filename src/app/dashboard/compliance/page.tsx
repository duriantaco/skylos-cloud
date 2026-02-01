import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Shield, Calendar, Zap, BookOpen, CheckCircle, XCircle } from "lucide-react";
import dogImg from "../../../../public/assets/favicon-96x96.png";

export default async function CompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(plan, name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) 
    return redirect("/dashboard");

  const orgId = member.org_id;
  const plan = (member.organizations as any)?.plan || "free";
  const canUseCompliance = ["team", "enterprise"].includes(plan);

  const { data: enabledFrameworks } = await supabase
    .from("org_compliance_settings")
    .select("*, compliance_frameworks(*)")
    .eq("org_id", orgId)
    .eq("enabled", true);

  const { data: allFrameworks } = await supabase
    .from("compliance_frameworks")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
            <Image src={dogImg} alt="Skylos" width={32} height={32} className="h-8 w-8 object-contain" priority />
            Skylos
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Beta
            </span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Docs
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900">Compliance</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Map findings to regulatory frameworks
            </p>
          </div>
        </div>

        {/* Upgrade CTA */}
        {!canUseCompliance && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Automate Your Compliance Reporting
                </h2>
                <p className="text-slate-600 mb-4 max-w-2xl">
                  Map security findings directly to PCI DSS, SOC2, HIPAA, and other frameworks. 
                  Generate audit-ready reports that show exactly which requirements are met.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/60 rounded-lg p-4">
                    <div className="font-semibold text-slate-900 mb-1">Before Skylos</div>
                    <p className="text-sm text-slate-600">
                      Weeks of manual evidence gathering and spreadsheet hell
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4">
                    <div className="font-semibold text-emerald-700 mb-1">With Skylos</div>
                    <p className="text-sm text-slate-600">
                      One-click compliance reports with automatic mapping
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
                >
                  Upgrade to Team — $199/mo
                  <Zap className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Frameworks Grid */}
        {canUseCompliance && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Frameworks</h2>
              
              {(!enabledFrameworks || enabledFrameworks.length === 0) ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                  <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No frameworks enabled yet</p>
                  <p className="text-sm text-slate-500">Select frameworks below to start tracking compliance</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enabledFrameworks.map((ef) => {
                    const fw = ef.compliance_frameworks as any;
                    return (
                      <div 
                        key={ef.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{fw.name}</h3>
                            <p className="text-sm text-slate-500">{fw.version}</p>
                          </div>
                          <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full">
                            Active
                          </div>
                        </div>
                        {ef.next_audit_date && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="w-4 h-4" />
                            Next audit: {new Date(ef.next_audit_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Frameworks */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Frameworks</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allFrameworks?.map((fw) => {
                  const isEnabled = enabledFrameworks?.some(
                    (ef) => (ef.compliance_frameworks as any)?.id === fw.id
                  );
                  
                  return (
                    <div 
                      key={fw.id}
                      className={`bg-white border rounded-xl p-5 transition ${
                        isEnabled 
                          ? "border-emerald-200 bg-emerald-50/30" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{fw.name}</h3>
                          <p className="text-sm text-slate-500">{fw.version}</p>
                        </div>
                        {isEnabled ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <button className="text-sm text-gray-700 hover:text-indigo-800 font-medium">
                            Enable
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{fw.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
