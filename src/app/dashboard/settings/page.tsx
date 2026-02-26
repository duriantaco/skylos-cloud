import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Key, Shield, FolderOpen, MessageSquare, Hash, Users } from "lucide-react";
import { ensureWorkspace, getUserProjects, getProject } from "@/lib/ensureWorkspace";
import ApiKeySection from "@/components/settings/ApiKeySection";
import PolicyEditor from "@/components/settings/PolicyEditor";
import ProjectSwitcher from "@/components/settings/ProjectSwitcher";
import SlackIntegration from "@/components/settings/SlackIntegration";
import DiscordIntegration from "@/components/settings/DiscordIntegration";
import TeamMembers from "@/components/settings/TeamMembers";
import { createClient } from "@/utils/supabase/server";
import DevPlanToggle from "@/components/settings/DevPlanToggle";
import GitHubAppInstall from "@/components/settings/GitHubAppInstall"
import RepoUrlEditor from "@/components/settings/RepoUrlEditor";

async function updatePlan(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const plan = formData.get('plan') as string
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }
  
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()
  
  if (!membership) return { success: false }
  
  await supabase
    .from('organizations')
    .update({ plan })
    .eq('id', membership.org_id)
  
  revalidatePath('/dashboard/settings', 'layout')
  
  return { success: true, plan }
}

function NoWorkspaceState() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Workspace Not Found</h2>
          <p className="text-slate-600 mb-6">
            We couldn't find or create your workspace. Please try logging out and back in.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function NoProjectsState({ userPlan }: { userPlan: string }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Settings</h1>
        <p className="text-slate-500 mb-8">Manage your organization plan and project settings.</p>
        
        <div className={`rounded-xl p-6 mb-8 border-2 ${
          ['pro'].includes(userPlan)
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">
                Current Plan: 
                <span className={`ml-2 px-3 py-1 rounded-full text-sm ${
                  ['pro'].includes(userPlan)
                    ? 'bg-gray-700 text-white'
                    : 'bg-slate-600 text-white'
                }`}>
                  {userPlan === 'pro' ? '⚡ Pro' : 'Free'}
                </span>
              </h3>
              <p className="text-sm text-slate-600">
                {['pro'].includes(userPlan)
                  ? 'All features unlocked. Quality gates will block bad code.'
                  : 'Get notified about issues but can\'t block commits.'}
              </p>
            </div>
            
            {!['pro'].includes(userPlan) && (
              <div className="flex items-center gap-3">
                <a href="mailto:founder@skylos.dev" className="px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition text-sm">
                  Book a Demo
                </a>
                <a href="/dashboard/billing" className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-indigo-700 text-sm">
                  Buy Credits
                </a>
              </div>
            )}
          </div>
        </div>

        <DevPlanToggle currentPlan={userPlan} />
        
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h2>
          <p className="text-slate-600 mb-6">
            Create a project first to configure settings.
          </p>
          <Link 
            href="/dashboard/projects" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Create Project
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectPicker({ projects, userPlan }: { 
  projects: { id: string; name: string; repo_url?: string | null }[]; 
  userPlan: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Settings</h1>
        <p className="text-slate-500 mb-8">Manage your organization plan and project settings.</p>

        <div className={`rounded-xl p-6 mb-8 border-2 ${
          ['pro'].includes(userPlan)
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">
                Current Plan: 
                <span className={`ml-2 px-3 py-1 rounded-full text-sm ${
                  ['pro'].includes(userPlan)
                    ? 'bg-gray-700 text-white'
                    : 'bg-slate-600 text-white'
                }`}>
                  {userPlan === 'pro' ? '⚡ Pro' : 'Free'}
                </span>
              </h3>
              <p className="text-sm text-slate-600">
                {['pro'].includes(userPlan)
                  ? 'All features unlocked across all projects. Quality gates will block bad code.'
                  : 'Get notified about issues but can\'t block commits.'}
              </p>
            </div>
            
            {!['pro'].includes(userPlan) && (
              <div className="flex items-center gap-3">
                <a href="mailto:founder@skylos.dev" className="px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition text-sm">
                  Book a Demo
                </a>
                <a href="/dashboard/billing" className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-indigo-700 text-sm">
                  Buy Credits
                </a>
              </div>
            )}
          </div>
        </div>

        <DevPlanToggle currentPlan={userPlan} />

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-900">Select a Project to Configure</h2>
            <p className="text-sm text-slate-500 mt-1">
              Project-specific settings like API keys and analysis rules.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/settings?project=${p.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div>
                  <div className="font-medium text-slate-900">{p.name}</div>
                  {p.repo_url && (
                    <div className="text-xs text-slate-500 mt-0.5">{p.repo_url}</div>
                  )}
                </div>
                <span className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition">
                  Configure →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { user, orgId, supabase } = await ensureWorkspace();
  
  if (!user) {
    redirect("/login");
  }

  if (!orgId) {
    return <NoWorkspaceState />;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single();

  const userPlan = org?.plan || 'free';

  // Fetch current user's role for RBAC UI
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  const userRole = membership?.role || 'member';
  const canManageSettings = ['admin', 'owner'].includes(userRole);

  const projects = await getUserProjects(supabase, orgId);

  if (!projects || projects.length === 0) {
    return <NoProjectsState userPlan={userPlan} />;
  }

  const params = await searchParams;
  let projectId = params.project;

  if (!projectId) {
    return <ProjectPicker projects={projects} userPlan={userPlan} />;
  }

  const project = await getProject(supabase, projectId, orgId);

  if (!project) {
    return <ProjectPicker projects={projects} userPlan={userPlan} />;
  }

  const pc = (project.policy_config as Record<string, any>) ?? {};
  const excludePaths = Array.isArray(pc.exclude_paths) ? pc.exclude_paths : [];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/dashboard/settings" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 text-sm font-medium transition">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
        
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Project Settings: {project.name}</h1>
        <p className="text-slate-500 mb-6">Manage API keys, quality gates, and analysis configuration.</p>

        <ProjectSwitcher projects={projects} selectedProjectId={project.id} />

        <RepoUrlEditor projectId={project.id} currentUrl={project.repo_url} />

        <GitHubAppInstall 
          currentPlan={userPlan}
          githubInstallationId={project.github_installation_id}
          repoUrl={project.repo_url}
          projectId={project.id}
        />

        <div className={`rounded-xl p-6 mb-8 border-2 ${
          ['pro'].includes(userPlan)
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">
                Organization Plan: 
                <span className={`ml-2 px-3 py-1 rounded-full text-sm ${
                  ['pro'].includes(userPlan)
                    ? 'bg-gray-700 text-white'
                    : 'bg-slate-600 text-white'
                }`}>
                  {userPlan === 'pro' ? '⚡ Pro' : 'Free'}
                </span>
              </h3>
              <p className="text-sm text-slate-600">
                {['pro'].includes(userPlan)
                  ? 'All features unlocked for all projects. Quality gates will block bad code.'
                  : 'Get notified about issues but can\'t block commits.'}
              </p>
            </div>
            
            {!['pro'].includes(userPlan) && (
              <div className="flex items-center gap-3">
                <a href="mailto:founder@skylos.dev" className="px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition text-sm">
                  Book a Demo
                </a>
                <a href="/dashboard/billing" className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-indigo-700 text-sm">
                  Buy Credits
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">

          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Team</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Manage team members and their roles.
                </p>
              </div>
            </div>

            <TeamMembers currentUserId={user.id} currentUserRole={userRole} />
          </section>

          {canManageSettings && (
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Key className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">API Configuration</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Use this token to authenticate your CLI and CI/CD pipelines for <strong>{project.name}</strong>.
                </p>
              </div>
            </div>

            <ApiKeySection projectId={project.id} />
          </section>
          )}

          {canManageSettings && (
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Slack Integration</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Get notified in Slack when quality gates fail or recover.
                </p>
              </div>
            </div>

            {['pro'].includes(userPlan) ? (
              <SlackIntegration projectId={project.id} />
            ) : (
              <div className="relative opacity-50 pointer-events-none">
                <SlackIntegration projectId={project.id} />
                <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                  <div className="text-center">
                    <p className="font-semibold mb-2">🔒 Pro Feature</p>
                    <a href="/dashboard/billing" className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm">
                      Buy Credits
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>
          )}

          {canManageSettings && (
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <Hash className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Discord Integration</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Get notified in Discord when quality gates fail or recover.
                </p>
              </div>
            </div>

            {['pro'].includes(userPlan) ? (
              <DiscordIntegration projectId={project.id} />
            ) : (
              <div className="relative opacity-50 pointer-events-none">
                <DiscordIntegration projectId={project.id} />
                <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                  <div className="text-center">
                    <p className="font-semibold mb-2">🔒 Pro Feature</p>
                    <a href="/dashboard/billing" className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm">
                      Buy Credits
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>
          )}

          {canManageSettings && (
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Analysis Configuration</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Configure thresholds, gates, categories, and exclude paths for <strong>{project.name}</strong>.
                </p>
              </div>
            </div>

            <PolicyEditor
              initialConfig={pc}
              initialExcludePaths={excludePaths}
              projectId={project.id}
            />
          </section>
          )}

        </div>
      </div>
    </div>
  );
}
