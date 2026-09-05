import { CloudLightning, ShieldCheck } from "lucide-react";
import type { RiskCountry } from "@workspace/api-client-react";

export function CountryHazardProfileCard({ country }: { country: RiskCountry }) {
  return (
    <section className="border border-border bg-card/40 rounded-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 text-primary">
        <CloudLightning className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-widest">Hurricane & hazard profile</span>
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">Common planning hazards</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {country.hazards.map((hazard) => (
          <span key={hazard} className="border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-[9px] uppercase text-amber-500">{hazard}</span>
        ))}
      </div>
      <div className="mt-auto border-t border-border/50 pt-3">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" /> Preparedness coverage
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{country.preparednessScope}</p>
      </div>
    </section>
  );
}