export type TaintEndpoint = {
  file?: string | null;
  line?: number | null;
};

export type TaintFlow = {
  source?: TaintEndpoint | null;
  sink?: TaintEndpoint | null;
};

export type TriageFinding = {
  file_path: string;
  message?: string | null;
  snippet?: string | null;
  taint_flow?: TaintFlow | null;
};

type TriageFindingsResult = Promise<{ data: TriageFinding[] | null }>;

type TriageFindingsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => {
          limit: (count: number) => TriageFindingsResult;
        };
      };
    };
  };
};

export const TRIAGE_FINDINGS_SELECT =
  "id, rule_id, message, file_path, line_number, severity, category, snippet, taint_flow";

export function fetchTriageFindings(
  supabase: TriageFindingsClient,
  issueGroupId: string
): TriageFindingsResult {
  return supabase
    .from("findings")
    .select(TRIAGE_FINDINGS_SELECT)
    .eq("group_id", issueGroupId)
    .order("created_at", { ascending: false })
    .limit(5);
}
