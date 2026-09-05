import { useEffect, useRef, useState } from "react";
import type { CountryRiskOverview, StormScenario } from "@workspace/api-client-react";
import { Activity, Info, ShieldCheck, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStormScenario, STORM_SCENARIOS } from "@/lib/storm-scenarios";

export type ScoreKey = "readiness" | "recovery" | "resilience";
type BreakdownRow = {
  label: string;
  value: number | null;
  prefix?: string;
  display?: string;
  tone?: boolean;
};
type ScoreDetail = {
  label: string;
  summary: string;
  rows: BreakdownRow[];
};

function tone(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score < 40) return "text-red-500";
  if (score < 65) return "text-amber-500";
  return "text-green-500";
}

function clampScore(score: number | null) {
  return score == null ? null : Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score: number | null) {
  if (score == null) return "Unavailable";
  if (score < 40) return "Lower capacity";
  if (score < 65) return "Moderate capacity";
  return "Higher capacity";
}

export function CountryScenarioScores({
  overview,
  stormScenario,
  onStormScenarioChange,
  onScoreSelect,
}: {
  overview: CountryRiskOverview;
  stormScenario: StormScenario;
  onStormScenarioChange: (scenario: StormScenario) => void;
  onScoreSelect?: (scoreKey: ScoreKey) => void;
}) {
  const [selectedScore, setSelectedScore] = useState<ScoreKey>("readiness");
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoControlRef = useRef<HTMLDivElement>(null);
  const baseline = overview.resilience.score ?? null;

  useEffect(() => {
    setSelectedScore("readiness");
    setIsInfoOpen(false);
  }, [overview.country.code]);

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

  const scenario = getStormScenario(stormScenario);
  const intensityPenalty = scenario.intensityPenalty;
  const phasePenalty = overview.phase.phase === "active_response" ? 18 : overview.phase.phase === "recovery" ? 8 : 0;
  const scores = {
    readiness: clampScore(baseline == null ? null : baseline - intensityPenalty),
    recovery: clampScore(baseline == null ? null : baseline - intensityPenalty - phasePenalty - 8),
    resilience: clampScore(baseline == null ? null : baseline - Math.round(intensityPenalty * 0.7)),
  };

  const currentPhase = overview.phase.phase.replace("_", " ");
  const scenarioName = `${scenario.label} scenario`;
  const handleScoreSelect = (scoreKey: ScoreKey) => {
    setSelectedScore(scoreKey);
    onScoreSelect?.(scoreKey);
  };
  const readinessDetails: ScoreDetail = {
    label: "National readiness breakdown",
    summary: `Before-impact national planning capacity after applying the ${scenarioName.toLowerCase()} intensity adjustment.`,
    rows: [
      { label: "National capacity baseline", value: baseline },
      { label: "Storm intensity adjustment", value: intensityPenalty, prefix: "−" },
      { label: "Projected readiness", value: scores.readiness },
    ],
  };
  const selectedScoreDetails: Record<ScoreKey, ScoreDetail> = {
    readiness: readinessDetails,
    recovery: {
      label: "Recovery breakdown",
      summary: `During-event recovery capacity, including the current ${currentPhase} phase and a recovery-planning adjustment.`,
      rows: [
        { label: "National capacity baseline", value: baseline },
        { label: "Storm intensity adjustment", value: intensityPenalty, prefix: "−" },
        { label: "Current phase adjustment", value: phasePenalty, prefix: "−" },
        { label: "Recovery planning adjustment", value: 8, prefix: "−" },
        { label: "Projected recovery", value: scores.recovery },
      ],
    },
    resilience: {
      label: "Resilience breakdown",
      summary: "Aftermath capacity after retaining 70% of the scenario's storm intensity adjustment.",
      rows: [
        { label: "National capacity baseline", value: baseline },
        { label: "Retained aftermath stress", value: Math.round(intensityPenalty * 0.7), prefix: "−" },
        { label: "Projected resilience", value: scores.resilience },
      ],
    },
  };

  return (
    <section className="border border-border bg-card/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 bg-background/50 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Country disaster score model</span>
            <div ref={infoControlRef} className="relative">
                <button
                  type="button"
                  aria-label="About the country disaster score model"
                  aria-expanded={isInfoOpen}
                  onClick={() => setIsInfoOpen((open) => !open)}
                  className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <Info className="h-3.5 w-3.5 cursor-help" />
                </button>
              {isInfoOpen && (
                <div
                  role="dialog"
                  aria-label="Country disaster score model information"
                  className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-primary/40 bg-popover p-3 font-mono text-[10px] leading-relaxed text-popover-foreground shadow-lg"
                >
                  Scenario projections of national planning capacity before impact, during the event, and in the aftermath. They use the source-labelled resilience baseline plus the selected storm intensity and current phase. These are not live incident measurements, official forecasts, or safety directions.
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted-foreground">
            Select the storm intensity to see how national planning capacity performs before impact, during the event, and in the aftermath.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1 border border-primary/30 bg-background p-1" aria-label="Storm category scenario">
          {STORM_SCENARIOS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStormScenarioChange(option.value)}
              aria-pressed={stormScenario === option.value}
              className={cn(
                "px-2 py-1.5 font-mono text-[9px] uppercase transition-colors",
                stormScenario === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border/50 md:grid-cols-3">
        <ScoreCell
          icon={ShieldCheck}
          label="Readiness"
          stage="Before impact"
          scoreKey="readiness"
          selectedScore={selectedScore}
          onSelect={handleScoreSelect}
          score={scores.readiness}
          detail={`Preparedness against ${scenarioName.toLowerCase()}`}
        />
        <ScoreCell
          icon={Waves}
          label="Recovery"
          stage="During event"
          scoreKey="recovery"
          selectedScore={selectedScore}
          onSelect={handleScoreSelect}
          score={scores.recovery}
          detail={`Dynamic to current ${currentPhase} phase`}
        />
        <ScoreCell
          icon={Activity}
          label="Resilience"
          stage="Aftermath"
          scoreKey="resilience"
          selectedScore={selectedScore}
          onSelect={handleScoreSelect}
          score={scores.resilience}
          detail="Post-event capacity after scenario stress"
        />
      </div>

      <div className="border-t border-border/50 bg-background/30 p-4" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {selectedScoreDetails[selectedScore].label}
            </div>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
              {selectedScoreDetails[selectedScore].summary}
            </p>
          </div>
          <span className={cn("font-mono text-2xl font-bold tracking-tighter", tone(scores[selectedScore]))}>
            {scores[selectedScore] ?? "—"}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">/100</span>
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {selectedScoreDetails[selectedScore].rows.map((row, index) => (
            <div
              key={row.label}
              className={cn(
                "border border-border/50 bg-card/50 px-3 py-2",
                index === selectedScoreDetails[selectedScore].rows.length - 1 && "border-primary/30",
              )}
            >
              <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">{row.label}</div>
              <div className={cn(
                "mt-1 font-mono text-sm",
                row.tone ? tone(row.value) : "text-foreground",
              )}>
                {row.display ?? (row.value == null ? "—" : `${row.prefix ?? ""}${row.value}`)}
                {row.value != null && !row.tone && (
                  <span className="ml-1 text-[9px] text-muted-foreground">pts</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-wide text-amber-500/80">
          Select another tile above to inspect its projection inputs.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-2.5">
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Baseline national planning capacity: <strong className={tone(baseline)}>{baseline ?? "—"}/100</strong>
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wide text-amber-500/80">
          Scenario projection · not a live incident measurement
        </span>
      </div>
    </section>
  );
}

function ScoreCell({
  icon: Icon,
  label,
  stage,
  scoreKey,
  selectedScore,
  onSelect,
  score,
  detail,
}: {
  icon: typeof ShieldCheck;
  label: string;
  stage: string;
  scoreKey: ScoreKey;
  selectedScore: ScoreKey;
  onSelect: (scoreKey: ScoreKey) => void;
  score: number | null;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(scoreKey)}
      aria-pressed={selectedScore === scoreKey}
      className={cn(
        "bg-card/70 p-3 text-left transition-colors hover:bg-card focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        selectedScore === scoreKey && "bg-primary/[0.06] ring-1 ring-inset ring-primary/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", tone(score))} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        <span className="font-mono text-[8px] uppercase text-muted-foreground">{stage}</span>
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span className={cn("font-mono text-3xl font-bold tracking-tighter", tone(score))}>{score ?? "—"}</span>
        <span className="pb-1 font-mono text-[10px] text-muted-foreground">/100</span>
      </div>
      <div className={cn("mt-1 font-mono text-[9px] uppercase", tone(score))}>{scoreLabel(score)}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-3 font-mono text-[8px] uppercase tracking-wide text-primary/80">
        {selectedScore === scoreKey ? "Selected · view breakdown below" : "Select for breakdown"}
      </div>
    </button>
  );
}