import type { ReactNode } from "react";
import type { RegionalAidMetadata } from "@workspace/api-client-react";
import { Bot, Database, Globe2, ShieldAlert } from "lucide-react";

export function RegionalAidReviewDetails({ metadata }: { metadata: RegionalAidMetadata }) {
  return (
    <div className="mx-6 md:mx-8 mb-6 rounded-sm border border-cyan-500/25 bg-cyan-500/[0.04] overflow-hidden" data-testid="section-regional-aid-evidence">
      <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest font-bold text-cyan-400">
          <Bot className="h-4 w-4" />
          AI-assisted regional aid draft
        </div>
        <span className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber-400">
          Approval required
        </span>
      </div>
      <div className="grid gap-5 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Verified shortfall" value={`${metadata.quantity.toLocaleString()} ${metadata.unit}`} />
          <Metric label="Destination" value={metadata.destination} />
        </div>
        <div>
          <Label icon={<Database className="h-3.5 w-3.5" />}>Evidence used</Label>
          <div className="mt-2 grid gap-2">
            {metadata.evidence.map((evidence, index) => (
              <div key={`${evidence.source}-${index}`} className="rounded-sm border border-border/70 bg-background/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-foreground">{evidence.label}</div>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-cyan-400">{evidence.status.replaceAll("_", " ")}</span>
                </div>
                <div className="mt-1 text-xs text-foreground/90">{evidence.value}</div>
                <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-muted-foreground">
                  {evidence.source}{evidence.observedAt ? ` · ${new Date(evidence.observedAt).toLocaleString()}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label icon={<Globe2 className="h-3.5 w-3.5" />}>Suggested coordination counterparts</Label>
          <div className="mt-2 grid gap-2">
            {metadata.suggestedCountries.map((country) => (
              <div key={country.code} className="rounded-sm border border-border/70 bg-background/50 p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">{country.name} · {country.code}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{country.reason}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label icon={<ShieldAlert className="h-3.5 w-3.5" />}>Operational limitations</Label>
          <ul className="mt-2 grid gap-1.5 text-[11px] leading-relaxed text-amber-100/70">
            {metadata.limitations.map((limitation) => <li key={limitation}>• {limitation}</li>)}
          </ul>
        </div>
        <div className="border-t border-border/60 pt-3 font-mono text-[9px] text-muted-foreground">
          Generated {new Date(metadata.generatedAt).toLocaleString()} · {metadata.aiProvider} · {metadata.aiModel}
        </div>
      </div>
    </div>
  );
}

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{icon}{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-cyan-500/20 bg-background/50 p-3">
      <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold capitalize text-foreground">{value}</div>
    </div>
  );
}