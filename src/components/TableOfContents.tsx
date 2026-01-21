'use client';

import { useEffect, useState } from 'react';
import { TocItem } from '@/lib/toc';

export default function TableOfContents({ headings }: { headings: TocItem[] }) {
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
    <div className="sticky top-24 hidden lg:block">
      <nav className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 mb-3">On this page</p>
        {headings.map((heading) => (
        <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`block text-sm py-1 border-l-2 transition-colors ${
              heading.level === 3 ? 'pl-6' : 'pl-4'
            } ${
              activeId === heading.id
                ? 'border-slate-900 text-slate-900 font-medium'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}