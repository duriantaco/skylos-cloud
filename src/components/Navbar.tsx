import Link from "next/link"
import Image from "next/image"
import dogImg from "../../public/assets/favicon-96x96.png"

export default function Navbar() {
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

        <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900 transition">Features</a>
          <a href="#how" className="hover:text-slate-900 transition">How it works</a>
          <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
          <Link href="https://docs.skylos.dev/" className="hover:text-slate-900 transition">Docs</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://docs.skylos.dev/"
            className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            View docs
          </Link>
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