'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, File, FileSpreadsheet, Loader2, Coins, AlertCircle } from 'lucide-react';
import { checkCredits, useFeature, FEATURE_KEYS } from '@/lib/credits';
import Link from 'next/link';

type Props = {
  frameworkCode: string;
};

export default function ComplianceReportButton({ frameworkCode }: Props) {
  const [generating, setGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hasCredits, setHasCredits] = useState(true);
  const [creditsRequired, setCreditsRequired] = useState(0);
  const [checking, setChecking] = useState(true);
  const [unlimited, setUnlimited] = useState(false);

  useEffect(() => {
    // Check credits on mount
    checkCredits(FEATURE_KEYS.COMPLIANCE_REPORT).then((result) => {
      setHasCredits(result.hasCredits);
      setCreditsRequired(result.required);
      setUnlimited(result.unlimited);
      setChecking(false);
    });
  }, []);

  async function generateReport(format: 'json' | 'csv' | 'html') {
    setGenerating(true);
    setShowMenu(false);

    try {
      // Deduct credits first
      if (!unlimited) {
        const deductResult = await useFeature(FEATURE_KEYS.COMPLIANCE_REPORT, {
          framework: frameworkCode,
          format
        });

        if (!deductResult.success) {
          throw new Error(deductResult.error || 'Insufficient credits');
        }
      }

      const response = await fetch('/api/compliance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworkCode, format })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      if (format === 'json') {
        // For JSON, download as file
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `compliance-report-${frameworkCode}-${Date.now()}.json`);
      } else {
        // For CSV and HTML, response is already a blob
        const blob = await response.blob();
        const filename = format === 'csv'
          ? `compliance-report-${frameworkCode}-${Date.now()}.csv`
          : `compliance-report-${frameworkCode}-${Date.now()}.html`;
        downloadBlob(blob, filename);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Show insufficient credits warning
  if (!checking && !hasCredits && !unlimited) {
    return (
      <div className="inline-flex flex-col gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">
            Need {creditsRequired} credits to generate report
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
        >
          <Coins className="w-4 h-4" />
          Buy Credits
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={generating || checking}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking...
          </>
        ) : generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Generate Report
            {!unlimited && <span className="text-xs opacity-75">({creditsRequired} credits)</span>}
          </>
        )}
      </button>

      {showMenu && !generating && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Choose Format
            </div>

            <button
              onClick={() => generateReport('json')}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-left text-sm"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-medium text-slate-900">JSON</div>
                <div className="text-xs text-slate-500">Machine-readable data</div>
              </div>
            </button>

            <button
              onClick={() => generateReport('csv')}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-left text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-medium text-slate-900">CSV</div>
                <div className="text-xs text-slate-500">Spreadsheet format</div>
              </div>
            </button>

            <button
              onClick={() => generateReport('html')}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-left text-sm"
            >
              <File className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-medium text-slate-900">HTML</div>
                <div className="text-xs text-slate-500">Audit-ready document</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
