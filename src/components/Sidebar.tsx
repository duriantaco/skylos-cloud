'use client'
import Link from 'next/link'
import { Shield, LayoutDashboard, FileCode, Lock, Settings, BookOpen } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-[#0f111a] border-r border-border-subtle z-50 transition-all duration-300 ease-in-out flex flex-col ${expanded ? 'w-64' : 'w-16'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="h-16 border-b border-white/5 flex items-center px-3 relative">
        <div className="w-10 h-10 bg-brand-primary/10 rounded flex items-center justify-center text-brand-primary">
          <Shield className="w-6 h-6" />
        </div>
        
        <div className={`absolute left-16 top-1/2 -translate-y-1/2 overflow-hidden transition-opacity duration-300 flex items-center gap-2 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          <span className="font-bold text-white text-lg tracking-tight ml-2">Skylos</span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Beta
          </span>
        </div>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2">
        <NavItem icon={<LayoutDashboard />} label="Overview" href="/dashboard" active expanded={expanded} />
        <NavItem icon={<FileCode />} label="Projects" href="/dashboard/projects" expanded={expanded} />
        <NavItem icon={<Lock />} label="Scans" href="/dashboard/scans" expanded={expanded} />
        <div className="h-px bg-white/5 mx-4 my-2" />
        <NavItem icon={<BookOpen />} label="Documentation" href="/docs" expanded={expanded} />
        <NavItem icon={<Settings />} label="Settings" href="/dashboard/settings" expanded={expanded} />
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="w-8 h-8 rounded-full bg-slate-700 mx-auto"></div>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, href, active, expanded }: { 
  icon: React.ReactNode; 
  label: string; 
  href?: string;
  active?: boolean; 
  expanded: boolean 
}) {
  const content = (
    <div className={`h-10 mx-2 rounded flex items-center cursor-pointer transition-colors ${active ? 'bg-brand-primary/10 text-brand-primary' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}>
      <div className="w-12 flex justify-center shrink-0">
        <div className="w-5 h-5">{icon}</div> 
      </div>
      <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 text-sm font-medium ${expanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
        {label}
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}