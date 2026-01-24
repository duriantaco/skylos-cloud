"use client";

import { useState } from "react";
import { toggleRule, deleteRule } from "@/app/dashboard/rules/actions";
import { ToggleLeft, ToggleRight, Trash2, MoreVertical } from "lucide-react";

type Rule = {
  id: string;
  rule_id: string;
  name: string;
  enabled: boolean;
};

export function RuleActions({ rule }: { rule: Rule }) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await toggleRule(rule.id, !rule.enabled);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete rule "${rule.rule_id}"? This cannot be undone.`)) return;
    setLoading(true);
    await deleteRule(rule.id);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`p-2 rounded-lg transition ${
          rule.enabled 
            ? "text-emerald-600 hover:bg-emerald-50" 
            : "text-slate-400 hover:bg-slate-100"
        }`}
        title={rule.enabled ? "Disable rule" : "Enable rule"}
      >
        {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        title="Delete rule"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}