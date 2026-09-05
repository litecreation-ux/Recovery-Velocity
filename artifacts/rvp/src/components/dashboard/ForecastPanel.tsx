import {
  useGetParishRecoveryForecast,
  getGetParishRecoveryForecastQueryKey,
  type StormScenario,
} from "@workspace/api-client-react";

export default function ForecastPanel({
  parishId,
  stormScenario,
}: {
  parishId: string;
  stormScenario: StormScenario;
}) {
  const { data: forecast, isLoading } = useGetParishRecoveryForecast(parishId, stormScenario, {
    query: { enabled: !!parishId, queryKey: getGetParishRecoveryForecastQueryKey(parishId, stormScenario) }
  });

  if (isLoading || !forecast) {
    return (
      <div className="border border-border bg-card/40 rounded-sm p-4 animate-pulse h-48 flex items-center justify-center shrink-0">
        <div className="h-4 w-32 bg-muted/50 rounded" />
      </div>
    );
  }

  const metrics = [
    { label: "Power Grid", days: forecast.powerRestorationDays, max: 30 },
    { label: "Road Access", days: forecast.roadAccessDays, max: 14 },
    { label: "Water Supply", days: forecast.waterRestorationDays, max: 21 },
    { label: "Comms Net", days: forecast.communicationsDays, max: 10 },
    { label: "Evac Cap", days: forecast.evacuationCapacityDays, max: 7 },
  ];

  return (
    <div className="border border-border bg-card/40 rounded-sm p-4 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recovery Forecast ({forecast.stormLabel})</span>
        <div className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-[2px] border border-primary/20">
          OVERALL: {forecast.overallRecoveryDays} DAYS
        </div>
      </div>

      <div className="grid gap-3">
        {metrics.map((m) => {
          const percentage = Math.min((m.days / m.max) * 100, 100);
          const isHigh = m.days > (m.max * 0.7);
          const isMed = m.days > (m.max * 0.4);
          const barColor = isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-green-500";
          
          return (
            <div key={m.label} className="grid grid-cols-[100px_1fr_40px] items-center gap-3">
              <span className="font-mono text-[10px] uppercase truncate text-muted-foreground">{m.label}</span>
              <div className="h-2 bg-background border border-border/50 rounded-sm overflow-hidden flex">
                <div 
                  className={`h-full ${barColor} transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="font-mono text-xs text-right">{m.days}d</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-border/50 pt-3 space-y-1">
        <div className="font-mono text-[9px] uppercase text-muted-foreground">
          {forecast.modelVersion} • {forecast.stormLabel} × {forecast.scenarioMultiplier} • source benchmark {forecast.sourceDate}
        </div>
        <p className="text-[9px] leading-relaxed text-muted-foreground">{forecast.calculation}</p>
        <p className="text-[9px] leading-relaxed text-amber-500/80">{forecast.limitations}</p>
      </div>
    </div>
  );
}