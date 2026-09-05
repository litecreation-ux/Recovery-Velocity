import { useGetParish, getGetParishQueryKey } from "@workspace/api-client-react";
import { AlertTriangle, ShieldCheck, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReadinessPanel({ parishId, isFocused = false }: { parishId: string; isFocused?: boolean }) {
  const { data: parish, isLoading } = useGetParish(parishId, {
    query: { enabled: !!parishId, queryKey: getGetParishQueryKey(parishId) }
  });

  if (isLoading || !parish) {
    return (
      <div className="border border-border bg-card/40 rounded-sm p-4 animate-pulse h-32 flex items-center justify-center">
        <div className="h-4 w-24 bg-muted/50 rounded" />
      </div>
    );
  }

  const isCritical = parish.readinessLevel === 'Critical';
  const isAtRisk = parish.readinessLevel === 'At risk';

  const colorClass = isCritical ? 'text-red-500' : isAtRisk ? 'text-amber-500' : 'text-green-500';
  const accentClass = isCritical ? 'bg-red-500' : isAtRisk ? 'bg-amber-500' : 'bg-green-500';
  const badgeBorderClass = isCritical ? 'border-red-500/30' : isAtRisk ? 'border-amber-500/30' : 'border-green-500/30';
  const Icon = isCritical ? AlertOctagon : isAtRisk ? AlertTriangle : ShieldCheck;

  return (
    <div className={cn(
      "border border-border bg-card/40 rounded-sm relative overflow-hidden shrink-0 group transition-shadow duration-300",
      isFocused && "ring-1 ring-primary/80 shadow-[0_0_24px_rgba(0,191,255,0.18)]",
    )}>
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full",
        accentClass
      )} />
      
      <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Parish Readiness</span>
            <div className={cn("px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] uppercase tracking-wider bg-background border", colorClass, badgeBorderClass)}>
              {parish.readinessLevel}
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight uppercase truncate">{parish.name}</h2>
          
          <div className="mt-3 flex gap-4 text-sm font-mono text-muted-foreground">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Pop</div>
              <div className="text-foreground">{parish.population.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Area</div>
              <div className="text-foreground">{parish.area} km²</div>
            </div>
            {parish.capitalCity && (
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-60">Capital</div>
                <div className="text-foreground">{parish.capitalCity}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end border-l border-border/50 pl-4 h-full shrink-0">
          <div className={cn("text-5xl font-bold font-mono tracking-tighter", colorClass)}>
            {parish.readinessScore}
            <span className="text-xl text-muted-foreground ml-1">/100</span>
          </div>
        </div>
      </div>

      <div className="bg-background/50 border-t border-border/50 p-3 px-4 flex items-start gap-3">
        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", colorClass)} />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Critical Bottleneck</div>
          <div className="text-sm">{parish.bottleneck}</div>
        </div>
      </div>
    </div>
  );
}