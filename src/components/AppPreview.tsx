'use client'
import { useState } from 'react'
import { Shield, LayoutDashboard, FileCode, Lock, Settings, Menu } from 'lucide-react'
import ASTPlayground from './ASTPlayground'

export default function AppPreview() {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f111a] flex flex-col md:flex-row h-[600px] w-full max-w-6xl mx-auto">
      
      <aside className="hidden md:flex flex-col w-16 bg-[#0b0c14] border-r border-white/5 items-center py-6 gap-6">
        <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Shield className="w-5 h-5" />
        </div>
        <nav className="flex flex-col gap-4 w-full px-2">
          <SidebarIcon icon={<LayoutDashboard />} active />
          <SidebarIcon icon={<FileCode />} />
          <SidebarIcon icon={<Lock />} />
          <div className="h-px bg-white/5 w-full my-2"></div>
          <SidebarIcon icon={<Settings />} />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col bg-[#0f111a]">
        
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">Project / Backend-API</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 font-mono">Connected</span>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-800"></div>
        </header>

        <div className="p-6 md:p-8 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Live Analysis</h3>
            <p className="text-sm text-slate-500">Real-time AST parsing engine</p>
          </div>

          <ASTPlayground />

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded border border-white/5 bg-[#161822]">
              <div className="text-xs text-slate-500">Security Score</div>
              <div className="text-xl font-mono text-white mt-1">A+</div>
            </div>
            <div className="p-4 rounded border border-white/5 bg-[#161822]">
              <div className="text-xs text-slate-500">Issues Found</div>
              <div className="text-xl font-mono text-red-400 mt-1">1 Critical</div>
            </div>
            <div className="p-4 rounded border border-white/5 bg-[#161822]">
              <div className="text-xs text-slate-500">Dead Code</div>
              <div className="text-xl font-mono text-indigo-400 mt-1">0%</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function SidebarIcon({ icon, active }: any) {
  return (
    <div className={`w-10 h-10 rounded mx-auto flex items-center justify-center cursor-pointer transition ${active ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'}`}>
      <div className="w-5 h-5">{icon}</div>
    </div>
  )
}