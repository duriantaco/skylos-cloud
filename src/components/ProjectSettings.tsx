'use client'

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProjectSettings({ projectId, projectName }: { projectId: string, projectName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${projectName}? This cannot be undone.`)) return;
    
    setDeleting(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    
    if (res.ok) {
        alert("Project deleted.");
        router.refresh(); // Refresh to update the list
        // In a real app with multiple projects, redirect to the list page
        // window.location.href = "/dashboard"; 
    } else {
        alert("Failed to delete project.");
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
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-500/50 text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete Project"}
        </button>
    </div>
  );
}