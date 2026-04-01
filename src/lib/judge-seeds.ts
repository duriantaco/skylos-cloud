export type JudgeSeedRepo = {
  host: string;
  owner: string;
  name: string;
  sourceUrl: string;
  defaultBranch: string;
  language: string;
  requestedBy: string;
  requestedAnalysisModes: ("static" | "agent")[];
};

export const DEFAULT_JUDGE_SEED_REPOS: JudgeSeedRepo[] = [
  {
    host: "github",
    owner: "psf",
    name: "black",
    sourceUrl: "https://github.com/psf/black",
    defaultBranch: "main",
    language: "python",
    requestedBy: "judge-seed",
    requestedAnalysisModes: ["static"],
  },
  {
    host: "github",
    owner: "networkx",
    name: "networkx",
    sourceUrl: "https://github.com/networkx/networkx",
    defaultBranch: "main",
    language: "python",
    requestedBy: "judge-seed",
    requestedAnalysisModes: ["static"],
  },
  {
    host: "github",
    owner: "mitmproxy",
    name: "mitmproxy",
    sourceUrl: "https://github.com/mitmproxy/mitmproxy",
    defaultBranch: "main",
    language: "python",
    requestedBy: "judge-seed",
    requestedAnalysisModes: ["static"],
  },
];
