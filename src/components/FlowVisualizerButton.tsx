'use client';

import { useState } from 'react';
import { Workflow } from 'lucide-react';
import SecurityFlowVisualizer from './SecurityFlowVisualizer';

type Props = {
  findingId: string;
  ruleId: string;
  category: string;
  repoUrl?: string;
  commitHash?: string;
};

export default function FlowVisualizerButton({ 
  findingId, 
  ruleId, 
  category,
  repoUrl,
  commitHash 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  
  const isSecurityFinding = category === 'SECURITY' || category === 'SECRET';
  
  const flowSupportedRules = [
    'SKY-D201', // SQL Injection
    'SKY-D202', // SQL Injection (format)
    'SKY-D210', // Command Injection
    'SKY-D211', // Command Injection (shell=True)
    'SKY-D220', // Path Traversal
    'SKY-D226', // XSS (mark_safe)
    'SKY-D227', // XSS (unsafe template)
    'SKY-D228', // XSS (HTML concat)
    'SKY-S101', // Hardcoded secret
    'SKY-S102', // API key in code
    'SKY-S103', // Password in code
  ];
  
  const hasFlowSupport = flowSupportedRules.some(r => ruleId.startsWith(r.split('-')[0] + '-' + r.split('-')[1])) || 
                         ruleId.startsWith('SKY-D') || 
                         ruleId.startsWith('SKY-S');
  
  if (!isSecurityFinding) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
        title="View data flow visualization"
      >
        <Workflow className="w-3.5 h-3.5" />
        View Flow
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl">
              <SecurityFlowVisualizer
                findingId={findingId}
                onClose={() => setIsOpen(false)}
                repoUrl={repoUrl}
                commitHash={commitHash}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}