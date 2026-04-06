"use client";

import dynamic from "next/dynamic";

const SkylosHeroSandbox = dynamic(
  () => import("@/components/SkylosHeroSandbox"),
  {
    ssr: false,
    loading: () => (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-slate-200" />
              <div className="h-3 w-56 rounded bg-slate-100" />
            </div>
            <div className="h-10 w-36 rounded-lg bg-slate-200" />
          </div>
        </div>
        <div className="grid min-h-[560px] lg:grid-cols-2">
          <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
            <div className="h-full min-h-[280px] rounded-xl bg-slate-100" />
          </div>
          <div className="bg-slate-50 p-4">
            <div className="mb-4 h-8 w-32 rounded bg-white shadow-sm" />
            <div className="space-y-3">
              <div className="h-16 rounded-xl bg-white shadow-sm" />
              <div className="h-16 rounded-xl bg-white shadow-sm" />
              <div className="h-16 rounded-xl bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </section>
    ),
  }
);

export default function SkylosHeroSandboxLoader() {
  return <SkylosHeroSandbox />;
}
