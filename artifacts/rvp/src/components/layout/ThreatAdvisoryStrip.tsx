import { BellRing, CircleAlert, Eye, RadioTower } from "lucide-react";
import type { CountryRiskOverview } from "@workspace/api-client-react";

export function ThreatAdvisoryStrip({
  overview,
  isLoading,
  isError,
}: {
  overview?: CountryRiskOverview;
  isLoading: boolean;
  isError: boolean;
}) {
  if (!overview) {
    return (
      <div className="sticky top-0 z-30 shrink-0 border-b border-amber-500/30 bg-card/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-500">
          <RadioTower className="h-3.5 w-3.5" />
          {isLoading ? "Current threat advisory loading…" : isError ? "Current threat advisory unavailable — no threat inferred" : "Current threat advisory unavailable"}
        </div>
      </div>
    );
  }

  const current = overview.currentThreatAdvisories.filter((advisory) => advisory.status === "current");
  const unavailable = overview.currentThreatAdvisories.filter((advisory) => advisory.status === "unavailable");
  const watchlist = overview.currentThreatAdvisories.filter((advisory) => advisory.status === "watchlist");
  const featured = current[0] ?? unavailable[0];
  const hasCurrentThreat = current.length > 0;

  return (
    <div
      className={`sticky top-0 z-30 shrink-0 border-b px-4 py-2 backdrop-blur ${
        hasCurrentThreat ? "border-red-500/40 bg-red-500/10" : featured ? "border-amber-500/30 bg-card/95" : "border-primary/25 bg-card/95"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-2">
          {hasCurrentThreat ? <BellRing className="h-3.5 w-3.5 animate-pulse text-red-500" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">Current Threat Advisory</span>
        </div>

        {featured ? (
          <div className={`flex items-center gap-1.5 font-mono text-[10px] uppercase ${hasCurrentThreat ? "text-red-500" : "text-amber-500"}`}>
            <CircleAlert className="h-3.5 w-3.5" />
            <span>{featured.title}</span>
            <span className="text-muted-foreground">• {featured.summary}</span>
          </div>
        ) : (
          <span className="font-mono text-[10px] uppercase text-primary">No live threat signal reported</span>
        )}

        {watchlist.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-[9px] uppercase text-muted-foreground">Monitoring:</span>
            {watchlist.slice(0, 4).map((advisory) => (
              <span key={advisory.id} className="border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-amber-500">
                {advisory.title}
              </span>
            ))}
          </div>
        )}

        <span className="ml-auto font-mono text-[9px] text-muted-foreground">
          {overview.country.name} • {overview.phase.phase.replace("_", " ")} • {overview.phase.source}
        </span>
      </div>
    </div>
  );
}