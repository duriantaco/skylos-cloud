'use client';

import { useEffect, useRef } from 'react';
import { Copy, ExternalLink } from 'lucide-react';

export default function CodeViewer({
  content,
  language,
  highlightLine,
  filePath,
}: {
  content: string;
  language: string;
  highlightLine: number;
  filePath: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = content.split('\n');
  
  useEffect(() => {
    if (containerRef.current && highlightLine) {
      const lineEl = containerRef.current.querySelector(`[data-line="${highlightLine}"]`);
      lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightLine, content]);

  return (
    <div className="h-full flex flex-col">
      {/* File Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-sm text-slate-400 font-mono">{filePath}</span>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-slate-400 hover:text-white transition">
            <Copy className="w-4 h-4" />
          </button>
          <a 
            href={`#`} // GitHub link
            className="p-1.5 text-slate-400 hover:text-white transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Code */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto font-mono text-sm"
      >
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const isHighlighted = lineNum === highlightLine;
              
              return (
                <tr 
                  key={i}
                  data-line={lineNum}
                  className={isHighlighted ? 'bg-red-500/20' : 'hover:bg-slate-800/50'}
                >
                  {/* Line Number */}
                  <td className={`px-4 py-0.5 text-right select-none border-r border-slate-700 ${
                    isHighlighted ? 'text-red-400 font-bold' : 'text-slate-600'
                  }`}>
                    {lineNum}
                  </td>
                  
                  {/* Code */}
                  <td className="px-4 py-0.5">
                    <pre className={`${isHighlighted ? 'text-red-200' : 'text-slate-300'}`}>
                      {line || ' '}
                    </pre>
                  </td>
                  
                  {/* Annotation */}
                  {isHighlighted && (
                    <td className="px-4 py-0.5">
                      <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                        ← VULNERABILITY
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}