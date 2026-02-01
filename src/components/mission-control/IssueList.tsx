'use client';

import { Shield, Key, Code2, Trash2 } from 'lucide-react';
import { IssueGroup } from '@/types/mission-control';

const categoryIcons = {
  SECURITY: Shield,
  SECRET: Key,
  QUALITY: Code2,
  DEAD_CODE: Trash2,
};

const severityColors = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
};

export default function IssueList({ 
  groups, 
  selected, 
  onSelect,
  loading 
}: {
  groups: IssueGroup[];
  selected: IssueGroup | null;
  onSelect: (g: IssueGroup) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {groups.map(group => {
        const Icon = categoryIcons[group.category as keyof typeof categoryIcons] || Shield;
        const isSelected = selected?.id === group.id;
        
        return (
          <button
            key={group.id}
            onClick={() => onSelect(group)}
            className={`w-full text-left p-4 transition hover:bg-slate-50 ${
              isSelected ? 'bg-indigo-50 border-l-2 border-gray-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Severity Dot */}
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                severityColors[group.severity as keyof typeof severityColors] || 'bg-slate-400'
              }`} />
              
              <div className="flex-1 min-w-0">
                {/* Rule Name */}
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900 truncate">
                    {formatRuleName(group.rule_id)}
                  </span>
                </div>
                
                {/* File Path */}
                <div className="text-xs text-slate-500 truncate mt-1">
                  {group.canonical_file}
                </div>
                
                {/* Meta */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {group.occurrence_count} place{group.occurrence_count !== 1 ? 's' : ''}
                  </span>
                  
                  {group.verification_status === 'VERIFIED' && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatRuleName(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Sql/g, 'SQL')
    .replace(/Xss/g, 'XSS');
}