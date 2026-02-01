"use client";

import { useState } from "react";
import { createRule } from "@/app/dashboard/rules/actions";
import { X, Plus, Code2, FileText, AlertTriangle } from "lucide-react";

const SEVERITY_OPTIONS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const CATEGORY_OPTIONS = [
  { value: "security", label: "Security" },
  { value: "architecture", label: "Architecture" },
  { value: "style", label: "Code Style" },
  { value: "performance", label: "Performance" },
  { value: "custom", label: "Custom" },
];

const TEMPLATES = {
  auth_decorator: {
    name: "Require Auth Decorator",
    rule_id: "CUSTOM-AUTH-001",
    severity: "CRITICAL",
    category: "security",
    description: "Ensure all API endpoints have authentication",
    yaml_config: {
      pattern: {
        type: "function",
        decorators: {
          has_any: ["app.route", "app.get", "app.post", "app.put", "app.delete"],
          must_also_have_any: ["require_auth", "login_required", "authenticated"]
        }
      },
      message: "API endpoint missing authentication decorator"
    }
  },
  no_raw_sql: {
    name: "No Raw SQL Strings",
    rule_id: "CUSTOM-SQL-001",
    severity: "HIGH",
    category: "security",
    description: "Block dynamic SQL string construction",
    yaml_config: {
      pattern: {
        type: "call",
        function_match: ["execute", "executemany"],
        args: { position: 0, is_dynamic: true }
      },
      message: "Use parameterized queries instead of string formatting"
    }
  },
  service_inheritance: {
    name: "Service Class Inheritance",
    rule_id: "CUSTOM-ARCH-001",
    severity: "MEDIUM",
    category: "architecture",
    description: "All service classes must inherit from BaseService",
    yaml_config: {
      pattern: {
        type: "class",
        name_pattern: "*Service",
        must_inherit_any: ["BaseService"]
      },
      message: "Service classes must inherit from BaseService"
    }
  }
};

export function CreateRuleModal({ 
  orgId, 
  canUsePython,
  disabled = false 
}: { 
  orgId: string;
  canUsePython: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ruleType, setRuleType] = useState<"yaml" | "python">("yaml");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [ruleId, setRuleId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [category, setCategory] = useState("custom");
  const [yamlConfig, setYamlConfig] = useState("");
  const [pythonCode, setPythonCode] = useState("");

  const applyTemplate = (key: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[key];
    setRuleId(t.rule_id);
    setName(t.name);
    setDescription(t.description);
    setSeverity(t.severity);
    setCategory(t.category);
    setYamlConfig(JSON.stringify(t.yaml_config, null, 2));
  };

  const resetForm = () => {
    setRuleId("");
    setName("");
    setDescription("");
    setSeverity("MEDIUM");
    setCategory("custom");
    setYamlConfig("");
    setPythonCode("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("rule_id", ruleId);
    formData.set("name", name);
    formData.set("description", description);
    formData.set("severity", severity);
    formData.set("category", category);
    formData.set("rule_type", ruleType);
    
    if (ruleType === "yaml") {
      formData.set("yaml_config", yamlConfig);
    } else {
      formData.set("python_code", pythonCode);
    }

    const result = await createRule(formData);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to create rule");
      return;
    }

    setOpen(false);
    resetForm();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        Create Rule
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Create Custom Rule</h2>
          <button
            onClick={() => { setOpen(false); resetForm(); }}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Rule Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Rule Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRuleType("yaml")}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  ruleType === "yaml"
                    ? "border-gray-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">YAML Config</span>
              </button>
              <button
                type="button"
                onClick={() => canUsePython && setRuleType("python")}
                disabled={!canUsePython}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  ruleType === "python"
                    ? "border-gray-500 bg-indigo-50 text-indigo-700"
                    : !canUsePython
                    ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Code2 className="w-5 h-5" />
                <span className="font-medium">Python</span>
                {!canUsePython && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Team+</span>
                )}
              </button>
            </div>
          </div>

          {/* Templates */}
          {ruleType === "yaml" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Quick Templates</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key as keyof typeof TEMPLATES)}
                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rule ID *</label>
              <input
                type="text"
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value.toUpperCase())}
                placeholder="ACME-001"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Require Auth Decorator"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what this rule enforces..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rule Config */}
          {ruleType === "yaml" ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Rule Configuration (JSON) *</label>
              <textarea
                value={yamlConfig}
                onChange={(e) => setYamlConfig(e.target.value)}
                placeholder={`{
  "pattern": {
    "type": "function",
    "decorators": {
      "has_any": [
        "app.route", "app.get", "app.post", "app.put", "app.delete",
        "bp.route", "blueprint.route",
        "router.get", "router.post", "router.put", "router.delete",
        "api.get", "api.post", "api.put", "api.delete"
      ],
      "must_also_have_any": ["require_auth", "login_required", "authenticated"]
    }
  },
  "message": "API endpoint missing authentication decorator"
}`}
                rows={10}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Python Code *</label>
              <textarea
                value={pythonCode}
                onChange={(e) => setPythonCode(e.target.value)}
                placeholder={`from skylos.rules.base import SkylosRule
import ast

class MyRule(SkylosRule):
    rule_id = "ACME-001"
    name = "My Custom Rule"
    
    def visit_node(self, node, context):
        # Your rule logic here
        return None`}
                rows={12}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setOpen(false); resetForm(); }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}