"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Shield, CreditCard, Settings, LogOut, ChevronDown } from "lucide-react";

export default function DashboardUserMenu({
  email,
  logoutAction,
}: {
  email: string;
  logoutAction: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition"
      >
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
          {email?.charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-50">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900 truncate">{email}</p>
          </div>

          <div className="py-1">
            <DropdownLink href="/dashboard/rules" icon={Shield} onClick={() => setOpen(false)}>
              Rules
            </DropdownLink>
            <DropdownLink href="/dashboard/billing" icon={CreditCard} onClick={() => setOpen(false)}>
              Billing
            </DropdownLink>
            <DropdownLink href="/dashboard/settings" icon={Settings} onClick={() => setOpen(false)}>
              Settings
            </DropdownLink>
          </div>

          <div className="border-t border-slate-100 py-1">
            <form action={logoutAction} method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: any;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
