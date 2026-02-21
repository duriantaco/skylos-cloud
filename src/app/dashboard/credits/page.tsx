import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CreditsDisplay from '@/components/credits/CreditsDisplay';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default async function CreditsPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id, organizations(id, name, credits, plan)')
    .eq('user_id', user.id)
    .maybeSingle();

  const org = member?.organizations as any;
  const isUnlimited = org?.plan === 'enterprise';

  const { data: featureCosts } = await supabase
    .from('feature_credit_costs')
    .select('*')
    .eq('enabled', true)
    .order('cost_credits', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Credits</h1>
          <p className="text-slate-600">
            Manage your credit balance and view transaction history
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CreditsDisplay />
          </div>

          {!isUnlimited && (
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-bold">Upgrade to Enterprise</h3>
              </div>
              <p className="text-sm text-purple-100 mb-4">
                Get unlimited credits, compliance features, and priority support
              </p>
              <Link
                href="/contact-sales"
                className="block w-full px-4 py-2 bg-white text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-50 transition text-center"
              >
                Contact Sales
              </Link>
            </div>
          )}
        </div>

        {/* Feature Costs */}
        {featureCosts && featureCosts.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Credit Costs</h2>
              <p className="text-sm text-slate-600 mt-1">
                How many credits each feature uses
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {featureCosts.map((feature: any) => (
                <div key={feature.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{feature.description}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {feature.cost_period === 'monthly' ? 'Per month' :
                       feature.cost_period === 'per_use' ? 'Per use' : 'One-time'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900">
                      {feature.cost_credits}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">credits</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isUnlimited && (
          <div className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Purchase Credits</h2>
              <p className="text-sm text-slate-600 mt-1">
                Buy credits to unlock premium features
              </p>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="border-2 border-slate-200 rounded-xl p-6 hover:border-slate-300 transition">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Starter
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-slate-900">500</span>
                    <span className="text-lg text-slate-500 ml-2">credits</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    $9
                  </div>
                  <p className="text-xs text-slate-500 mb-4">$0.018 per credit</p>
                  <Link
                    href="/dashboard/billing"
                    className="block w-full px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition text-center"
                  >
                    Buy Now
                  </Link>
                </div>

                <div className="border-2 border-slate-200 rounded-xl p-6 hover:border-slate-300 transition">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Builder
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-slate-900">2,500</span>
                    <span className="text-lg text-slate-500 ml-2">credits</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-slate-900">$39</span>
                    <span className="text-sm text-emerald-600 font-semibold">Save 11%</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">$0.016 per credit</p>
                  <Link
                    href="/dashboard/billing"
                    className="block w-full px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition text-center"
                  >
                    Buy Now
                  </Link>
                </div>

                <div className="border-2 border-slate-900 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full">
                    POPULAR
                  </div>
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Team
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-slate-900">10,000</span>
                    <span className="text-lg text-slate-500 ml-2">credits</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-slate-900">$129</span>
                    <span className="text-sm text-emerald-600 font-semibold">Save 28%</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">$0.013 per credit</p>
                  <Link
                    href="/dashboard/billing"
                    className="block w-full px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition text-center"
                  >
                    Buy Now
                  </Link>
                </div>

                <div className="border-2 border-slate-200 rounded-xl p-6 hover:border-slate-300 transition">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Scale
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-slate-900">50,000</span>
                    <span className="text-lg text-slate-500 ml-2">credits</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-slate-900">$499</span>
                    <span className="text-sm text-emerald-600 font-semibold">Save 45%</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">$0.010 per credit</p>
                  <Link
                    href="/dashboard/billing"
                    className="block w-full px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition text-center"
                  >
                    Buy Now
                  </Link>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center mt-6">
                Credits never expire and roll over forever
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Credits - Skylos',
  description: 'Manage your credit balance and view transaction history'
};
