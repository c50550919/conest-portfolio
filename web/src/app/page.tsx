import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  GitMerge,
  LineChart,
  Shield,
  Workflow,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ===== FIXED BACKGROUND ===== */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/hero-aerial.jpg"
          alt=""
          fill
          className="object-cover object-bottom"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/60" />
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/70 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="w-full px-4 sm:px-8 lg:px-12 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center">
            <Image
              src="/placd-mark.png"
              alt="Placd"
              width={220}
              height={72}
              className="h-16 w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <a
              href="#platform"
              className="text-[13px] tracking-wide uppercase text-slate-400 hover:text-white transition-colors duration-200"
            >
              Platform
            </a>
            <a
              href="#how-it-works"
              className="text-[13px] tracking-wide uppercase text-slate-400 hover:text-white transition-colors duration-200"
            >
              How it Works
            </a>
            <a
              href="#what-changes"
              className="text-[13px] tracking-wide uppercase text-slate-400 hover:text-white transition-colors duration-200"
            >
              What Changes
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[13px] tracking-wide text-slate-400 hover:text-white transition-colors duration-200"
            >
              Sign In
            </Link>
            <a
              href="#demo"
              className="text-[13px] font-semibold tracking-wide bg-white text-slate-950 px-5 py-2.5 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            >
              Request Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-end pb-32 pt-[72px]">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
              <span className="text-[13px] tracking-[0.2em] uppercase text-slate-400 font-medium">
                Housing Placement Platform
              </span>
            </div>

            <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-bold tracking-[-0.03em] text-white leading-[0.95] mb-8">
              From intake
              <br />
              to placed &mdash;
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                in days, not weeks.
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-lg mb-12 leading-relaxed">
              Placd replaces spreadsheets with a purpose-built placement
              pipeline. Your team sees every case, AI surfaces the best-fit
              unit, and funder reports generate in one click.
            </p>

            <div className="flex items-center gap-5">
              <a
                href="#demo"
                className="inline-flex items-center gap-2.5 bg-white text-slate-950 font-semibold px-7 py-3.5 rounded-lg text-[15px] hover:bg-slate-100 transition-colors duration-200 shadow-2xl shadow-black/30"
              >
                Request a Demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium text-[15px] transition-colors duration-200"
              >
                See How It Works
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-slate-500" />
        </div>
      </section>

      {/* ===== PLATFORM ===== */}
      <section id="platform" className="relative py-32">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-20">
            <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
            <span className="text-[13px] tracking-[0.2em] uppercase text-slate-500 font-medium">
              Platform
            </span>
          </div>

          {/* Two-column asymmetric layout */}
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-6">
            {/* Left: Lead feature — Pipeline */}
            <div className="lg:col-span-7 group">
              <div className="h-full p-10 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Workflow className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                  Placement Pipeline
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-xl mb-8">
                  Visual kanban tracks every case from intake through
                  move-in. Your team knows where every family stands
                  &mdash; no spreadsheet cross-referencing, no cases
                  falling through cracks.
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {['Intake', 'Matching', 'Proposed', 'Accepted', 'Placed', 'Closed'].map((stage) => (
                    <div
                      key={stage}
                      className="px-2 py-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-center"
                    >
                      <span className="text-xs text-slate-400">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Stacked features */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex-1 p-8 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5">
                  <GitMerge className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  Intelligent Matching
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  AI scores every client-unit pair across six factors
                  &mdash; location, budget, household size, language,
                  accessibility, and services. Top matches surface
                  automatically.
                </p>
              </div>

              <div className="flex-1 p-8 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                  <LineChart className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  One-Click Compliance
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  HUD- and ORR-ready reports generate instantly.
                  Time-to-place, outcomes, demographics &mdash; always
                  audit-ready, never assembled by hand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== IMPACT NUMBERS ===== */}
      <section id="impact" className="relative py-24">
        <div className="absolute inset-0 bg-slate-950/60" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
            <span className="text-[13px] tracking-[0.2em] uppercase text-slate-500 font-medium">
              Impact
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            <div className="bg-slate-950/90 p-10">
              <p className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-white tracking-tight leading-none mb-3">
                60
                <span className="text-blue-400">%</span>
              </p>
              <p className="text-slate-400 leading-relaxed">
                Faster time-to-place compared to manual matching workflows
              </p>
            </div>
            <div className="bg-slate-950/90 p-10">
              <p className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-white tracking-tight leading-none mb-3">
                6
                <span className="text-teal-400">-factor</span>
              </p>
              <p className="text-slate-400 leading-relaxed">
                AI scoring algorithm per client-unit pair for optimal placement
              </p>
            </div>
            <div className="bg-slate-950/90 p-10">
              <p className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-white tracking-tight leading-none mb-3">
                100
                <span className="text-emerald-400">%</span>
              </p>
              <p className="text-slate-400 leading-relaxed">
                Audit-ready compliance reporting from day one of deployment
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="relative py-32">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 mb-20">
            <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
            <span className="text-[13px] tracking-[0.2em] uppercase text-slate-500 font-medium">
              How it Works
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-0">
            {/* Step 1 */}
            <div className="relative p-10 border-r border-white/[0.06] last:border-r-0">
              <span className="text-[120px] font-bold text-white/[0.03] absolute -top-6 -left-2 leading-none select-none">
                1
              </span>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-blue-400 mb-8" />
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  Intake
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Client enters the system with housing needs, preferences,
                  language requirements, and accessibility constraints.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-10 border-r border-white/[0.06] last:border-r-0">
              <span className="text-[120px] font-bold text-white/[0.03] absolute -top-6 -left-2 leading-none select-none">
                2
              </span>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-teal-400 mb-8" />
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  Match
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  AI scores all available units across six weighted factors and
                  surfaces the top matches instantly.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-10">
              <span className="text-[120px] font-bold text-white/[0.03] absolute -top-6 -left-2 leading-none select-none">
                3
              </span>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mb-8" />
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  Place
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Case manager reviews matches, proposes a unit, and tracks the
                  placement through acceptance and move-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="demo" className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-slate-950/50" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
              <span className="text-[13px] tracking-[0.2em] uppercase text-slate-500 font-medium">
                Get Started
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
              Ready to modernize
              <br />
              your placement workflow?
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
              See Placd in action with a personalized demo tailored to your
              organization&apos;s needs.
            </p>
            <div className="flex items-center gap-5">
              <a
                href="mailto:demo@placd.io?subject=Placd Demo Request"
                className="inline-flex items-center gap-2.5 bg-white text-slate-950 font-semibold px-7 py-3.5 rounded-lg text-[15px] hover:bg-slate-100 transition-colors duration-200 shadow-2xl shadow-black/30"
              >
                Request a Demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium text-[15px] transition-colors duration-200"
              >
                Try the Dashboard
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative py-10 border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-slate-950/90" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Image
                src="/placd-mark.png"
                alt="Placd"
                width={140}
                height={46}
                className="h-10 w-auto"
              />
              <div className="h-4 w-px bg-white/10" />
              <span className="text-[13px] text-slate-500 tracking-wide">
                AI-Powered Housing Placement
              </span>
            </div>
            <div className="flex items-center gap-8 text-[13px] text-slate-500">
              <a
                href="#"
                className="hover:text-slate-300 transition-colors duration-200"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-slate-300 transition-colors duration-200"
              >
                Terms
              </a>
              <a
                href="#demo"
                className="hover:text-slate-300 transition-colors duration-200"
              >
                Contact
              </a>
              <span>&copy; 2026 Placd</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== TRUST STRIP ===== */}
      <div className="relative">
        <div className="absolute inset-0 bg-slate-950/95" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 flex items-center justify-center gap-3">
          <Shield className="w-4 h-4 text-slate-600" />
          <span className="text-[12px] text-slate-600 tracking-wide">
            SOC 2 Type II &middot; HIPAA Compliant &middot; FedRAMP Ready &middot; HUD Certified
          </span>
        </div>
      </div>
    </div>
  );
}
