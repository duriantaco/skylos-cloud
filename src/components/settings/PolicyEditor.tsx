'use client'
import { useState } from "react";
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";

type GateMode = "zero-new" | "category" | "severity" | "both";

export default function PolicyEditor({
  initialConfig,
  initialExcludePaths,
  projectId
}: {
  initialConfig: Record<string, any>,
  initialExcludePaths?: string[],
  projectId: string
}) {
  const pc = initialConfig || {};
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Sections expand/collapse
  const [showThresholds, setShowThresholds] = useState(true);
  const [showGate, setShowGate] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showExclude, setShowExclude] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Custom rules
  const [rules, setRules] = useState<string[]>(pc.custom_rules || []);

  // Quality thresholds
  const [complexityEnabled, setComplexityEnabled] = useState(pc.complexity_enabled ?? true);
  const [complexityThreshold, setComplexityThreshold] = useState(pc.complexity_threshold ?? 10);
  const [nestingEnabled, setNestingEnabled] = useState(pc.nesting_enabled ?? true);
  const [nestingThreshold, setNestingThreshold] = useState(pc.nesting_threshold ?? 4);
  const [functionLengthEnabled, setFunctionLengthEnabled] = useState(pc.function_length_enabled ?? true);
  const [functionLengthThreshold, setFunctionLengthThreshold] = useState(pc.function_length_threshold ?? 50);
  const [argCountEnabled, setArgCountEnabled] = useState(pc.arg_count_enabled ?? true);
  const [argCountThreshold, setArgCountThreshold] = useState(pc.arg_count_threshold ?? 5);

  // Category toggles
  const [securityEnabled, setSecurityEnabled] = useState(pc.security_enabled ?? true);
  const [secretsEnabled, setSecretsEnabled] = useState(pc.secrets_enabled ?? true);
  const [qualityEnabled, setQualityEnabled] = useState(pc.quality_enabled ?? true);
  const [deadCodeEnabled, setDeadCodeEnabled] = useState(pc.dead_code_enabled ?? true);

  // Exclude paths
  const [excludePaths, setExcludePaths] = useState<string[]>(initialExcludePaths || []);

  // Gate config
  const [gateEnabled, setGateEnabled] = useState(pc.gate?.enabled ?? true);
  const [gateMode, setGateMode] = useState<GateMode>(pc.gate?.mode ?? "zero-new");
  const [byCat, setByCat] = useState<Record<string, number>>(pc.gate?.by_category || {
    SECURITY: 0, SECRET: 0, QUALITY: 0, DEAD_CODE: 0
  });
  const [bySev, setBySev] = useState<Record<string, number>>(pc.gate?.by_severity || {
    CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0
  });

  const addRule = () => setRules([...rules, ""]);
  const updateRule = (i: number, v: string) => {
    const newRules = [...rules];
    newRules[i] = v;
    setRules(newRules);
  };
  const removeRule = (i: number) => setRules(rules.filter((_, idx) => idx !== i));

  const addExcludePath = () => setExcludePaths([...excludePaths, ""]);
  const updateExcludePath = (i: number, v: string) => {
    const newPaths = [...excludePaths];
    newPaths[i] = v;
    setExcludePaths(newPaths);
  };
  const removeExcludePath = (i: number) => setExcludePaths(excludePaths.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/policy', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          custom_rules: rules.filter(r => r.trim()),
          exclude_paths: excludePaths.filter(p => p.trim()),
          // Thresholds
          complexity_enabled: complexityEnabled,
          complexity_threshold: complexityThreshold,
          nesting_enabled: nestingEnabled,
          nesting_threshold: nestingThreshold,
          function_length_enabled: functionLengthEnabled,
          function_length_threshold: functionLengthThreshold,
          arg_count_enabled: argCountEnabled,
          arg_count_threshold: argCountThreshold,
          // Categories
          security_enabled: securityEnabled,
          secrets_enabled: secretsEnabled,
          quality_enabled: qualityEnabled,
          dead_code_enabled: deadCodeEnabled,
          // Gate
          gate: {
            enabled: gateEnabled,
            mode: gateMode,
            by_category: byCat,
            by_severity: bySev,
          }
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, open, onToggle, children }: { title: string, open: boolean, onToggle: () => void, children: React.ReactNode }) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <span className="font-medium text-slate-900">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );

  const ThresholdRow = ({ label, desc, enabled, onEnabledChange, value, onValueChange, min, max }: any) => (
    <div className="flex items-center justify-between gap-4 p-3 bg-white border border-slate-100 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <div>
          <div className="text-sm font-medium text-slate-800">{label}</div>
          <div className="text-xs text-slate-500">{desc}</div>
        </div>
      </div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onValueChange(Math.max(min, value - 1))}
          disabled={!enabled || value <= min}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-lg border border-slate-200 text-slate-600 font-medium"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Math.min(max, Math.max(min, Number(e.target.value) || min));
            onValueChange(v);
          }}
          disabled={!enabled}
          className="w-16 text-center bg-white border-y border-slate-200 py-1.5 text-sm font-mono disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => onValueChange(Math.min(max, value + 1))}
          disabled={!enabled || value >= max}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-lg border border-slate-200 text-slate-600 font-medium"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      
      {/* Quality Thresholds */}
      <Section title="Quality Thresholds" open={showThresholds} onToggle={() => setShowThresholds(!showThresholds)}>
        <p className="text-xs text-slate-500 mb-3">
          Configure limits for code quality rules. Synced via <code className="bg-slate-100 px-1 rounded">skylos sync pull</code>
        </p>
        <div className="space-y-2">
          <ThresholdRow
            label="Cyclomatic Complexity"
            desc="Max branches per function"
            enabled={complexityEnabled}
            onEnabledChange={setComplexityEnabled}
            value={complexityThreshold}
            onValueChange={setComplexityThreshold}
            min={5} max={30}
          />
          <ThresholdRow
            label="Nesting Depth"
            desc="Max levels of indentation"
            enabled={nestingEnabled}
            onEnabledChange={setNestingEnabled}
            value={nestingThreshold}
            onValueChange={setNestingThreshold}
            min={2} max={10}
          />
          <ThresholdRow
            label="Function Length"
            desc="Max lines per function"
            enabled={functionLengthEnabled}
            onEnabledChange={setFunctionLengthEnabled}
            value={functionLengthThreshold}
            onValueChange={setFunctionLengthThreshold}
            min={20} max={200}
          />
          <ThresholdRow
            label="Argument Count"
            desc="Max parameters per function"
            enabled={argCountEnabled}
            onEnabledChange={setArgCountEnabled}
            value={argCountThreshold}
            onValueChange={setArgCountThreshold}
            min={3} max={15}
          />
        </div>
      </Section>

      {/* Quality Gate */}
      <Section title="Quality Gate" open={showGate} onToggle={() => setShowGate(!showGate)}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-500">Control what blocks a PR</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={gateEnabled}
              onChange={(e) => setGateEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-slate-700">Enable gate</span>
          </label>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-500 block mb-1">Gate Mode</label>
          <select
            value={gateMode}
            onChange={(e) => setGateMode(e.target.value as GateMode)}
            disabled={!gateEnabled}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="zero-new">Zero-new (block any new issue)</option>
            <option value="category">By category thresholds</option>
            <option value="severity">By severity thresholds</option>
            <option value="both">Category + severity</option>
          </select>
        </div>

        {(gateMode === "category" || gateMode === "both") && gateEnabled && (
          <div className="mb-4">
            <div className="text-xs font-medium text-slate-700 mb-2">Max new issues by category</div>
            <div className="grid grid-cols-2 gap-2">
              {["SECURITY", "SECRET", "QUALITY", "DEAD_CODE"].map(cat => (
                <div key={cat} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded px-3 py-2">
                  <span className="text-xs font-medium text-slate-700">{cat}</span>
                  <input
                    type="number"
                    min={0}
                    value={byCat[cat] ?? 0}
                    onChange={(e) => setByCat({ ...byCat, [cat]: Number(e.target.value) })}
                    className="w-16 text-center bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {(gateMode === "severity" || gateMode === "both") && gateEnabled && (
          <div>
            <div className="text-xs font-medium text-slate-700 mb-2">Max new issues by severity</div>
            <div className="grid grid-cols-2 gap-2">
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => (
                <div key={sev} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded px-3 py-2">
                  <span className="text-xs font-medium text-slate-700">{sev}</span>
                  <input
                    type="number"
                    min={0}
                    value={bySev[sev] ?? 0}
                    onChange={(e) => setBySev({ ...bySev, [sev]: Number(e.target.value) })}
                    className="w-16 text-center bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Scan Categories */}
      <Section title="Scan Categories" open={showCategories} onToggle={() => setShowCategories(!showCategories)}>
        <p className="text-xs text-slate-500 mb-3">Enable or disable scan categories</p>
        <div className="space-y-2">
          {[
            { key: 'security', label: 'Security', desc: 'SQL injection, XSS, command injection', color: 'bg-red-500', state: securityEnabled, setter: setSecurityEnabled },
            { key: 'secrets', label: 'Secrets', desc: 'Hardcoded API keys, passwords', color: 'bg-amber-500', state: secretsEnabled, setter: setSecretsEnabled },
            { key: 'quality', label: 'Quality', desc: 'Complexity, nesting, function length', color: 'bg-purple-500', state: qualityEnabled, setter: setQualityEnabled },
            { key: 'deadcode', label: 'Dead Code', desc: 'Unused functions, imports, variables', color: 'bg-blue-500', state: deadCodeEnabled, setter: setDeadCodeEnabled },
          ].map(cat => (
            <label key={cat.key} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                <div>
                  <div className="text-sm font-medium text-slate-800">{cat.label}</div>
                  <div className="text-xs text-slate-500">{cat.desc}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={cat.state}
                onChange={(e) => cat.setter(e.target.checked)}
                className="h-4 w-4 rounded"
              />
            </label>
          ))}
        </div>
      </Section>

      {/* Exclude Paths */}
      <Section title="Exclude Paths" open={showExclude} onToggle={() => setShowExclude(!showExclude)}>
        <p className="text-xs text-slate-500 mb-3">Files/directories to skip. Supports glob patterns.</p>
        <div className="space-y-2">
          {excludePaths.map((path, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => updateExcludePath(idx, e.target.value)}
                placeholder="e.g. tests/**, **/migrations/*"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
              <button onClick={() => removeExcludePath(idx)} className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addExcludePath}
            className="w-full border border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Path
          </button>
        </div>
      </Section>

      {/* Custom Rules */}
      <Section title="Custom Governance Rules" open={showRules} onToggle={() => setShowRules(!showRules)}>
        <p className="text-xs text-slate-500 mb-3">Additional rules for AI Auditor prompt</p>
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => updateRule(idx, e.target.value)}
                placeholder="e.g. Ensure all API routes return JSON"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
              <button onClick={() => removeRule(idx)} className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addRule}
            className="w-full border border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>
      </Section>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          After saving, run <code className="bg-slate-100 px-1 rounded">skylos sync pull</code> to update CLI
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}