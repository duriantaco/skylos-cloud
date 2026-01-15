'use client'
import { useState } from "react";
import { Copy, Eye, EyeOff, Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ApiKeySection({ apiKey, projectId }: { apiKey: string, projectId: string }) {
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [rotating, setRotating] = useState(false);
    const router = useRouter();

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRotate = async () => {
        if (!confirm("Are you sure? This will INVALIDATE the old key immediately. You must update your CI/CD secrets.")) return;
        
        setRotating(true);
        // Ensure this API route exists and handles the rotation logic
        await fetch(`/api/projects/${projectId}/rotate`, { method: "POST" });
        setRotating(false);
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4">
                <div className="flex-1 font-mono text-sm text-slate-600 truncate ml-2">
                    {visible ? apiKey : "sk_live_••••••••••••••••••••••••••••••••"}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setVisible(!visible)}
                        className="p-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-md text-slate-500 hover:text-slate-900 transition"
                        title={visible ? "Hide" : "Show"}
                    >
                        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="p-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-md text-slate-500 hover:text-slate-900 transition"
                        title="Copy to Clipboard"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleRotate}
                    disabled={rotating}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-3 h-3 ${rotating ? 'animate-spin' : ''}`} />
                    Rotate Key (Revoke Old)
                </button>
            </div>
        </div>
    )
}