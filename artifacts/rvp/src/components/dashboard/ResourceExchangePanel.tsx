import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  useGetResourceSummary,
  getGetResourceSummaryQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const AVAILABILITY_SHORT: Record<string, string> = {
  immediately: "Immediately",
  within_6h: "Within 6h",
  within_24h: "Within 24h",
  within_48h: "Within 48h",
};

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

export default function ResourceExchangePanel() {
  const { data: summary, isLoading } = useGetResourceSummary({
    query: { queryKey: getGetResourceSummaryQueryKey(), refetchInterval: 30_000 },
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleCategory(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (isLoading || !summary) {
    return (
      <div className="border border-border bg-card/40 rounded-sm p-4 animate-pulse h-32 flex items-center justify-center shrink-0">
        <div className="h-4 w-36 bg-muted/50 rounded" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-card/40 rounded-sm shrink-0">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Infrastructure and Resources
        </span>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-[2px]">
            {summary.totalDeclarations} DECLARATIONS
          </span>
          <span className="text-muted-foreground/50 uppercase">
            {summary.lastUpdated ? `Updated ${formatTime(summary.lastUpdated)}` : ""}
          </span>
        </div>
      </div>

      {/* Category rows */}
      <div className="divide-y divide-border/40">
        {summary.categories.length === 0 && (
          <div className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 text-center">
            No resources declared yet
          </div>
        )}

        {summary.categories.map((cat) => {
          const categoryKey = `${cat.resourceType}:${cat.unit.toLowerCase()}`;
          const isOpen = !!expanded[categoryKey];
          return (
            <div key={categoryKey}>
              {/* Category row */}
              <button
                type="button"
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors group text-left"
              >
                {/* Expand icon */}
                <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0">
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </span>

                {/* Dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />

                {/* Resource type */}
                <span className="font-mono text-xs uppercase tracking-wide text-foreground flex-1">
                  {cat.resourceType.replace(/_/g, " ")}
                </span>

                {/* Total */}
                <span className="font-mono text-xs text-primary">
                  {cat.totalQuantity.toLocaleString()} {cat.unit}
                </span>

                {/* Org count */}
                <span className="font-mono text-[10px] text-muted-foreground/60 ml-2">
                  ({cat.declarationCount} {cat.declarationCount === 1 ? "org" : "orgs"})
                </span>
              </button>

              {/* Expanded breakdown */}
              {isOpen && cat.declarations.length > 0 && (
                <div className="bg-background/40 border-t border-border/30">
                  {cat.declarations.map((entry, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 pl-10 pr-4 py-1.5 font-mono text-[10px] text-muted-foreground",
                        i < cat.declarations.length - 1 && "border-b border-border/20"
                      )}
                    >
                      <span className="text-muted-foreground/30">↳</span>
                      <span className="flex-1 truncate uppercase tracking-wide text-foreground/70">
                        {entry.organizationName}
                        <span className="text-muted-foreground/50 ml-1">
                          ({entry.parishId})
                        </span>
                      </span>
                      <span className="text-primary/70 shrink-0">
                        {entry.quantity.toLocaleString()} {entry.unit}
                      </span>
                      <span className="text-muted-foreground/50 ml-2 shrink-0">
                        · {AVAILABILITY_SHORT[entry.availabilityWindow] ?? entry.availabilityWindow}
                      </span>
                       <span className="border border-border/60 px-1.5 py-0.5 text-[8px] uppercase text-muted-foreground">
                         {entry.provenance === "demo_seed" ? "Demo seed" : "Unverified submission"}
                       </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {summary.containsDemoData && (
        <div className="border-t border-border/50 px-4 py-2 text-[9px] text-muted-foreground">
          Totals include synthetic demo seeds and unverified submissions. They are not confirmed operational capacity.
        </div>
      )}
    </div>
  );
}
