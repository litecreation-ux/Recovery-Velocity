import { useEffect, useRef, useState } from "react";
import type { ResilienceScore } from "@workspace/api-client-react";
import { Info } from "lucide-react";

export function ResilienceScoreCard({ score }: { score: ResilienceScore }) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInfoOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!infoControlRef.current?.contains(event.target as Node)) {
        setIsInfoOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInfoOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isInfoOpen]);

  return (
    <div className="border border-border bg-card/40 rounded-sm p-4 relative flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">National Capacity Baseline</span>
        <div ref={infoControlRef} className="relative">
          <button
            type="button"
            aria-label="About the national capacity baseline"
            aria-expanded={isInfoOpen}
            onClick={() => setIsInfoOpen((open) => !open)}
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <Info className="h-3.5 w-3.5 cursor-help" />
          </button>
          {isInfoOpen && (
            <div
              role="dialog"
              aria-label="National capacity baseline information"
              className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-primary/40 bg-popover p-3 font-mono text-[10px] leading-relaxed text-popover-foreground shadow-lg"
            >
              <p>{score.calculation}</p>
              <p className="mt-2 text-amber-500/90">{score.limitations}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-end gap-2 mb-5">
        <span className="text-5xl font-bold font-mono text-primary leading-none tracking-tighter">{score.score ?? "—"}</span>
        <span className="text-sm font-mono text-muted-foreground pb-1">/ 100</span>
      </div>
      
      <div className="space-y-3 mb-4 flex-1">
        {score.factors.map(f => (
          <div key={f.name}>
            <div className="flex justify-between font-mono text-[10px] mb-1.5">
               <span className="uppercase text-muted-foreground">{f.name}</span>
               <span className="text-foreground">{f.value ?? "—"}</span>
            </div>
            <div className="h-1 bg-background rounded-sm overflow-hidden border border-border/30">
                <div className="h-full bg-primary/60 transition-all duration-1000" style={{ width: `${Math.min(100, f.value ?? 0)}%` }} />
            </div>
             <div className="mt-1 font-mono text-[8px] text-muted-foreground">{f.weight} • {f.direction}</div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-border/50 pt-3 mt-auto flex flex-col gap-1.5">
        <div className="font-mono text-[9px] uppercase text-amber-500/80 tracking-wide">
          Uncertainty: {score.uncertainty}
        </div>
        <div className="font-mono text-[9px] uppercase text-muted-foreground/80 leading-relaxed tracking-wide">
          Limit: {score.limitations}
        </div>
        <div className="font-mono text-[8px] uppercase text-muted-foreground/60">{score.modelVersion}</div>
      </div>
    </div>
  );
}
