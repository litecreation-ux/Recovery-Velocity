import { useEffect, useRef, useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  getGetBusinessContinuityQueryKey,
  getGetCountryRiskOverviewQueryKey,
  useGetBusinessContinuity,
  useGetCountryRiskOverview,
  useListParishes,
  type StormScenario,
} from "@workspace/api-client-react";
import JamaicaMap from "@/components/dashboard/JamaicaMap";
import ReadinessPanel from "@/components/dashboard/ReadinessPanel";
import ForecastPanel from "@/components/dashboard/ForecastPanel";
import ReportsPanel from "@/components/dashboard/ReportsPanel";
import ResourceExchangePanel from "@/components/dashboard/ResourceExchangePanel";
import ParishInfrastructurePanel from "@/components/dashboard/ParishInfrastructurePanel";
import { Target, SlidersHorizontal } from "lucide-react";
import { ResilienceScoreCard } from "@/components/dashboard/global/ResilienceScoreCard";
import { IndicatorsAndHistoryCard } from "@/components/dashboard/global/IndicatorsAndHistoryCard";
import { BusinessContinuityList } from "@/components/dashboard/global/BusinessContinuityList";
import { CountryOperationsPanel } from "@/components/dashboard/global/CountryOperationsPanel";
import { CountryScenarioScores, type ScoreKey } from "@/components/dashboard/global/CountryScenarioScores";
import { useCountry } from "@/contexts/CountryContext";
import { DEFAULT_STORM_SCENARIO } from "@/lib/storm-scenarios";

export default function Dashboard() {
  const { selectedCountryCode, setSelectedCountryCode } = useCountry();
  const {
    data: selectedCountry,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useGetCountryRiskOverview(selectedCountryCode, {
    query: { queryKey: getGetCountryRiskOverviewQueryKey(selectedCountryCode), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000 },
  });
  const { data: continuity, isLoading: continuityLoading } = useGetBusinessContinuity(selectedCountryCode, {
    query: { queryKey: getGetBusinessContinuityQueryKey(selectedCountryCode), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000 },
  });
  
  const [selectedParishId, setSelectedParishId] = useState<string>("kingston");
  const [stormScenario, setStormScenario] = useState<StormScenario>(DEFAULT_STORM_SCENARIO);
  const [isReadinessFocused, setIsReadinessFocused] = useState(false);
  const readinessPanelRef = useRef<HTMLDivElement>(null);
  const [showPanelControls, setShowPanelControls] = useState(false);
  const [visiblePanels, setVisiblePanels] = useState({
    preparedness: true,
    history: true,
    continuity: true,
    localMap: true,
  });
  const { data: parishes } = useListParishes();
  useEffect(() => {
    setIsReadinessFocused(false);
    setStormScenario(DEFAULT_STORM_SCENARIO);
  }, [selectedCountryCode]);
  const panelOptions = [
    ["preparedness", "Preparedness capacity"],
    ["history", "Hurricane history"],
    ["continuity", "Essential services"],
    ["localMap", "Country map & local context"],
  ] as const;
  const handleScoreSelect = (scoreKey: ScoreKey) => {
    const shouldFocusReadiness = scoreKey === "readiness" && selectedCountry?.country.hasOperationalUnits;
    setIsReadinessFocused(Boolean(shouldFocusReadiness));
    if (shouldFocusReadiness) {
      requestAnimationFrame(() => {
        readinessPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };
  return (
    <div className="relative flex h-full overflow-hidden bg-background">
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col p-4 gap-4 relative z-0">
        {overviewLoading ? (
          <div className="min-h-[360px] border border-border bg-card/30 grid place-items-center">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Refreshing source-labelled risk context…</span>
          </div>
        ) : overviewError || !selectedCountry ? (
          <div className="min-h-[240px] border border-destructive/30 bg-destructive/5 grid place-items-center p-8 text-center">
            <div>
              <div className="font-mono text-sm uppercase text-destructive">Country context unavailable</div>
              <p className="mt-2 max-w-lg text-xs text-muted-foreground">The platform could not load this country overview. No current values have been inferred or fabricated. Try the refresh again shortly.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="order-2 flex flex-wrap items-center justify-between gap-3 border border-border bg-card/30 px-4 py-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Caribbean resilience workspace</div>
                <p className="mt-1 text-[10px] text-muted-foreground">Choose the planning categories to show. Removing a panel hides it only; no risk data is discarded.</p>
              </div>
              <button type="button" onClick={() => setShowPanelControls((value) => !value)} className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 font-mono text-[9px] uppercase text-muted-foreground hover:text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Configure panels
              </button>
              {showPanelControls && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border-t border-border/50 pt-3">
                  {panelOptions.map(([id, label]) => (
                    <label key={id} className="flex cursor-pointer items-center gap-2 border border-border/50 bg-background/40 px-3 py-2 font-mono text-[9px] uppercase text-muted-foreground">
                      <input type="checkbox" checked={visiblePanels[id]} onChange={() => setVisiblePanels((panels) => ({ ...panels, [id]: !panels[id] }))} className="accent-cyan-400" />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="order-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 shrink-0">
              {visiblePanels.preparedness && <ResilienceScoreCard score={selectedCountry.resilience} />}
              {visiblePanels.history && <IndicatorsAndHistoryCard indicators={selectedCountry.worldBankIndicators} history={selectedCountry.historicalExposure} regionalReference={selectedCountry.regionalReference} />}
              {visiblePanels.continuity && <div className="md:col-span-2 xl:col-span-1"><BusinessContinuityList directory={continuity} isLoading={continuityLoading} /></div>}
            </div>

            {visiblePanels.localMap && (selectedCountry.country.hasOperationalUnits ? (
              <div className="order-1 flex shrink-0 flex-col border border-border bg-card/20 rounded-sm overflow-visible min-h-[600px] mt-2">
                <header className="flex items-center justify-between shrink-0 h-12 border-b border-border bg-card/50 px-4">
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Tactical Parish Sector — {selectedCountry.country.name}</span>
                  </div>
                  <div className="w-64">
                    <Select value={selectedParishId} onValueChange={setSelectedParishId}>
                      <SelectTrigger className="h-8 text-xs font-mono bg-background border-border"><SelectValue placeholder="Select Parish..." /></SelectTrigger>
                      <SelectContent>
                        {parishes?.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs font-mono">{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </header>
                <div className="grid grid-cols-12 items-start gap-4 p-4">
                  <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-w-0">
                    <CountryScenarioScores
                      overview={selectedCountry}
                      stormScenario={stormScenario}
                      onStormScenarioChange={setStormScenario}
                      onScoreSelect={handleScoreSelect}
                    />
                    <div className="flex flex-col border border-border bg-card/40 rounded-sm relative overflow-hidden group min-h-[400px]">
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                      <div className="px-4 py-2 border-b border-border/50 bg-muted/20 backdrop-blur shrink-0 flex items-center justify-between z-10">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tactical Map Overview</span>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-green-500" /><span className="text-muted-foreground">Moderate</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-500" /><span className="text-muted-foreground">At Risk</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-red-500" /><span className="text-muted-foreground">Critical</span></div>
                        </div>
                      </div>
                      <div className="h-[360px] shrink-0 md:h-[420px]">
                        <JamaicaMap selectedParishId={selectedParishId} onSelectParish={setSelectedParishId} parishes={parishes || []} />
                      </div>
                    </div>
                    <ParishInfrastructurePanel parishId={selectedParishId} />
                  </div>
                  <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
                    <div ref={readinessPanelRef}>
                      <ReadinessPanel parishId={selectedParishId} isFocused={isReadinessFocused} />
                    </div>
                    <ForecastPanel parishId={selectedParishId} stormScenario={stormScenario} />
                    <ResourceExchangePanel />
                    <ReportsPanel parishId={selectedParishId} />
                  </div>
                </div>
              </div>
            ) : (
              <CountryOperationsPanel
                overview={selectedCountry}
                continuity={continuity}
                continuityLoading={continuityLoading}
                stormScenario={stormScenario}
                onStormScenarioChange={setStormScenario}
              />
            ))}
          </>
        )}
      </main>
    </div>
  );
}