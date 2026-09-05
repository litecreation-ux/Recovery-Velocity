import type { HistoricalExposure, RegionalReference, WorldBankIndicator } from "@workspace/api-client-react";
import { ExternalLink, TriangleAlert } from "lucide-react";

export function IndicatorsAndHistoryCard({
  indicators,
  history,
  regionalReference,
}: {
  indicators: WorldBankIndicator[];
  history: HistoricalExposure;
  regionalReference: RegionalReference;
}) {
  return (
    <div className="border border-border bg-card/40 rounded-sm flex flex-col">
      <div className="p-4 border-b border-border/50">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-3">Development Indicators</span>
        <div className="grid grid-cols-1 gap-2">
          {indicators.map((indicator) => (
            <div key={indicator.code} className="border border-border/40 bg-background/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-[9px] text-muted-foreground uppercase">{indicator.name}</div>
                <span className={`font-mono text-[8px] uppercase ${indicator.sourceStatus === "available" ? "text-green-500" : "text-amber-500"}`}>{indicator.sourceStatus}</span>
              </div>
              <div className="mt-1 font-mono text-sm">
                {indicator.value == null ? "Unavailable" : `${indicator.unit === "US$" ? "$" : ""}${indicator.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${indicator.unit === "%" ? "%" : indicator.unit === "years" ? " years" : ""}`}
                <span className="ml-1 text-[9px] text-muted-foreground">({indicator.date ?? "no source date"})</span>
              </div>
              <a href={indicator.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[8px] uppercase text-primary hover:underline">
                {indicator.sourceName} <ExternalLink className="h-2.5 w-2.5" />
              </a>
              {indicator.sourceStatus !== "available" && <div className="mt-1 flex gap-1 text-[8px] text-amber-500"><TriangleAlert className="h-2.5 w-2.5" /> Last success: {indicator.lastSuccessfulRefresh ? new Date(indicator.lastSuccessfulRefresh).toLocaleString() : "none"}</div>}
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Historical Exposure — not a live warning</span>
        <p className="mb-3 text-[9px] leading-relaxed text-muted-foreground">{history.methodology} Static curated benchmark, not a live source feed.</p>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {history.events.map((event) => (
            <div key={`${event.name}-${event.year}`} className="bg-background/50 border border-border/50 rounded-sm p-2.5">
              <div className="font-mono text-[9px] text-muted-foreground uppercase">{event.year} • {event.severity}</div>
              <div className="font-mono text-xs uppercase text-foreground">{event.name}</div>
            </div>
          ))}
        </div>
        <a className="mt-auto flex items-center gap-1 font-mono text-[9px] uppercase text-primary hover:underline" href={history.sourceUrl} target="_blank" rel="noreferrer">NOAA/NHC historical archive <ExternalLink className="h-2.5 w-2.5" /></a>
        <a className="mt-2 flex items-center gap-1 font-mono text-[9px] uppercase text-primary hover:underline" href={regionalReference.url} target="_blank" rel="noreferrer">{regionalReference.name} regional reference <ExternalLink className="h-2.5 w-2.5" /></a>
        <p className="mt-1 text-[8px] leading-relaxed text-muted-foreground">{regionalReference.note}</p>
      </div>
    </div>
  );
}
