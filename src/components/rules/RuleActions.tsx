"use client";

import { useState } from "react";
import { toggleRule, deleteRule } from "@/app/dashboard/rules/actions";
import { ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import NoticeModal from "@/components/NoticeModal";

type Rule = {
  id: string;
  rule_id: string;
  name: string;
  enabled: boolean;
};

export function RuleActions({ rule }: { rule: Rule }) {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    const result = await toggleRule(rule.id, !rule.enabled);
    if (!result.success) {
      setNotice(result.error || "Failed to update rule");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteRule(rule.id);
    if (!result.success) {
      setNotice(result.error || "Failed to delete rule");
    } else {
      setShowDeleteModal(false);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
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

        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Delete rule"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Rule"
        message={`Delete rule "${rule.rule_id}"? This cannot be undone.`}
        confirmText="Delete Rule"
        confirmStyle="danger"
        isLoading={loading}
      />

      <NoticeModal
        isOpen={notice !== null}
        onClose={() => setNotice(null)}
        title="Rule Action Failed"
        message={notice || ""}
        tone="error"
      />
    </>
  );
}
