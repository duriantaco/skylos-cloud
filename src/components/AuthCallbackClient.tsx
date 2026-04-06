"use client";

import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type AuthState = "exchanging" | "redirecting" | "failed";

export default function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const providerError = searchParams.get("error");
  const [state, setState] = useState<AuthState>("exchanging");
  const [message, setMessage] = useState("Finalizing your sign-in...");

  useEffect(() => {
    if (providerError) {
      setState("failed");
      setMessage("GitHub did not complete the sign-in flow.");
      return;
    }

    if (!code) {
      setState("failed");
      setMessage("Missing authorization code.");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams({ code, next });
        const response = await fetch(`/api/auth/exchange?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; redirectTo?: string }
          | null;

        if (!response.ok || !payload?.ok || !payload.redirectTo) {
          throw new Error(payload?.error || "Could not complete sign-in.");
        }

        if (cancelled) {
          return;
        }

        setState("redirecting");
        setMessage("Signed in. Taking you to your dashboard...");
        window.location.replace(payload.redirectTo);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState("failed");
        setMessage(
          error instanceof Error ? error.message : "Could not complete sign-in."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, next, providerError]);

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0A0A] p-8 text-center shadow-2xl">
        {state === "failed" ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-white">Sign-in failed</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
            <Link
              href="/login?error=auth_failed"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-white">
              {state === "redirecting" ? "Signed in" : "Signing you in"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
            <p className="mt-6 text-xs text-slate-500">
              GitHub and Supabase can take a few seconds to finish the OAuth roundtrip.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
