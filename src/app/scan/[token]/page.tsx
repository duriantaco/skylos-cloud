import { supabaseAdmin } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ScanReportView from "./ScanReportView";

type Scan = {
  id: string;
  commit_hash: string;
  branch: string;
  created_at: string;
  quality_gate_passed: boolean;
  stats: {
    new_issues?: number;
    legacy_issues?: number;
    suppressed_new_issues?: number;
  };
  projects: { name: string } | null;
};

type Finding = {
  id: string;
  category: string;
  severity: string;
  message: string;
  file_path: string;
  line_number: number;
  rule_id: string;
  snippet?: string | null;
  is_new: boolean;
  is_suppressed: boolean;
};

async function getScanByToken(token: string) {
  const { data: scan } = await supabaseAdmin
    .from("scans")
    .select("id, commit_hash, branch, created_at, quality_gate_passed, stats, is_public, share_token, projects(name)")
    .eq("share_token", token)
    .eq("is_public", true)
    .single();

  return scan as (Scan & { is_public: boolean; share_token: string }) | null;
}

async function getFindingsForScan(scanId: string) {
  const { data } = await supabaseAdmin
    .from("findings")
    .select("id, category, severity, message, file_path, line_number, rule_id, snippet, is_new, is_suppressed")
    .eq("scan_id", scanId)
    .order("severity")
    .limit(500);

  return (data || []) as Finding[];
}

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const scan = await getScanByToken(token);

  if (!scan) {
    return { title: "Scan Not Found — Skylos" };
  }

  const projectName = scan.projects?.name || "Unknown Project";
  const totalFindings = (scan.stats?.new_issues || 0) + (scan.stats?.legacy_issues || 0) + (scan.stats?.suppressed_new_issues || 0);
  const status = scan.quality_gate_passed ? "Passed" : "Failed";

  return {
    title: `Skylos Scan Report — ${projectName}`,
    description: `Quality Gate ${status}. ${totalFindings} finding(s) detected. Scanned with Skylos — free code security for your team.`,
    openGraph: {
      title: `Skylos Scan Report — ${projectName}`,
      description: `Quality Gate ${status}. ${totalFindings} finding(s) detected.`,
      siteName: "Skylos",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `Skylos Scan Report — ${projectName}`,
      description: `Quality Gate ${status}. ${totalFindings} finding(s) detected.`,
    },
  };
}

export default async function PublicScanPage({ params }: PageProps) {
  const { token } = await params;
  const scan = await getScanByToken(token);

  if (!scan) notFound();

  const findings = await getFindingsForScan(scan.id);

  return (
    <ScanReportView
      scan={{
        id: scan.id,
        commit_hash: scan.commit_hash,
        branch: scan.branch,
        created_at: scan.created_at,
        quality_gate_passed: scan.quality_gate_passed,
        stats: scan.stats,
        projectName: scan.projects?.name || "Unknown Project",
      }}
      findings={findings}
    />
  );
}
