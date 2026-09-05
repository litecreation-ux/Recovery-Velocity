import {
  getListReviewItemsQueryKey,
  type UnifiedCommandWorkspace,
  useAssessRegionalAid,
  useListReviewItems,
} from "@workspace/api-client-react";
import { Bot, ChevronDown, ExternalLink, Globe2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/contexts/RoleContext";
import { RegionalAidReviewDetails } from "@/components/dashboard/RegionalAidReviewDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ASSESSMENT_PARISHES = [
  ["kingston", "Kingston"],
  ["st-elizabeth", "St. Elizabeth"],
  ["st-thomas", "St. Thomas"],
  ["westmoreland", "Westmoreland"],
  ["hanover", "Hanover"],
  ["portland", "Portland"],
] as const;

export function RegionalAidSection({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [parishId, setParishId] = useState("westmoreland");
  const [statusMessage, setStatusMessage] = useState("");
  const { data: reviewItems, isLoading } = useListReviewItems();
  const assessRegionalAid = useAssessRegionalAid({
  });
  const canAssess = role === "national_coordinator" || role === "parish_manager";
  const aidRequests = (reviewItems ?? [])
    .filter((item) => item.metadata?.kind === "regional_aid_request")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const runAssessment = () => {
    setStatusMessage("");
    assessRegionalAid.mutate(
      { data: { parishId } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListReviewItemsQueryKey() });
          setStatusMessage(result.created
            ? "Draft prepared and added to the Incident Command review queue."
            : result.reason ?? "No safe draft was created from the available evidence.");
        },
        onError: () => setStatusMessage("The evidence assessment failed. No request was created."),
      },
    );
  };

  return (
    <div className="h-full overflow-y-auto space-y-5">
      <section className="rounded-md border border-cyan-500/30 bg-cyan-500/[0.04]">
        <div className="flex flex-col gap-4 border-b border-cyan-500/20 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-sm border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider">AI Regional Aid Assessment</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Prepare an evidence-backed aid draft from verified operational shortfalls. Every draft goes to Incident Command for human review.
              </p>
            </div>
          </div>
          {canAssess && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label className="sr-only" htmlFor="regional-aid-parish">Assessment area</label>
              <select
                id="regional-aid-parish"
                value={parishId}
                onChange={(event) => setParishId(event.target.value)}
                className="h-9 rounded-sm border border-border bg-background px-2 font-mono text-[10px] uppercase text-foreground"
              >
                {ASSESSMENT_PARISHES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Button
                onClick={runAssessment}
                disabled={assessRegionalAid.isPending}
                className="h-9 rounded-sm bg-cyan-500/15 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/25"
                data-testid="button-regional-aid-assessment"
              >
                {assessRegionalAid.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                {assessRegionalAid.isPending ? "Assessing..." : "Run assessment"}
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5"><Globe2 className="h-3 w-3 text-cyan-400" /> Planning-only counterparts</span>
          <span>AI cannot send, dispatch, commit resources, or change readiness scores</span>
        </div>
        {statusMessage && <p className="border-t border-cyan-500/20 px-4 py-3 font-mono text-[10px] text-cyan-300" role="status">{statusMessage}</p>}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">Assessment requests</h2>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Review drafts created from current evidence across Jamaica.</p>
          </div>
          <a href="/review" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline">
            Incident Command review <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {isLoading ? (
          <div className="rounded-md border border-border p-8 text-center font-mono text-xs text-muted-foreground">Loading assessment requests...</div>
        ) : aidRequests.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="font-mono text-xs uppercase text-muted-foreground">No AI regional aid requests yet.</p>
            <p className="mt-2 text-xs text-muted-foreground">Choose an assessment area above to prepare one from verified shortfall evidence.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {aidRequests.map((item) => (
              <details key={item.id} className="group rounded-md border border-border bg-card/30">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="h-4 w-4 shrink-0 text-cyan-400 transition-transform group-open:rotate-180" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-sm">{item.title}</h3>
                      <Badge variant="outline" className="font-mono text-[9px] uppercase text-cyan-400 border-cyan-500/30">AI draft</Badge>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
                      {item.parishName} · Created {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 font-mono text-[9px] uppercase ${item.status === "approved" ? "text-green-400 border-green-500/30" : item.status === "rejected" ? "text-red-400 border-red-500/30" : "text-amber-300 border-amber-500/30"}`}>
                    {item.status === "pending" ? "Awaiting review" : item.status}
                  </Badge>
                </summary>
                <div className="border-t border-border">
                  <div className="flex flex-wrap items-start justify-between gap-3 bg-background/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {item.metadata?.kind === "regional_aid_request" && <RegionalAidReviewDetails metadata={item.metadata} />}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-amber-300">Counterpart confirmation required before commitment</span>
                    <a href={`/review?incidentId=${item.id}`} className="font-mono text-[10px] uppercase tracking-wider text-primary hover:underline">Open in review queue →</a>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}