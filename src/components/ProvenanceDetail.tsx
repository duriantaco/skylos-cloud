'use client';

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";

type ProvenanceFile = {
  id: string;
  file_path: string;
  agent_authored: boolean;
  agent_name: string | null;
  agent_lines: [number, number][];
  indicators: { type: string; commit: string; detail: string }[];
};

const formatRanges = (ranges: [number, number][]) =>
  ranges.map(([start, end]) => (start === end ? `L${start}` : `L${start}-${end}`)).join(", ");

const describeIndicator = (type: string) => {
  switch (type) {
    case "author-email":
      return "Git author email matched an AI agent";
    case "co-author":
      return "Git co-author trailer matched an AI agent";
    case "commit-message":
      return "Commit message mentioned AI generation";
    default:
      return type;
  }
};

export default function ProvenanceDetail({
  scanId,
  files: initialFiles,
}: {
  scanId: string;
  files?: ProvenanceFile[];
}) {
  const [fetchedFiles, setFetchedFiles] = useState<ProvenanceFile[]>([]);
  const [loading, setLoading] = useState(initialFiles == null);
  const files = initialFiles ?? fetchedFiles;
  const isLoading = initialFiles ? false : loading;

  useEffect(() => {
    if (initialFiles) return;

    const fetchFiles = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("provenance_files")
        .select("*")
        .eq("scan_id", scanId)
        .eq("agent_authored", true)
        .order("file_path");

      if (data) setFetchedFiles(data as ProvenanceFile[]);
      setLoading(false);
    };
    fetchFiles();
  }, [initialFiles, scanId]);

  if (isLoading) {
    return <div className="mt-2 text-xs text-violet-500">Loading provenance details...</div>;
  }

  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {files.map((f) => (
        <div key={f.id} className="rounded-lg border border-violet-100 bg-white p-3">
          <div className="flex items-start gap-2">
            <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-violet-900">{f.file_path}</span>
                {f.agent_name && (
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                    {f.agent_name}
                  </span>
                )}
                {f.agent_lines && f.agent_lines.length > 0 && (
                  <span className="text-[10px] text-violet-500">{formatRanges(f.agent_lines)}</span>
                )}
              </div>

              <p className="mt-1 text-[11px] text-violet-700">
                Skylos attributed these changed lines to {f.agent_name || "an AI agent"} from git metadata.
                This is attribution evidence, not the security finding itself.
              </p>

              {f.indicators && f.indicators.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {f.indicators.map((indicator, index) => (
                    <div key={`${f.id}-${indicator.commit}-${index}`} className="rounded border border-violet-100 bg-violet-50 px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="font-semibold text-violet-800">{describeIndicator(indicator.type)}</span>
                        <span className="font-mono text-violet-500">{indicator.commit}</span>
                      </div>
                      <div className="mt-0.5 break-all text-[10px] text-violet-600">{indicator.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
