import Image from "next/image";
import Link from "next/link";
import dogImg from "../../public/assets/favicon-96x96.png";

type NavDropdownProps = {
  label: string;
  widthClass: string;
  children: React.ReactNode;
};

function ChevronIcon() {
  return (
    <svg
      className="h-4 w-4 transition-transform group-open:rotate-180"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function NavDropdown({ label, widthClass, children }: NavDropdownProps) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronIcon />
      </summary>
      <div
        role="menu"
        className={`absolute left-0 top-full z-20 mt-1 hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg group-open:block ${widthClass}`}
      >
        {children}
      </div>
    </details>
  );
}

export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
            <Image
              src={dogImg}
              alt="Skylos"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </div>
          <span className="text-lg font-semibold text-slate-900">Skylos</span>
        </Link>

        <div className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
          <NavDropdown label="Products" widthClass="w-48">
            <a
              href="https://ca9.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              CA9
              <ExternalLinkIcon />
            </a>
            <Link
              href="/vscode"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              VSCode Extension
            </Link>
          </NavDropdown>
          <a
            href="#features"
            className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Features
          </a>
          <a
            href="#how"
            className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Pricing
          </a>
          <NavDropdown label="Resources" widthClass="w-56">
            <a
              href="https://docs.skylos.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Docs & Quickstart
              <ExternalLinkIcon />
            </a>
            <a
              href="https://docs.skylos.dev/rules-reference"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Rules Reference
              <ExternalLinkIcon />
            </a>
            <Link
              href="/blog"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Blog
            </Link>
            <Link
              href="/roadmap"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Roadmap
            </Link>
            <Link
              href="/judge"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Judge
            </Link>
          </NavDropdown>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/#proof"
            className="hidden items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:inline-flex"
          >
            See proof
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
