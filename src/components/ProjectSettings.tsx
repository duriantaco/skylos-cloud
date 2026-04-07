'use client'

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import NoticeModal from "@/components/NoticeModal";

export default function ProjectSettings({ projectId, projectName }: { projectId: string, projectName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const handleDelete = async () => {
    setShowDeleteModal(false);
    setDeleting(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    
    if (res.ok) {
        setNotice({ title: "Project Deleted", message: "Project deleted.", tone: "success" });
        router.refresh(); // Refresh to update the list
    } else {
        setNotice({ title: "Delete Failed", message: "Failed to delete project.", tone: "error" });
        setDeleting(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-red-900/30 rounded-xl p-6 mt-12">
        <h3 className="text-lg font-bold text-white mb-2">Danger Zone</h3>
        <p className="text-slate-400 text-sm mb-4">
            Deleting this project will permanently remove all scan history and findings.
        </p>
        <button 
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="border border-red-500/50 text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete Project"}
        </button>

        <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            title="Delete Project"
            message={`Are you sure you want to delete ${projectName}? This cannot be undone.`}
            confirmText="Delete Project"
            confirmStyle="danger"
            isLoading={deleting}
        />

        <NoticeModal
            isOpen={notice !== null}
            onClose={() => setNotice(null)}
            title={notice?.title || "Notice"}
            message={notice?.message || ""}
            tone={notice?.tone || "info"}
        />
    </div>
  );
}
