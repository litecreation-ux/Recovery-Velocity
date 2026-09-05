import { type CountryRiskOverview } from "@workspace/api-client-react";
import { Eye, RadioTower, ShieldAlert, TriangleAlert } from "lucide-react";

export function PhaseAdvisoryCard({ overview }: { overview: CountryRiskOverview }) {
  const { phase, currentThreatAdvisories: advisories } = overview;
  const isPrep = phase.phase === 'preparedness';
  const isResp = phase.phase === 'active_response';
  const currentAdvisories = advisories.filter((advisory) => advisory.status === "current");
  const unavailableAdvisory = advisories.find((advisory) => advisory.status === "unavailable");
  const watchlist = advisories.filter((advisory) => advisory.status === "watchlist");
  
  return (
    <div className="border border-border bg-card/40 rounded-sm p-4 flex flex-col gap-4">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Operational Phase</span>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-sm ${
          isPrep ? 'border-green-500/30 bg-green-500/10' : 
          isResp ? 'border-destructive/30 bg-destructive/10' : 
          'border-amber-500/30 bg-amber-500/10'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isPrep ? 'bg-green-500' : isResp ? 'bg-destructive' : 'bg-amber-500'
          }`} />
          <span className={`font-mono text-xs uppercase font-bold ${
            isPrep ? 'text-green-500' : isResp ? 'text-destructive' : 'text-amber-500'
          }`}>
            {phase.phase.replace('_', ' ')}
          </span>
        </div>
        <div className="font-mono text-[9px] text-muted-foreground mt-2 uppercase flex flex-col gap-0.5">
          <span>Source: {phase.source}</span>
          <span>Decided: {new Date(phase.decidedAt).toLocaleString()}</span>
          <span className="normal-case tracking-normal leading-relaxed">{phase.reason}</span>
          {phase.isOverride && <span className="text-amber-500 mt-1">Authenticated operational override active</span>}
        </div>
        <p className="mt-3 border border-border/50 bg-background/40 p-2 text-[9px] leading-relaxed text-muted-foreground">
          This release shows source-derived planning phase only. Operational overrides require a verified coordinator identity and are not enabled here.
        </p>
      </div>

      <div className="border-t border-border/50 pt-4 mt-auto">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Threat Advisory</span>
        {unavailableAdvisory ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm p-3">
            <div className="flex items-center gap-2 text-amber-500 font-mono text-[10px] uppercase">
              <TriangleAlert className="h-3.5 w-3.5" /> {unavailableAdvisory.title}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{unavailableAdvisory.summary}</p>
          </div>
        ) : currentAdvisories.length > 0 ? (
          <div className="space-y-2">
            {currentAdvisories.slice(0, 2).map((advisory) => (
              <div key={advisory.id} className="bg-destructive/10 border border-destructive/30 rounded-sm p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-destructive font-mono text-sm font-bold uppercase tracking-tight">{advisory.title}</span>
                </div>
                <div className="font-mono text-[9px] text-destructive/80 uppercase">
                  {advisory.category.replace("_", " ")} • {advisory.severity}
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{advisory.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-background/50 border border-border/50 rounded-sm p-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-[10px] text-muted-foreground uppercase">No live threat signal reported</span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {watchlist.map((advisory) => (
            <span key={advisory.id} className="border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-amber-500">{advisory.title}</span>
          ))}
        </div>
        <div className="mt-2 flex items-start gap-2 font-mono text-[8px] uppercase text-muted-foreground">
          <RadioTower className="mt-0.5 h-3 w-3 shrink-0" />
          <span>Live advisories are source-labelled. Watchlist items show monitored threat types only; they are not current incident claims.</span>
        </div>
      </div>
    </div>
  );
}
