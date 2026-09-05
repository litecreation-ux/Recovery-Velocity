import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListTasksQueryKey,
  getGetParishQueryKey,
  getListResourceOperationalStatusesQueryKey,
  useDispatchTask,
  useGetCountryRiskOverview,
  useGetParish,
  useListResourceDeclarations,
  useListResourceOperationalStatuses,
  useListParishes,
  useListReviewItems,
  useListTasks,
  useRecordResourceOperations,
  type TaskScoreArea,
  type CountryRiskOverview,
  type ParishDetail,
  type ParishReadinessEvidence,
  type ParishReadinessFactor,
  type ParishReadinessMetric,
  type ParishReadinessSource,
  type ParishReadinessTrendPoint,
  type ResourceOperationalStatus,
} from "@workspace/api-client-react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Layers3,
  Send,
  ShieldCheck,
  Target,
  Waves,
} from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { useRole, type Role } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { DEFAULT_STORM_SCENARIO, getStormScenario } from "@/lib/storm-scenarios";

const OFFICERS = [
  "Officer Reid — Kingston",
  "Officer Brown — St. Thomas",
  "Officer Campbell — Westmoreland",
  "Officer White — Hanover",
  "Officer James — St. Elizabeth",
  "Officer Clarke — Portland",
];

type Section = "scores" | "recommendations" | "incidents" | "tasks";
type Recommendation = {
  id: string;
  scoreArea: TaskScoreArea;
  title: string;
  step: string;
  priority: "critical" | "high" | "medium";
  impactPoints: number;
  owner: string;
  expectedImpact: string;
  evidenceStatus: "planning_guidance" | "partner_reported" | "evidence_backed";
};

function getSection(location: string): Section {
  if (location.includes("recommendations")) return "recommendations";
  if (location.includes("incidents")) return "incidents";
  if (location.includes("tasks")) return "tasks";
  return "scores";
}

function tone(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score < 40) return "text-red-500";
  if (score < 65) return "text-amber-500";
  return "text-green-500";
}

function priorityClass(priority: Recommendation["priority"]) {
  if (priority === "critical") return "border-red-500/30 bg-red-500/10 text-red-500";
  if (priority === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-500";
  return "border-primary/30 bg-primary/10 text-primary";
}

function icsPhaseLabel(scoreArea: Recommendation["scoreArea"]) {
  if (scoreArea === "readiness") return "PRE-INCIDENT PLANNING";
  if (scoreArea === "recovery") return "RESPONSE PHASE";
  if (scoreArea === "resilience") return "RECOVERY PHASE";
  return null;
}

function triageIncident(type: string, status: string) {
  const base = type === "infrastructure_alert"
    ? { score: 82, area: "recovery" }
    : type === "evacuation_plan"
      ? { score: 70, area: "readiness" }
      : type === "resource_request"
        ? { score: 58, area: "recovery" }
        : { score: 50, area: "resilience" };
  const statusAdjustment = status === "pending" ? 5 : status === "approved" ? -8 : -15;
  const score = Math.max(0, Math.min(100, base.score + statusAdjustment));
  return {
    ...base,
    baseScore: base.score,
    statusAdjustment,
    score,
    label: score >= 80 ? "Critical" : score >= 65 ? "High" : score >= 45 ? "Moderate" : "Lower",
  };
}

export default function OpsWorkflow() {
  const [location] = useLocation();
  const section = getSection(location);
  const { role, parishId: assignedParishId } = useRole();
  const { selectedCountryCode } = useCountry();
  const parishLocked = role === "parish_manager" && Boolean(assignedParishId);
  const [selectedParishId, setSelectedParishId] = useState(assignedParishId ?? "kingston");
  const { data: overview, isLoading: overviewLoading } = useGetCountryRiskOverview(selectedCountryCode);
  const { data: parishes } = useListParishes();
  const hasParishScope = Boolean(overview?.country.hasOperationalUnits);
  const effectiveParishId = parishLocked ? assignedParishId! : selectedParishId;
  const { data: parish } = useGetParish(effectiveParishId, {
    query: { enabled: hasParishScope, queryKey: getGetParishQueryKey(effectiveParishId) },
  });

  const title = {
    scores: "Preparedness SITREP",
    recommendations: "Incident Action Plan — Recommended Actions",
    incidents: "Ops Section — Active Incident Triage",
    tasks: "Logistics Section",
  }[section];

  return (
    <div className="min-h-full bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card/50 px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">ICS Workflow</div>
            <h1 className="mt-1 text-lg font-bold uppercase tracking-tight">{title}</h1>
            <p className="mt-1 max-w-2xl text-[11px] text-muted-foreground">
              Move from explainable risk and capacity scores to accountable field work. Assigning or completing work does not automatically increase a score.
            </p>
          </div>
          {hasParishScope && (
            <label className="flex items-center gap-2 font-mono text-[9px] uppercase text-muted-foreground">
              Operational scope
              <select
                value={effectiveParishId}
                disabled={parishLocked}
                onChange={(event) => setSelectedParishId(event.target.value)}
                className="h-8 border border-border bg-background px-3 text-[10px] text-foreground disabled:opacity-70"
              >
                {parishes?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
        </header>

        <nav className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4" aria-label="ICS workflow sections">
          {[
            ["/ops/scores", "Preparedness SITREP"],
            ["/ops/recommendations", "Incident Action Plan"],
            ["/ops/incidents", "Ops Section"],
            ["/ops/tasks", "Logistics Section"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className={cn(
              "bg-card px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary",
              location === href && "bg-primary/10 text-primary",
            )}>
              {label}
            </Link>
          ))}
        </nav>

        {overviewLoading || !overview ? (
          <div className="grid min-h-64 place-items-center border border-border bg-card/30 font-mono text-xs uppercase text-muted-foreground">Loading score context…</div>
        ) : section === "scores" ? (
          <ScoreDetails overview={overview} parish={hasParishScope ? parish : undefined} />
        ) : section === "recommendations" ? (
          <Recommendations
            countryName={overview.country.name}
            parishId={hasParishScope ? effectiveParishId : undefined}
            parishName={parish?.name}
            bottleneck={parish?.bottleneck}
            allowAssignment={hasParishScope}
          />
        ) : section === "incidents" ? (
          <IncidentRisk parishId={role === "parish_manager" ? effectiveParishId : hasParishScope ? undefined : "__no-operational-scope__"} />
        ) : (
          <LogisticsSection
            parishId={hasParishScope ? effectiveParishId : "__no-operational-scope__"}
            parishName={parish?.name ?? effectiveParishId}
            role={role as Role}
          />
        )}
      </div>
    </div>
  );
}

function ScoreDetails({ overview, parish }: { overview: CountryRiskOverview; parish?: ParishDetail }) {
  const [openFactor, setOpenFactor] = useState<string | null>(parish?.readinessEvidence.factors[0]?.name ?? null);
  const baseline = overview.resilience.score;
  const benchmark = getStormScenario(DEFAULT_STORM_SCENARIO);
  const readiness = baseline == null ? null : Math.max(0, baseline - benchmark.intensityPenalty);
  const phasePenalty = overview.phase.phase === "active_response" ? 18 : overview.phase.phase === "recovery" ? 8 : 0;
  const recovery = baseline == null ? null : Math.max(0, baseline - benchmark.intensityPenalty - 8 - phasePenalty);
  const resilience = baseline == null ? null : Math.max(0, baseline - Math.round(benchmark.intensityPenalty * 0.7));
  const cards = [
    { label: "Readiness", score: readiness, icon: ShieldCheck, stage: "Before impact", detail: "Preparedness capacity before the benchmark event." },
    { label: "Recovery", score: recovery, icon: Waves, stage: "During event", detail: "Capacity to maintain essential services during disruption." },
    { label: "Resilience", score: resilience, icon: Activity, stage: "Aftermath", detail: "Capacity to restore and improve after the event." },
  ];
  const localEvidence = parish?.readinessEvidence;
  const factors: ParishReadinessFactor[] = localEvidence?.factors ?? overview.resilience.factors.map((factor) => ({
    name: factor.name,
    score: factor.value ?? null,
    weight: factor.weight,
    direction: factor.direction,
    metrics: [],
  }));
  const rankedFactors = [...factors].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  const strongestFactor = rankedFactors[0]?.name ?? "the leading contributing factor";
  const damagingFactor = rankedFactors[rankedFactors.length - 1]?.name ?? "the largest constraint";
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="border border-border bg-card/40 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Sub-scores</div>
        <div className="mt-3 space-y-3">
          {cards.map(({ label, score, icon: Icon, stage, detail }) => (
            <div key={label} className="border border-border/50 bg-background/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><Icon className={cn("h-4 w-4", tone(score))} />{label}</span>
                <span className="font-mono text-[8px] uppercase text-muted-foreground">{stage}</span>
              </div>
              <div className={cn("mt-2 font-mono text-4xl font-bold", tone(score))}>{score ?? "—"}<span className="ml-1 text-xs text-muted-foreground">/100</span></div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border/50 pt-3 font-mono text-[9px] uppercase text-amber-500/80">Scenario projection · national planning proxy · not a live incident measurement</div>
      </section>
      <section className="border border-border bg-card/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Contributing factors · explainable</div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {localEvidence ? "Select a factor to inspect its source inputs and freshness." : "National planning factors only; parish-level evidence is unavailable for this country."}
            </p>
          </div>
          {localEvidence && <span className="border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[8px] uppercase text-primary">Jamaica parish evidence</span>}
        </div>
        <div className="mt-3 space-y-2">
          {rankedFactors.map((factor, index) => (
            <FactorEvidence
              key={factor.name}
              factor={factor}
              index={index}
              isOpen={openFactor === factor.name}
              onToggle={() => setOpenFactor((current) => current === factor.name ? null : factor.name)}
              localEvidenceAvailable={Boolean(localEvidence)}
            />
          ))}
        </div>
        {localEvidence && (
          <>
            <p className="mt-3 border-l-2 border-amber-500/50 bg-amber-500/5 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">{localEvidence.scopeNote}</p>
            <EvidenceSourceRegister sources={localEvidence.sources} />
          </>
        )}
        <p className="mt-4 border-t border-border/50 pt-3 text-[11px] leading-relaxed text-foreground">What would move the score most: address {parish?.bottleneck ?? damagingFactor} while preserving {strongestFactor}.</p>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">Scoring methodology aligned with CDEMA Caribbean Disaster Management Framework and ICS National Incident Management standards.</p>
        <details className="mt-3 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer font-mono uppercase tracking-wide">Methodology details</summary>
          <p className="mt-2 leading-relaxed">{overview.resilience.calculation}</p>
        </details>
      </section>
      {parish && (
        <section className="border border-border bg-card/40 p-4 lg:col-span-2">
          <div className="grid gap-5 md:grid-cols-[0.65fr_1.35fr]">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Current baseline — pre-scenario</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{parish.name} operational readiness</div>
              <div className={cn("mt-2 font-mono text-3xl font-bold", tone(parish.readinessScore))}>{parish.readinessScore}<span className="ml-1 text-xs text-muted-foreground">/100</span></div>
              <p className="mt-2 text-[11px] leading-relaxed text-foreground">{parish.bottleneck}</p>
              <div className="mt-3 border-t border-border/50 pt-3 font-mono text-[9px] uppercase leading-relaxed text-primary">
                Parish rank: {parish.readinessEvidence.peerComparison.rank} of {parish.readinessEvidence.peerComparison.totalParishes}
                <span className="text-muted-foreground"> · National average: {parish.readinessEvidence.peerComparison.nationalAverage} · Lowest: {parish.readinessEvidence.peerComparison.lowestParish} {parish.readinessEvidence.peerComparison.lowestScore}</span>
              </div>
            </div>
            <ReadinessTrend evidence={parish.readinessEvidence} parishName={parish.name} />
          </div>
        </section>
      )}
    </div>
  );
}

function evidenceBadge(metric: ParishReadinessMetric) {
  if (metric.evidenceType === "verified_observation") return { label: "Verified observation", className: "border-green-500/30 bg-green-500/10 text-green-500" };
  if (metric.evidenceType === "planning_proxy") return { label: "Planning proxy", className: "border-amber-500/30 bg-amber-500/10 text-amber-500" };
  return { label: "Unavailable", className: "border-border bg-muted/30 text-muted-foreground" };
}

function freshnessBadge(freshness: ParishReadinessMetric["freshnessState"]) {
  if (freshness === "current") return { label: "Current", className: "border-green-500/30 bg-green-500/10 text-green-500" };
  if (freshness === "historical") return { label: "Historical", className: "border-blue-500/30 bg-blue-500/10 text-blue-400" };
  if (freshness === "stale") return { label: "Stale", className: "border-amber-500/30 bg-amber-500/10 text-amber-500" };
  return { label: "Unavailable", className: "border-red-500/30 bg-red-500/10 text-red-500" };
}

function formatMetricValue(metric: ParishReadinessMetric) {
  if (metric.value == null) return "Unavailable";
  if (metric.unit.startsWith("%")) return `${metric.value}%`;
  return `${metric.value} ${metric.unit}`;
}

function EvidenceSourceRegister({ sources }: { sources: ParishReadinessSource[] }) {
  return (
    <details className="mt-3 border border-border/60 bg-background/40">
      <summary className="cursor-pointer px-3 py-2 font-mono text-[9px] uppercase tracking-wide text-primary">
        Authoritative source register · {sources.length} onboarded
      </summary>
      <div className="grid gap-2 border-t border-border/50 p-3">
        {sources.map((source) => {
          const freshness = freshnessBadge(source.freshnessState);
          return (
            <article key={source.id} className="border border-border/50 bg-card/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-foreground underline decoration-primary/50 underline-offset-2 hover:text-primary">
                    {source.name}
                  </a>
                  <div className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">{source.authority}</div>
                </div>
                <span className={cn("border px-1.5 py-0.5 font-mono text-[7px] uppercase", freshness.className)}>{freshness.label}</span>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{source.permissionNote}</p>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground"><strong className="text-foreground">Refresh:</strong> {source.refreshExpectation}</p>
              <div className="mt-2 font-mono text-[8px] uppercase text-muted-foreground">
                Observation: {source.observationDate ?? "Unavailable"} · checked: {source.lastCheckedAt ?? "Not checked"} · source health: {source.sourceStatus}
              </div>
              {source.contentSha256 && <p className="mt-1 break-all font-mono text-[7px] uppercase text-muted-foreground/70">Imported content SHA-256: {source.contentSha256}</p>}
              {source.detail && <p className="mt-2 border-l border-border pl-2 text-[9px] leading-relaxed text-muted-foreground/80">{source.detail}</p>}
            </article>
          );
        })}
      </div>
    </details>
  );
}

function FactorEvidence({
  factor,
  index,
  isOpen,
  onToggle,
  localEvidenceAvailable,
}: {
  factor: ParishReadinessFactor;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  localEvidenceAvailable: boolean;
}) {
  const panelId = `factor-evidence-${factor.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const reducesScore = factor.direction.toLowerCase().includes("reduce");
  const meterWidth = factor.score == null ? 0 : Math.max(4, Math.min(100, Math.abs(factor.score)));
  const layerLabels = [...new Set(factor.metrics.flatMap((metric) => metric.dataLayers))];
  return (
    <article className="border border-border/60 bg-background/40">
      <button
        type="button"
        className="w-full px-3 py-3 text-left hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        data-testid={`button-factor-${index}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase">
              <span className="text-muted-foreground">{index + 1}.</span>
              <span className="text-foreground">{factor.name}</span>
              {layerLabels.map((layer) => <span key={layer} className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[7px] text-primary">{layer.split(" ")[0]}</span>)}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{factor.weight} · {factor.direction}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("font-mono text-sm font-bold", factor.score == null ? "text-muted-foreground" : reducesScore ? "text-red-500" : "text-green-500")}>{factor.score ?? "—"}</span>
            <ChevronDown className={cn("h-4 w-4 text-primary transition-transform", isOpen && "rotate-180")} />
          </div>
        </div>
        <div className="mt-2 h-1 bg-muted/40">
          <div className={cn("h-full transition-all", reducesScore ? "bg-red-500" : factor.score == null ? "bg-muted-foreground/40" : "bg-green-500")} style={{ width: `${meterWidth}%` }} />
        </div>
      </button>
      {isOpen && (
        <div id={panelId} className="border-t border-border/50 px-3 py-3">
          {!localEvidenceAvailable || factor.metrics.length === 0 ? (
            <div className="flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Parish-level inputs are not onboarded for this national planning factor.
            </div>
          ) : (
            <div className="grid gap-2">
              {factor.metrics.map((metric) => {
                const badge = evidenceBadge(metric);
                const freshness = freshnessBadge(metric.freshnessState);
                return (
                  <div key={metric.label} className="border border-border/50 bg-card/40 p-3" data-testid="factor-metric">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-foreground">{metric.label}</div>
                        <div className={cn("mt-1 font-mono text-lg font-bold", metric.value == null ? "text-muted-foreground" : "text-primary")}>{formatMetricValue(metric)}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className={cn("border px-1.5 py-0.5 font-mono text-[7px] uppercase", badge.className)}>{badge.label}</span>
                        <span className={cn("border px-1.5 py-0.5 font-mono text-[7px] uppercase", freshness.className)}>{freshness.label}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[8px] uppercase text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />Observed: {metric.observationDate ?? "Unavailable"}</span>
                      <span className="flex items-center gap-1"><Database className="h-3 w-3" />Source: {metric.sourceUrl ? <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-primary">{metric.sourceName}</a> : metric.sourceName}</span>
                      <span>Checked: {metric.lastCheckedAt ?? "Not checked"}</span>
                      {metric.sourceRecordId && <span>Record: {metric.sourceRecordId}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Layers3 className="mr-1 h-3 w-3 text-primary" />
                      {metric.dataLayers.map((layer) => <span key={layer} className="border border-border bg-muted/20 px-1.5 py-0.5 font-mono text-[7px] uppercase text-muted-foreground">{layer}</span>)}
                    </div>
                    <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground/80"><strong className="text-foreground">Refresh:</strong> {metric.refreshExpectation}</p>
                    {(metric.sourceStatus !== "available" || metric.unavailableDetail) && (
                      <p className="mt-2 border-l-2 border-red-500/50 bg-red-500/5 px-2 py-1.5 text-[9px] leading-relaxed text-red-400">
                        Source health: {metric.sourceStatus}. {metric.unavailableDetail}
                      </p>
                    )}
                    <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground/80">{metric.note}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ReadinessTrend({ evidence, parishName }: { evidence: ParishReadinessEvidence; parishName: string }) {
  const width = 420;
  const height = 116;
  const padX = 22;
  const padY = 18;
  const scores = evidence.trend.map((point) => point.score);
  const minScore = Math.max(0, Math.min(...scores) - 6);
  const maxScore = Math.min(100, Math.max(...scores) + 6);
  const scoreRange = Math.max(1, maxScore - minScore);
  const pointPosition = (point: ParishReadinessTrendPoint, index: number) => ({
    x: padX + (index * (width - padX * 2)) / Math.max(1, evidence.trend.length - 1),
    y: padY + ((maxScore - point.score) / scoreRange) * (height - padY * 2),
  });
  const baselinePoints = evidence.trend.filter((point) => point.kind !== "scenario_projection");
  const projectionPoint = evidence.trend.find((point) => point.kind === "scenario_projection");
  const baselinePolyline = baselinePoints.map((point, index) => {
    const position = pointPosition(point, index);
    return `${position.x},${position.y}`;
  }).join(" ");
  const lastBaseline = baselinePoints[baselinePoints.length - 1];
  const lastBaselinePosition = lastBaseline ? pointPosition(lastBaseline, baselinePoints.length - 1) : null;
  const projectionIndex = projectionPoint ? evidence.trend.indexOf(projectionPoint) : -1;
  const projectionPosition = projectionPoint ? pointPosition(projectionPoint, projectionIndex) : null;
  const titleId = `trend-title-${parishName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const descriptionId = `${titleId}-description`;
  return (
    <div className="border border-border/50 bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-primary">90-day readiness trend</div>
          <div className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">Planning proxy · scenario separated</div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[7px] uppercase text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-1.5 w-4 bg-primary" />Planning baseline</span>
          <span className="flex items-center gap-1"><span className="h-0 w-4 border-t border-dashed border-red-500" />Projection</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-28 w-full" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>{parishName} 90-day readiness planning trend</title>
        <desc id={descriptionId}>{evidence.trendSummary}</desc>
        {[0.25, 0.5, 0.75].map((fraction) => <line key={fraction} x1={padX} x2={width - padX} y1={padY + fraction * (height - padY * 2)} y2={padY + fraction * (height - padY * 2)} stroke="currentColor" className="text-border" strokeWidth="1" />)}
        <polyline points={baselinePolyline} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" />
        {lastBaselinePosition && projectionPosition && <line x1={lastBaselinePosition.x} y1={lastBaselinePosition.y} x2={projectionPosition.x} y2={projectionPosition.y} stroke="rgb(239 68 68)" strokeWidth="2" strokeDasharray="5 5" />}
        {evidence.trend.map((point, index) => {
          const position = pointPosition(point, index);
          const projected = point.kind === "scenario_projection";
          return (
            <g key={`${point.label}-${point.kind}`}>
              <circle cx={position.x} cy={position.y} r="4" fill={projected ? "rgb(239 68 68)" : "hsl(var(--primary))"} />
              <text x={position.x} y={Math.max(10, position.y - 9)} textAnchor="middle" className={projected ? "fill-red-500" : "fill-foreground"} fontSize="9" fontFamily="monospace">{point.score}</text>
              <text x={position.x} y={height - 2} textAnchor="middle" className="fill-muted-foreground" fontSize="7" fontFamily="monospace">{point.label}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 border-t border-border/50 pt-2 text-[9px] leading-relaxed text-muted-foreground">{evidence.trendSummary}</p>
    </div>
  );
}

function buildRecommendations(scope: string, bottleneck?: string): Recommendation[] {
  return [
    {
      id: "readiness-bottleneck",
      scoreArea: "readiness",
      title: "Verify and clear the critical readiness bottleneck",
      step: bottleneck ? `Confirm current conditions and produce an action update for: ${bottleneck}` : `Validate priority preparedness gaps for ${scope} and document evidence-backed corrective actions.`,
      priority: "critical",
      impactPoints: 8,
      owner: "Ops Section Chief",
      expectedImpact: "Removes a documented readiness constraint; score impact requires accepted field evidence.",
      evidenceStatus: "planning_guidance",
    },
    {
      id: "recovery-access",
      scoreArea: "recovery",
      title: "Validate recovery access and restoration dependencies",
      step: "Inspect road, power, water, communications, and evacuation dependencies; report blockers and estimated operational sequence.",
      priority: "high",
      impactPoints: 5,
      owner: "Field Unit Leader",
      expectedImpact: "Improves confidence in recovery sequencing; does not change the recovery projection by itself.",
      evidenceStatus: "planning_guidance",
    },
    {
      id: "resilience-continuity",
      scoreArea: "resilience",
      title: "Confirm essential-service continuity contacts",
      step: "Verify contact and evidence status for health, fuel, food, finance, shelter, and logistics services without treating directory hours as operational proof.",
      priority: "medium",
      impactPoints: 3,
      owner: "Ops Section Chief",
      expectedImpact: "Strengthens continuity evidence and reduces unknowns in resilience planning.",
      evidenceStatus: "planning_guidance",
    },
  ];
}

function Recommendations({ countryName, parishId, parishName, bottleneck, allowAssignment }: { countryName: string; parishId?: string; parishName?: string; bottleneck?: string; allowAssignment: boolean }) {
  const scope = parishName ?? countryName;
  const order = { critical: 0, high: 1, medium: 2 };
  const recommendations = buildRecommendations(scope, bottleneck).sort((a, b) => order[a.priority] - order[b.priority]);
  return (
    <div className="grid gap-3">
      {!allowAssignment && (
        <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-500">This country has national planning proxies only. Task assignment is unavailable until verified local operational coverage is onboarded.</div>
      )}
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} parishId={parishId} parishName={parishName} allowAssignment={allowAssignment} />
      ))}
    </div>
  );
}

function RecommendationCard({ recommendation, parishId, parishName, allowAssignment }: { recommendation: Recommendation; parishId?: string; parishName?: string; allowAssignment: boolean }) {
  const queryClient = useQueryClient();
  const dispatch = useDispatchTask();
  const [open, setOpen] = useState(false);
  const [officer, setOfficer] = useState("");
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState("");
  const handleAssign = () => {
    if (!officer || !parishId || !parishName) return;
    setError("");
    dispatch.mutate({
      data: {
        incidentId: 0,
        title: recommendation.title,
        parishId,
        parishName,
        officer,
        instructions: recommendation.step,
        scoreArea: recommendation.scoreArea,
        recommendationId: recommendation.id,
        expectedImpact: recommendation.expectedImpact,
         impactPoints: recommendation.impactPoints,
        evidenceStatus: recommendation.evidenceStatus,
      },
    }, {
      onSuccess: () => {
        setAssigned(true);
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
      },
      onError: () => setError("Assignment could not be created. Check the operational scope and try again."),
    });
  };
  return (
    <article className="border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("border px-2 py-0.5 font-mono text-[8px] uppercase", priorityClass(recommendation.priority))}>{recommendation.priority}</span>
            <span title="Planning estimate; applied only after accepted evidence." className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-primary">+{recommendation.impactPoints} pts</span>
            {icsPhaseLabel(recommendation.scoreArea) && (
              <span className="border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground">{icsPhaseLabel(recommendation.scoreArea)}</span>
            )}
          </div>
          <h2 className="mt-2 text-sm font-bold uppercase">{recommendation.title}</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{recommendation.expectedImpact}</p>
          <div className="mt-3 font-mono text-[9px] uppercase text-muted-foreground">Responsible: <span className="text-foreground">{recommendation.owner}</span></div>
        </div>
        {allowAssignment && (
          <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[9px] uppercase text-primary hover:bg-primary hover:text-primary-foreground">
            {assigned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}{assigned ? "Assigned" : "Assign task"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border/50 pt-3">
          <label className="flex min-w-64 flex-1 flex-col gap-1 font-mono text-[9px] uppercase text-muted-foreground">Field unit leader
            <select value={officer} onChange={(event) => setOfficer(event.target.value)} className="h-9 border border-border bg-background px-3 text-[10px] text-foreground">
              <option value="">Select officer</option>
              {OFFICERS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <button type="button" onClick={handleAssign} disabled={!officer || dispatch.isPending} className="h-9 border border-primary/30 bg-primary px-4 font-mono text-[9px] uppercase text-primary-foreground disabled:opacity-50">
            {dispatch.isPending ? "Assigning…" : "Confirm assignment"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[10px] text-red-500">{error}</p>}
    </article>
  );
}

function IncidentRisk({ parishId }: { parishId?: string }) {
  const { data: items, isLoading } = useListReviewItems();
  const { data: tasks } = useListTasks({}, { query: { queryKey: getListTasksQueryKey({}), refetchInterval: 10_000 } });
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const scoped = items?.filter((item) => !parishId || item.parishId === parishId) ?? [];
  const filtered = scoped
    .filter((item) => showAll || triageIncident(item.type, item.status).score >= 65)
    .sort((a, b) => triageIncident(b.type, b.status).score - triageIncident(a.type, a.status).score);
  const elapsed = (createdAt: string) => {
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
    return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
  };
  return (
    <div className="border border-border bg-card/40">
      <div className="border border-border bg-muted/30 p-3 text-[10px] text-muted-foreground">Active triage queue — ICS Operations Section. Priority scores are AI-generated indicators based on incident type and approval status. All actions require Incident Command authorization before execution.</div>
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">{filtered.length} of {scoped.length} incidents visible</span>
        <div className="flex border border-border">
          <button type="button" onClick={() => setShowAll(false)} className={cn("px-3 py-1.5 font-mono text-[8px] uppercase", !showAll ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Critical + High</button>
          <button type="button" onClick={() => setShowAll(true)} className={cn("px-3 py-1.5 font-mono text-[8px] uppercase", showAll ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Show all</button>
        </div>
      </div>
      {isLoading ? <div className="p-8 text-center font-mono text-xs text-muted-foreground">Loading incidents…</div> : filtered.length === 0 ? (
        <div className="p-8 text-center font-mono text-xs uppercase text-muted-foreground">No critical or high incidents in this scope</div>
      ) : filtered.map((item) => {
        const severity = triageIncident(item.type, item.status);
        const isOpen = openId === item.id;
        const assignment = tasks?.find((task) => task.incidentId === item.id);
        return (
          <article key={item.id} className="border-b border-border/50 last:border-0">
            <div className="grid items-center gap-3 px-3 py-3 md:grid-cols-[110px_1fr_120px_130px_80px]">
              <span className={cn("w-fit border px-2 py-1 font-mono text-[8px] uppercase", severity.score >= 80 ? "border-red-500/30 bg-red-500/10 text-red-500" : "border-amber-500/30 bg-amber-500/10 text-amber-500")}>{severity.label} · {severity.score}</span>
              <div className="min-w-0">
                <h2 className="truncate text-xs font-bold uppercase">{item.title}</h2>
                <div className="mt-0.5 font-mono text-[8px] uppercase text-muted-foreground">{item.parishName}</div>
              </div>
              <span className="w-fit border border-border bg-muted/20 px-2 py-1 font-mono text-[8px] uppercase text-muted-foreground">{item.type.replace("_", " ")}</span>
              <span className="font-mono text-[8px] uppercase text-muted-foreground">{elapsed(item.createdAt)}</span>
              <button type="button" onClick={() => setOpenId(isOpen ? null : item.id)} className="flex items-center justify-center gap-1 border border-primary/30 px-3 py-2 font-mono text-[8px] uppercase text-primary">{isOpen ? "Close" : "Open"} <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} /></button>
            </div>
            {isOpen && (
              <div className="border-t border-border/40 bg-background/40 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
                <div className="mt-2 font-mono text-[8px] uppercase text-muted-foreground">Status: {item.status} · {severity.area} concern · triage {severity.score}/100</div>
                <div className="mt-3 border border-border bg-card/60 p-3">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-primary">Field Assignment</div>
                  {assignment ? (
                    <div className="mt-2 grid gap-2 text-[10px] md:grid-cols-3">
                      <div><span className="font-mono uppercase text-muted-foreground">Leader</span><div className="mt-1 text-foreground">{assignment.officer}</div></div>
                      <div><span className="font-mono uppercase text-muted-foreground">Status</span><div className={cn("mt-1 font-mono uppercase", assignment.status === "completed" ? "text-green-500" : assignment.status === "pending_verification" ? "text-violet-400" : assignment.status === "in_progress" ? "text-blue-400" : "text-amber-500")}>{assignment.status.replace("_", " ")}</div></div>
                      <div><span className="font-mono uppercase text-muted-foreground">Assigned</span><div className="mt-1 text-foreground">{new Date(assignment.createdAt).toLocaleString()}</div></div>
                      {assignment.fieldNote && <div className="border-l-2 border-primary/40 pl-2 md:col-span-3"><span className="font-mono uppercase text-muted-foreground">Field note</span><p className="mt-1 text-muted-foreground">{assignment.fieldNote}</p></div>}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-muted-foreground">No field assignment has been dispatched for this incident.</p>
                  )}
                </div>
                <Link href={`/review?incidentId=${item.id}`} className="mt-3 inline-flex items-center gap-1 bg-primary px-3 py-2 font-mono text-[8px] uppercase text-primary-foreground">Open incident command <ChevronRight className="h-3 w-3" /></Link>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function operationalTone(status: ResourceOperationalStatus["operationalStatus"]) {
  if (status === "sufficient") return "border-green-500/40 bg-green-500/10 text-green-500";
  if (status === "shortfall") return "border-red-500/40 bg-red-500/10 text-red-500";
  return "border-amber-500/40 bg-amber-500/10 text-amber-500";
}

function LogisticsSection({ parishId, parishName, role }: { parishId: string; parishName: string; role: Role }) {
  const queryClient = useQueryClient();
  const { data: declarations, isLoading } = useListResourceDeclarations();
  const {
    data: statuses,
    isLoading: statusesLoading,
  } = useListResourceOperationalStatuses(
    { parishId },
    {
      query: {
        queryKey: getListResourceOperationalStatusesQueryKey({ parishId }),
        refetchInterval: 30_000,
      },
    },
  );
  const recordOperations = useRecordResourceOperations();
  const [selected, setSelected] = useState<string | null>(null);
  const [deployedQuantity, setDeployedQuantity] = useState("");
  const [verifiedAvailableQuantity, setVerifiedAvailableQuantity] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [message, setMessage] = useState("");
  const authorized = role !== "private_sector_partner";
  const keyFor = (status: ResourceOperationalStatus) => `${status.resourceType}:${status.unit.toLowerCase()}`;
  const active = statuses?.find((status) => keyFor(status) === selected);
  const activeDeclarations = active
    ? (declarations ?? []).flatMap((declaration) =>
        declaration.parishId === parishId
          ? declaration.resources
              .filter((resource) => resource.resourceType === active.resourceType && resource.unit.toLowerCase() === active.unit.toLowerCase())
              .map((resource) => ({
                ...resource,
                declarationId: declaration.id,
                organizationName: declaration.organizationName,
                timestamp: declaration.timestamp,
              }))
          : [],
      )
    : [];

  const selectStatus = (status: ResourceOperationalStatus) => {
    const key = keyFor(status);
    if (selected === key) {
      setSelected(null);
      return;
    }
    setSelected(key);
    setDeployedQuantity(status.deployedQuantity?.toString() ?? "0");
    setVerifiedAvailableQuantity(status.verifiedAvailableQuantity?.toString() ?? "0");
    setEvidenceNote("");
    setMessage("");
  };

  const submitOperationalUpdate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!active) return;
    setMessage("");
    recordOperations.mutate({
      data: {
        parishId,
        resourceType: active.resourceType,
        unit: active.unit,
        deployedQuantity: Number(deployedQuantity),
        verifiedAvailableQuantity: Number(verifiedAvailableQuantity),
        evidenceNote: evidenceNote.trim(),
      },
    }, {
      onSuccess: () => {
        setMessage("Operational snapshot recorded. Partner declaration remains unchanged.");
        setEvidenceNote("");
        queryClient.invalidateQueries({ queryKey: getListResourceOperationalStatusesQueryKey({ parishId }) });
      },
      onError: () => setMessage("Snapshot could not be recorded. Check quantities, evidence, and operational role."),
    });
  };

  return (
    <div className="space-y-3">
      <div className="border border-border bg-card/40 p-3 text-[10px] text-muted-foreground">
        Operational picture for <strong className="text-foreground">{parishName}</strong>. Quantities are never combined across units. Partner-reported declarations remain separate from verified, deployed, and target values. Sufficiency remains unverified until both a target and an operational snapshot exist.
      </div>
      <div className="grid gap-2 font-mono text-[8px] uppercase sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-primary/30 bg-primary/5 p-2 text-primary">Partner reported · planning input</div>
        <div className="border border-green-500/30 bg-green-500/5 p-2 text-green-500">Verified available · operator evidence</div>
        <div className="border border-blue-500/30 bg-blue-500/5 p-2 text-blue-400">Deployed · operator evidence</div>
        <div className="border border-violet-500/30 bg-violet-500/5 p-2 text-violet-400">Required target · parish evidence</div>
      </div>
      {isLoading || statusesLoading ? <div className="p-8 text-center font-mono text-xs uppercase text-muted-foreground">Loading resource picture…</div> : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(statuses ?? []).map((status) => (
            <button key={keyFor(status)} type="button" onClick={() => selectStatus(status)} className={cn("border bg-card/40 p-3 text-left", selected === keyFor(status) ? "border-primary bg-primary/5" : "border-border")}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-[9px] uppercase text-primary">{status.resourceType.replaceAll("_", " ")} · {status.unit}</div>
                <span className={cn("border px-2 py-0.5 font-mono text-[8px] uppercase", operationalTone(status.operationalStatus))}>{status.operationalStatus}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <span className="border-l-2 border-primary/50 pl-2 text-[8px] uppercase text-muted-foreground">Declared<br /><strong className="font-mono text-base text-primary">{status.declaredQuantity.toLocaleString()}</strong></span>
                <span className="border-l-2 border-green-500/50 pl-2 text-[8px] uppercase text-muted-foreground">Verified<br /><strong className="font-mono text-base text-green-500">{status.verifiedAvailableQuantity?.toLocaleString() ?? "—"}</strong></span>
                <span className="border-l-2 border-blue-500/50 pl-2 text-[8px] uppercase text-muted-foreground">Deployed<br /><strong className="font-mono text-base text-blue-400">{status.deployedQuantity?.toLocaleString() ?? "—"}</strong></span>
                <span className="border-l-2 border-violet-500/50 pl-2 text-[8px] uppercase text-muted-foreground">Target<br /><strong className="font-mono text-base text-violet-400">{status.targetQuantity?.toLocaleString() ?? "—"}</strong></span>
              </div>
              {status.operationalStatus !== "unverified" && (
                <div className="mt-3 border-t border-border/40 pt-2 text-[9px] text-muted-foreground">
                  {status.operationalStatus === "sufficient"
                    ? `Enough verified ${status.resourceType.replaceAll("_", " ")} for the current target.`
                    : `Shortfall: ${status.shortfallQuantity?.toLocaleString()} ${status.unit}.`}
                </div>
              )}
            </button>
          ))}
          {(statuses ?? []).length === 0 && <div className="border border-border bg-card/40 p-8 text-center font-mono text-[9px] uppercase text-muted-foreground md:col-span-2 xl:col-span-3">No declared resources or evidence-backed targets for this parish</div>}
        </div>
      )}
      {active && (
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-x-auto border border-border bg-card/40">
            <div className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase text-primary">{active.resourceType.replaceAll("_", " ")} · partner declarations</div>
            <table className="w-full min-w-[620px] text-left">
              <thead className="border-b border-border bg-muted/20 font-mono text-[8px] uppercase text-muted-foreground"><tr><th className="px-4 py-2">Organization</th><th className="px-4 py-2">Partner reported</th><th className="px-4 py-2">Window</th><th className="px-4 py-2">Declared at</th></tr></thead>
              <tbody className="divide-y divide-border/40 text-[10px]">
                {activeDeclarations.map((entry, index) => (
                  <tr key={`${entry.declarationId}-${entry.resourceType}-${entry.unit}-${index}`}><td className="px-4 py-3 font-medium uppercase">{entry.organizationName}</td><td className="px-4 py-3 text-primary">{entry.quantity.toLocaleString()} {entry.unit}</td><td className="px-4 py-3 uppercase text-muted-foreground">{entry.availabilityWindow.replaceAll("_", " ")}</td><td className="px-4 py-3 text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</td></tr>
                ))}
                {activeDeclarations.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center font-mono text-[9px] uppercase text-muted-foreground">No partner declarations for this unit</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 border border-border bg-card/40 p-4">
            <div>
              <div className="font-mono text-[9px] uppercase text-violet-400">Parish target evidence</div>
              <p className="mt-1 text-[10px] text-foreground">{active.targetEvidenceReference ?? "No evidence-backed target recorded."}</p>
              <p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">{active.targetEvidenceCapturedAt ? `Evidence timestamp · ${new Date(active.targetEvidenceCapturedAt).toLocaleString()}` : "Target timestamp unavailable"}</p>
            </div>
            {active.lastOperationalUpdateAt && (
              <div className="border-t border-border/50 pt-3">
                <div className="font-mono text-[8px] uppercase text-muted-foreground">Last operational update · {new Date(active.lastOperationalUpdateAt).toLocaleString()} · {active.recordedByRole?.replaceAll("_", " ")}</div>
                <p className="mt-1 text-[10px] text-foreground">{active.operationalEvidenceNote}</p>
              </div>
            )}
            {authorized && (
              <form onSubmit={submitOperationalUpdate} className="space-y-3 border-t border-border/50 pt-3">
                <div className="font-mono text-[9px] uppercase text-primary">Record operational snapshot</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="font-mono text-[8px] uppercase text-muted-foreground">Deployed · {active.unit}<input required min={0} type="number" value={deployedQuantity} onChange={(event) => setDeployedQuantity(event.target.value)} className="mt-1 h-9 w-full border border-blue-500/30 bg-background px-2 text-xs text-foreground" /></label>
                  <label className="font-mono text-[8px] uppercase text-muted-foreground">Verified available · {active.unit}<input required min={0} type="number" value={verifiedAvailableQuantity} onChange={(event) => setVerifiedAvailableQuantity(event.target.value)} className="mt-1 h-9 w-full border border-green-500/30 bg-background px-2 text-xs text-foreground" /></label>
                </div>
                <label className="block font-mono text-[8px] uppercase text-muted-foreground">Verification evidence<textarea required minLength={3} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Source, verifier, and observation" className="mt-1 min-h-20 w-full border border-border bg-background p-2 text-xs normal-case text-foreground" /></label>
                <button type="submit" disabled={recordOperations.isPending || !evidenceNote.trim()} className="w-full border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[9px] uppercase text-primary disabled:opacity-50">{recordOperations.isPending ? "Recording…" : "Record verified snapshot"}</button>
                {message && <p role="status" className="text-[9px] text-muted-foreground">{message}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}