import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Coins,
  Filter,
  Gift,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { ensureWorkspace } from "@/lib/ensureWorkspace";
import { getEffectivePlan } from "@/lib/entitlements";

const PAGE_SIZE = 50;

type TransactionType = "purchase" | "deduction" | "refund" | "bonus";

type SearchParams = Promise<{
  type?: string;
  page?: string;
}>;

type TransactionRow = {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: TransactionType;
  description: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
};

function normalizeType(value: string | undefined): TransactionType | "all" {
  if (value === "purchase" || value === "deduction" || value === "refund" || value === "bonus") {
    return value;
  }
  return "all";
}

function normalizePage(value: string | undefined): number {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number) {
  return amount > 0 ? `+${amount}` : `${amount}`;
}

function typePill(type: TransactionType) {
  const styles: Record<TransactionType, string> = {
    purchase: "bg-emerald-50 text-emerald-700 border-emerald-200",
    deduction: "bg-slate-100 text-slate-700 border-slate-200",
    refund: "bg-blue-50 text-blue-700 border-blue-200",
    bonus: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const labels: Record<TransactionType, string> = {
    purchase: "Purchase",
    deduction: "Spend",
    refund: "Refund",
    bonus: "Bonus",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function typeIcon(type: TransactionType) {
  const common = "h-4 w-4";
  switch (type) {
    case "purchase":
      return <ArrowUpRight className={`${common} text-emerald-600`} />;
    case "refund":
      return <RotateCcw className={`${common} text-blue-600`} />;
    case "bonus":
      return <Gift className={`${common} text-amber-600`} />;
    default:
      return <Receipt className={`${common} text-slate-500`} />;
  }
}

function detailEntries(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];

  const preferredKeys = [
    "feature_key",
    "framework",
    "project_id",
    "scan_id",
    "scan_id_a",
    "scan_id_b",
    "issue_group_id",
    "finding_id",
    "pack_id",
    "ls_order_id",
    "refund_reason",
    "type",
  ];

  return preferredKeys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== "")
    .map((key) => ({
      key,
      value: String(metadata[key]),
    }));
}

function summaryLabel(type: TransactionType | "all") {
  switch (type) {
    case "purchase":
      return "Purchases";
    case "deduction":
      return "Spend";
    case "refund":
      return "Refunds";
    case "bonus":
      return "Bonuses";
    default:
      return "All transactions";
  }
}

export default async function BillingHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedType = normalizeType(params.type);
  const page = normalizePage(params.page);

  const { user, orgId, supabase } = await ensureWorkspace();
  if (!user) redirect("/login");
  if (!orgId) redirect("/dashboard");

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, credits, credits_updated_at, plan, pro_expires_at")
    .eq("id", orgId)
    .single();

  if (!organization) {
    redirect("/dashboard");
  }

  const effectivePlan = getEffectivePlan({
    plan: organization.plan || "free",
    pro_expires_at: organization.pro_expires_at || null,
  });

  let countQuery = supabase
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  let dataQuery = supabase
    .from("credit_transactions")
    .select("id, amount, balance_after, transaction_type, description, created_at, metadata, created_by")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (selectedType !== "all") {
    countQuery = countQuery.eq("transaction_type", selectedType);
    dataQuery = dataQuery.eq("transaction_type", selectedType);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ count }, { data: transactions, error: txError }] = await Promise.all([
    countQuery,
    dataQuery.range(from, to),
  ]);

  if (txError) {
    console.error("Failed to load credit transaction history:", txError);
  }

  const rows = (transactions || []) as TransactionRow[];
  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const filterHref = (type: TransactionType | "all") =>
    type === "all" ? "/dashboard/billing/history" : `/dashboard/billing/history?type=${type}`;

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (selectedType !== "all") query.set("type", selectedType);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `/dashboard/billing/history?${suffix}` : "/dashboard/billing/history";
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link
              href="/dashboard/billing"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to billing
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Credit History</h1>
            <p className="mt-1 text-sm text-slate-500">
              Full audit trail for credits added, spent, refunded, or granted to this workspace.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current balance</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {effectivePlan === "enterprise" ? "Unlimited" : (organization.credits || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Updated {organization.credits_updated_at ? formatDate(organization.credits_updated_at) : "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scope</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{summaryLabel(selectedType)}</div>
            <div className="mt-1 text-xs text-slate-500">{totalCount} ledger rows</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</div>
            <div className="mt-2 text-xl font-bold capitalize text-slate-900">{effectivePlan}</div>
            <div className="mt-1 text-xs text-slate-500">{organization.name || "Workspace"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page size</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{PAGE_SIZE}</div>
            <div className="mt-1 text-xs text-slate-500">Newest first</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</div>
            <div className="mt-2 text-xl font-bold text-slate-900">
              {page} / {totalPages}
            </div>
            <div className="mt-1 text-xs text-slate-500">Pages</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4 text-slate-500" />
              Filter
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "deduction", "purchase", "refund", "bonus"] as const).map((type) => {
                const active = selectedType === type;
                return (
                  <Link
                    key={type}
                    href={filterHref(type)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {summaryLabel(type)}
                  </Link>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <Coins className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-900">No transactions in this view</h2>
              <p className="mt-1 text-sm text-slate-500">
                Try another filter, or return to billing to buy credits and unlock cloud actions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((transaction) => {
                const details = detailEntries(transaction.metadata);
                return (
                  <div key={transaction.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {typeIcon(transaction.transaction_type)}
                          {typePill(transaction.transaction_type)}
                          <span className="text-xs text-slate-500">{formatDate(transaction.created_at)}</span>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {transaction.description}
                        </div>

                        {details.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {details.map((detail) => (
                              <span
                                key={`${transaction.id}-${detail.key}`}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                              >
                                {detail.key}: {detail.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div
                          className={`text-sm font-mono font-semibold ${
                            transaction.amount > 0 ? "text-emerald-600" : "text-slate-700"
                          }`}
                        >
                          {formatAmount(transaction.amount)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Balance after: {transaction.balance_after.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-sm text-slate-500">
              Showing {from + 1}–{Math.min(from + rows.length, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={hasPrevious ? pageHref(page - 1) : "#"}
                aria-disabled={!hasPrevious}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                  hasPrevious
                    ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                    : "border-slate-100 text-slate-300 pointer-events-none"
                }`}
              >
                Previous
              </Link>
              <Link
                href={hasNext ? pageHref(page + 1) : "#"}
                aria-disabled={!hasNext}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                  hasNext
                    ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                    : "border-slate-100 text-slate-300 pointer-events-none"
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
