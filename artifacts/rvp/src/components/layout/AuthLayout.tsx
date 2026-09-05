import { ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { RadarBackground } from "../auth/RadarBackground";

export function AuthLayout({ children }: { children: ReactNode }) {
  const logoUrl = `${import.meta.env.BASE_URL}logo.svg`;

  return (
    <div className="grid min-h-[100dvh] w-full bg-slate-100 lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-blue-400/10 bg-[#0d1530] p-10 xl:p-16">
        <RadarBackground />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10">
            <img src={logoUrl} alt="RVP" className="h-8 w-8" data-testid="img-rvp-logo-desktop" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">RVP System</h1>
            <p className="mt-1 text-xs font-mono uppercase tracking-[0.16em] text-slate-400">Recovery Velocity Platform</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 border border-slate-500/40 bg-slate-950/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-300">
            <ShieldCheck className="h-4 w-4" />
            Authorized access
          </div>
          <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight text-slate-100 xl:text-5xl">
            Regional Emergency Coordination Portal
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
            Secure access to incident coordination, local readiness, resource status, and recovery operations across the Caribbean.
          </p>
          <div className="mt-10 border-y border-slate-500/25 bg-slate-950/20 py-5">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Restricted operational system</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Access is limited to approved personnel. System activity may be recorded for security and audit purposes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-between border-t border-blue-400/10 pt-5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
           <span>Secure operational access</span>
           <span>Caribbean resilience network</span>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center bg-slate-100 p-6 sm:p-12">
         <div className="absolute top-6 left-6 flex lg:hidden items-center gap-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <img src={logoUrl} alt="RVP" className="h-7 w-7" data-testid="img-rvp-logo-mobile" />
          </div>
          <div>
             <h1 className="text-lg font-semibold tracking-tight text-slate-900">RVP</h1>
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Recovery Velocity Platform</p>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
           {children}
        </div>
      </div>
    </div>
  );
}
