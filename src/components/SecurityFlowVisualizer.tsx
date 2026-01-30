'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, ChevronDown, ChevronRight, 
  Copy, Check, Zap, Database, Globe, Terminal, FileCode,
  ArrowDown, Eye, X, Play, Pause, ExternalLink, Loader2,
  Code, AlertOctagon, Key, Sparkles
} from 'lucide-react';

export type FlowNode = {
  type: string;
  label: string;
  file: string;
  line: number;
  code: string;
  annotation?: string;
  tainted_vars?: string[];
  is_dangerous?: boolean;
  vulnerability?: string;
};

export type FlowData = {
  finding_id: string;
  rule_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  file: string;
  line: number;
  
  source: FlowNode | null;
  transforms: FlowNode[];
  sink: FlowNode | null;
  
  attack_example?: {
    payload: string;
    result: string;
  } | null;
  
  fix_suggestion?: {
    title: string;
    code: string;
    explanation: string;
  } | null;
  
  snippet?: string;
  repo_url?: string;
  commit_hash?: string;
  has_flow_data: boolean;
};

type Props = {
  findingId: string;
  onClose: () => void;
  repoUrl?: string;
  commitHash?: string;
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || '').toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-50 text-red-700 ring-red-600/30",
    HIGH: "bg-orange-50 text-orange-700 ring-orange-600/30",
    MEDIUM: "bg-yellow-50 text-yellow-700 ring-yellow-600/30",
    LOW: "bg-blue-50 text-blue-700 ring-blue-600/30"
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset uppercase tracking-wide ${styles[s] || styles.MEDIUM}`}>
      {s}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const c = (confidence || '').toUpperCase();
  const styles: Record<string, string> = {
    HIGH: "bg-emerald-50 text-emerald-700",
    MEDIUM: "bg-amber-50 text-amber-700",
    LOW: "bg-slate-100 text-slate-600"
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ${styles[c] || styles.MEDIUM}`}>
      {c} confidence
    </span>
  );
}

function NodeIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  const iconMap: Record<string, React.ComponentType<any>> = {
    user_input: Globe,
    sql_execute: Database,
    command_exec: Terminal,
    file_write: FileCode,
    html_output: Code,
    hardcoded: Key,
    exposure: AlertOctagon,
    unknown: Zap,
  };
  const Icon = iconMap[type] || Zap;
  return <Icon className={className} />;
}

function CodeBlock({ 
  code, 
  annotation, 
  highlightDanger, 
  taintedVars = [] 
}: { 
  code: string; 
  annotation?: string; 
  highlightDanger?: boolean;
  taintedVars?: string[];
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code: string) => {
    let highlighted = code
      // Strings
      .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-emerald-400">$&</span>')
      // Keywords
      .replace(/\b(def|class|return|if|else|elif|for|while|import|from|as|try|except|with|async|await|raise|lambda|pass|break|continue)\b/g, '<span class="text-purple-400">$1</span>')
      // Common functions/methods
      .replace(/\b(request|cursor|execute|get|args|params|query|system|popen|run|subprocess|eval|exec|open|write|read)\b/g, '<span class="text-blue-400">$1</span>')
      // Numbers
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');
    
    taintedVars.forEach(v => {
      const regex = new RegExp(`\\b(${v})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="text-red-400 font-semibold" style="text-decoration: underline wavy #f87171">$1</span>');
    });
    
    return highlighted;
  };

  return (
    <div className={`relative group rounded-lg overflow-hidden ${highlightDanger ? 'ring-2 ring-red-500/50' : ''}`}>
      <div className="bg-slate-900 text-slate-300 p-4 font-mono text-sm overflow-x-auto">
        <pre dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
      </div>
      {annotation && (
        <div className={`px-4 py-2 text-xs border-t ${
          highlightDanger 
            ? 'bg-red-950/50 border-red-900/50 text-red-300' 
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}>
          💡 {annotation}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-600 hover:text-white transition-all"
        title="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function FlowConnector({ isAnimating, delay = 0 }: { isAnimating: boolean; delay?: number }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="relative h-6 w-0.5 bg-gradient-to-b from-slate-300 to-slate-400 rounded-full overflow-hidden">
        {isAnimating && (
          <div 
            className="absolute w-full h-3 bg-gradient-to-b from-red-400 to-red-600 rounded-full animate-flow-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        )}
      </div>
      <ArrowDown className="w-4 h-4 text-slate-400 -mt-0.5" />
    </div>
  );
}

function FlowNodeCard({ 
  node, 
  type, 
  isAnimating, 
  delay = 0,
  onViewInCode
}: { 
  node: FlowNode; 
  type: 'source' | 'transform' | 'sink';
  isAnimating: boolean;
  delay?: number;
  onViewInCode?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const typeStyles = {
    source: {
      border: "border-blue-200 hover:border-blue-300",
      bg: "bg-gradient-to-br from-blue-50 to-white",
      iconBg: "bg-blue-100 text-blue-600",
      label: "SOURCE",
      labelColor: "text-blue-600 bg-blue-100"
    },
    transform: {
      border: node.is_dangerous 
        ? "border-red-300 hover:border-red-400 shadow-red-100" 
        : "border-slate-200 hover:border-slate-300",
      bg: node.is_dangerous 
        ? "bg-gradient-to-br from-red-50/50 to-white" 
        : "bg-white",
      iconBg: node.is_dangerous 
        ? "bg-red-100 text-red-600" 
        : "bg-slate-100 text-slate-600",
      label: node.is_dangerous ? "⚠️ DANGER" : "TRANSFORM",
      labelColor: node.is_dangerous 
        ? "text-red-600 bg-red-100" 
        : "text-slate-500 bg-slate-100"
    },
    sink: {
      border: "border-red-300 hover:border-red-400",
      bg: "bg-gradient-to-br from-red-50 to-white",
      iconBg: "bg-red-100 text-red-600",
      label: "SINK",
      labelColor: "text-red-600 bg-red-100"
    }
  };
  
  const style = typeStyles[type];
  
  return (
    <div 
      className={`relative rounded-xl border-2 ${style.border} ${style.bg} transition-all duration-300 shadow-sm hover:shadow-md`}
      style={{
        animation: isAnimating ? 'pulse-highlight 0.6s ease-out' : 'none',
        animationDelay: `${delay}ms`
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`p-2.5 rounded-lg ${style.iconBg} transition-transform ${isExpanded ? '' : 'scale-90'}`}>
          <NodeIcon type={node.type} className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.labelColor}`}>
              {style.label}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {node.file}:{node.line}
            </span>
          </div>
          <h4 className="font-semibold text-slate-900 truncate">{node.label}</h4>
        </div>
        
        <div className="p-1 rounded hover:bg-slate-100 transition">
          {isExpanded 
            ? <ChevronDown className="w-4 h-4 text-slate-400" /> 
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <CodeBlock 
            code={node.code} 
            annotation={node.annotation}
            highlightDanger={type === 'sink' || node.is_dangerous}
            taintedVars={node.tainted_vars}
          />
          
          {node.vulnerability && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span className="text-sm text-red-700">{node.vulnerability}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttackSimulator({ 
  attackExample, 
  isOpen, 
  onToggle 
}: { 
  attackExample: { payload: string; result: string }; 
  isOpen: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="border border-amber-200 rounded-xl bg-gradient-to-br from-amber-50 to-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Attack Simulation</h4>
            <p className="text-xs text-slate-500">See how this could be exploited</p>
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
              Malicious Payload
            </label>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-red-400 overflow-x-auto">
              {attackExample.payload}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
              Resulting Execution
            </label>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-slate-300 overflow-x-auto">
              {attackExample.result}
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700 font-medium">This demonstrates real attack potential</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FixSuggestion({ 
  fix, 
  isOpen, 
  onToggle,
  onApplyFix
}: { 
  fix: { title: string; code: string; explanation: string }; 
  isOpen: boolean; 
  onToggle: () => void;
  onApplyFix?: () => void;
}) {
  return (
    <div className="border border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-emerald-50/50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Recommended Fix</h4>
            <p className="text-xs text-slate-500">{fix.title}</p>
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          <CodeBlock code={fix.code} annotation={fix.explanation} />
          
          {onApplyFix && (
            <button 
              onClick={onApplyFix}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Sparkles className="w-4 h-4" />
              Apply Fix
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecurityFlowVisualizer({ findingId, onClose, repoUrl, commitHash }: Props) {
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAnimating, setIsAnimating] = useState(true);
  const [showAttack, setShowAttack] = useState(false);
  const [showFix, setShowFix] = useState(true);

  useEffect(() => {
    const fetchFlow = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/findings/${findingId}/flow`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load flow data');
        }
        const data = await res.json();
        setFlowData(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load flow data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFlow();
  }, [findingId]);

  useEffect(() => {
    if (!loading && flowData) {
      const timer = setTimeout(() => setIsAnimating(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [loading, flowData]);

  const getGitHubUrl = (file: string, line: number) => {
    const repo = flowData?.repo_url || repoUrl;
    const commit = flowData?.commit_hash || commitHash;
    if (!repo || !commit || commit === 'local') return null;
    const clean = repo.replace(/\/$/, '').replace('.git', '');
    return `${clean}/blob/${commit}/${file}#L${line}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-2xl">
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading security flow analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !flowData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-2xl">
        <div className="p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">Could not load flow data</h3>
          <p className="text-sm text-slate-500 mb-4">{error || 'No flow analysis available for this finding'}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!flowData.source && !flowData.sink) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-2xl">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{flowData.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-8 text-center">
          <Eye className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">Flow analysis not available</h3>
          <p className="text-sm text-slate-500">This finding type doesn't support taint flow visualization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SeverityBadge severity={flowData.severity} />
              <ConfidenceBadge confidence={flowData.confidence} />
              <span className="text-xs text-slate-400 font-mono">{flowData.rule_id}</span>
              {!flowData.has_flow_data && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Simplified view</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{flowData.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">{flowData.file}:{flowData.line}</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`p-2 rounded-lg transition ${isAnimating ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={isAnimating ? "Pause animation" : "Replay animation"}
            >
              {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Flow Visualization */}
      <div className="p-6 space-y-0">
        {flowData.source && (
          <FlowNodeCard 
            node={flowData.source} 
            type="source" 
            isAnimating={isAnimating} 
            delay={0}
          />
        )}
        
        {flowData.transforms.map((transform, i) => (
          <React.Fragment key={i}>
            <FlowConnector isAnimating={isAnimating} delay={(i + 1) * 400} />
            <FlowNodeCard 
              node={transform} 
              type="transform" 
              isAnimating={isAnimating} 
              delay={(i + 1) * 400}
            />
          </React.Fragment>
        ))}
        
        {flowData.sink && (
          <>
            <FlowConnector isAnimating={isAnimating} delay={(flowData.transforms.length + 1) * 400} />
            <FlowNodeCard 
              node={flowData.sink} 
              type="sink" 
              isAnimating={isAnimating} 
              delay={(flowData.transforms.length + 1) * 400}
            />
          </>
        )}
      </div>
      
      {/* Attack & Fix Panels */}
      <div className="p-6 pt-0 space-y-4">
        {flowData.attack_example && (
          <AttackSimulator 
            attackExample={flowData.attack_example}
            isOpen={showAttack}
            onToggle={() => setShowAttack(!showAttack)}
          />
        )}
        
        {flowData.fix_suggestion && (
          <FixSuggestion 
            fix={flowData.fix_suggestion}
            isOpen={showFix}
            onToggle={() => setShowFix(!showFix)}
          />
        )}
      </div>
      
      {/* Footer */}
      <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Eye className="w-4 h-4" />
          <span>Taint flow analysis by Skylos</span>
        </div>
        <div className="flex items-center gap-2">
          {getGitHubUrl(flowData.file, flowData.line) && (
            <a 
              href={getGitHubUrl(flowData.file, flowData.line)!}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-lg shadow-slate-900/10 inline-flex items-center gap-1.5"
            >
              View in GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes flow-pulse {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(500%); opacity: 0; }
        }
        .animate-flow-pulse {
          animation: flow-pulse 0.8s ease-in-out infinite;
        }
        @keyframes pulse-highlight {
          0%, 100% { transform: scale(1); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          50% { transform: scale(1.01); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15); }
        }
      `}</style>
    </div>
  );
}