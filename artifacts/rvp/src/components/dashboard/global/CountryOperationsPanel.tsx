import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPin, Radio } from "lucide-react";
import type { BusinessContinuityDirectory, CountryRiskOverview, StormScenario } from "@workspace/api-client-react";
import { CountryFocusMap, type BoundarySelection } from "./CountryFocusMap";
import { FocusAreaDetails } from "./FocusAreaDetails";
import { CountryScenarioScores } from "./CountryScenarioScores";
import { cn } from "@/lib/utils";
import { getStormScenario } from "@/lib/storm-scenarios";

function getPlanningRange(overview: CountryRiskOverview, stormScenario: StormScenario) {
  const score = overview.resilience.score ?? null;
  if (score == null) return null;

  const historicalLoad = overview.historicalExposure.events.length * 0.65;
  const activeLoad = overview.phase.phase === "active_response" ? 3 : 0;
  const categoryThreeBaseline = Math.min(30, Math.max(5, 6 + (100 - score) / 7 + historicalLoad + activeLoad));
  const scenario = getStormScenario(stormScenario);
  const overall = Math.round(categoryThreeBaseline * scenario.recoveryMultiplier * 10) / 10;

  return {
    overall,
    metrics: [
      { label: "Power Grid", days: Math.round(overall * 0.72 * 10) / 10, max: 30 },
      { label: "Road Access", days: Math.round(overall * 0.38 * 10) / 10, max: 14 },
      { label: "Water Supply", days: Math.round(overall * 0.54 * 10) / 10, max: 21 },
      { label: "Comms Net", days: Math.round(overall * 0.3 * 10) / 10, max: 10 },
      { label: "Evac Cap", days: Math.round(overall * 0.2 * 10) / 10, max: 7 },
    ],
  };
}

export function CountryOperationsPanel({
  overview,
  continuity,
  continuityLoading,
  stormScenario,
  onStormScenarioChange,
}: {
  overview: CountryRiskOverview;
  continuity?: BusinessContinuityDirectory;
  continuityLoading: boolean;
  stormScenario: StormScenario;
  onStormScenarioChange: (scenario: StormScenario) => void;
}) {
  const { country, resilience } = overview;
  const [selectedArea, setSelectedArea] = useState<BoundarySelection | {
    id: string;
    name: string;
    level: string;
    scopeNote: string;
  }>();
  useEffect(() => setSelectedArea(undefined), [country.code]);
  const scenario = getStormScenario(stormScenario);
  const planningRange = getPlanningRange(overview, stormScenario);
  const listedServices = continuity?.organizations.length ?? 0;

  return (
    <section className="order-1 flex shrink-0 flex-col border border-border bg-card/20 rounded-sm overflow-visible min-h-[600px] mt-2">
      <header className="flex flex-wrap items-center justify-between gap-3 shrink-0 min-h-12 border-b border-border bg-card/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-primary" />
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Tactical Country Sector — {country.name}
            </span>
            <p className="mt-0.5 font-mono text-[9px] uppercase text-muted-foreground/70">
              National planning context with reference locations
            </p>
          </div>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-1">
          {overview.phase.phase.replace("_", " ")}
        </span>
      </header>

      <div className="grid grid-cols-12 gap-4 p-4">
        <div className="col-span-12 xl:col-span-7 flex flex-col border border-border bg-card/40 rounded-sm overflow-hidden min-h-[410px]">
          <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tactical Map Overview</span>
            <span className="font-mono text-[9px] uppercase text-muted-foreground">National scope</span>
          </div>
          <CountryFocusMap
            country={country}
            areas={overview.administrativeFocusAreas}
            selectedId={selectedArea?.id}
            onSelectArea={setSelectedArea}
            onSelectBoundary={setSelectedArea}
          />
        </div>

        <div className="col-span-12 xl:col-span-5 flex flex-col gap-4">
          <CountryScenarioScores
            overview={overview}
            stormScenario={stormScenario}
            onStormScenarioChange={onStormScenarioChange}
          />

          <section className="border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Recovery Planning Range · {scenario.label}
              </span>
              <span className="font-mono text-[10px] uppercase text-primary border border-primary/20 bg-primary/10 px-2 py-1">
                {planningRange ? `Overall: ${planningRange.overall} days` : "Source unavailable"}
              </span>
            </div>
            {planningRange ? (
              <>
                <div className="mt-4 grid gap-3">
                  {planningRange.metrics.map((metric) => {
                    const percentage = Math.min((metric.days / metric.max) * 100, 100);
                    const color = percentage > 70 ? "bg-red-500" : percentage > 40 ? "bg-amber-500" : "bg-green-500";
                    return (
                      <div key={metric.label} className="grid grid-cols-[94px_1fr_38px] items-center gap-3">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">{metric.label}</span>
                        <div className="h-2 overflow-hidden border border-border/50 bg-background">
                          <div className={cn("h-full", color)} style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="font-mono text-xs text-right">{metric.days}d</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 border-t border-border/50 pt-3">
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">
                    Country-recovery-planning-v2 · Category 3 baseline × {scenario.recoveryMultiplier} · World Bank capacity + NOAA/NHC exposure
                  </p>
                  <p className="mt-1 text-[9px] leading-relaxed text-amber-500/80">This is a country planning range, not an impact forecast, official restoration time, or safety direction.</p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">A planning range is not shown until the source-labelled resilience inputs are available.</p>
            )}
          </section>
        </div>

        <div className="col-span-12 xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="h-64 border border-border bg-card/40 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border/50 bg-background/50 p-3">
              <Radio className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Operational Feed Status</span>
            </div>
            <div className="flex-1 space-y-2 p-3">
              <StatusRow label="Dispatch status" detail="Local dispatch feed not onboarded" />
              <StatusRow label="Citizen intel" detail="Verified country report feed not onboarded" />
              <StatusRow
                label="Essential services"
                detail={continuityLoading ? "Checking continuity directory…" : listedServices > 0 ? `${listedServices} source-labelled entries available` : "Continuity directory not onboarded"}
                positive={listedServices > 0}
              />
              <p className="pt-1 text-[9px] leading-relaxed text-muted-foreground">Operational data is never inferred from national indicators, map listings, or another country’s response data.</p>
            </div>
          </section>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <FocusAreaDetails
            country={country}
            area={selectedArea}
            indicators={overview.worldBankIndicators}
            resilience={resilience}
          />
        </div>
      </div>
    </section>
  );
}

function StatusRow({ label, detail, positive = false }: { label: string; detail: string; positive?: boolean }) {
  return (
    <div className="flex items-start gap-2 border border-border/50 bg-background/40 px-2.5 py-2">
      {positive ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
      <div>
        <div className="font-mono text-[9px] uppercase text-muted-foreground">{label}</div>
        <p className="mt-0.5 text-[11px] text-foreground">{detail}</p>
      </div>
    </div>
  );
}