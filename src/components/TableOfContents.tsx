'use client';

import { useEffect, useState } from 'react';
import { TocItem } from '@/lib/toc';

export default function TableOfContents({
  headings,
  mobileOnly = false,
  desktopOnly = false,
}: {
  headings: TocItem[];
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <>
      {!desktopOnly ? (
        <details
          className={`mb-8 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)] ${
            mobileOnly ? '' : 'lg:hidden'
          }`}
        >
          <summary className="cursor-pointer list-none px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Navigation</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Jump to a section</p>
          </summary>
          <div className="border-t border-slate-200 px-3 py-3">
            <div className="space-y-1.5">
              {headings.map((heading, index) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm leading-5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${
                    heading.level === 3 ? 'ml-4' : ''
                  }`}
                >
                  <span className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{heading.text}</span>
                </a>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      {!mobileOnly ? (
        <div className={`sticky top-24 ${desktopOnly ? '' : 'hidden lg:block'}`}>
          <nav className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Navigation</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">On this page</p>
            <p className="mt-1 text-xs text-slate-500">Jump across {headings.length} sections.</p>
            <div className="mt-4 space-y-1.5">
              {headings.map((heading, index) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`group flex items-start gap-3 rounded-r-xl border-l-2 px-3 py-2 text-sm leading-5 transition-all ${
                    heading.level === 3 ? 'ml-4' : ''
                  } ${
                    activeId === heading.id
                      ? 'border-slate-900 bg-slate-900/[0.05] text-slate-900 font-medium'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="mt-0.5 font-mono text-[11px] text-slate-400 group-hover:text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{heading.text}</span>
                </a>
              ))}
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
