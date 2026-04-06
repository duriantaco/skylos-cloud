import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthCallbackClient from "@/components/AuthCallbackClient";

export const metadata: Metadata = {
  title: "Signing In — Skylos",
  description: "Completing your Skylos sign-in.",
  robots: {
    index: false,
    follow: false,
  },
};

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0A0A] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-white">Signing you in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Finalizing your sign-in...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
