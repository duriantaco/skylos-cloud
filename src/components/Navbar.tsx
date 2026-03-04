"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import dogImg from "../../public/assets/favicon-96x96.png"

export default function Navbar() {
  const [productsOpen, setProductsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-white">
            <Image
              src={dogImg}
              alt="Skylos"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </div>
          <span className="font-semibold text-slate-900 text-lg">Skylos</span>
          <span className="ml-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Beta
          </span>
        </Link>

        <div className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
              onClick={() => setProductsOpen(!productsOpen)}
            >
              Products
              <svg className={`h-4 w-4 transition-transform ${productsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {productsOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                <a
                  href="https://ca9.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  CA9
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
          <a href="#features" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            Features
          </a>
          <a href="#how" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            How it works
          </a>
          <a href="#pricing" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            Pricing
          </a>
          <Link href="/roadmap" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            Roadmap
          </Link>
          <Link href="/vscode" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            VSCode
          </Link>
          <Link href="/blog" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            Blog
          </Link>
          <Link href="https://docs.skylos.dev/" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition">
            Docs
          </Link>
        </div>
        

        <div className="flex items-center gap-3">
          <Link
            href="https://docs.skylos.dev/"
            className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            View docs
          </Link>
          <a
            href="mailto:founder@skylos.dev"
            className="hidden sm:inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
          >
            Book a Demo
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  )
}