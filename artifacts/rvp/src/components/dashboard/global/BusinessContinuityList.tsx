import { type BusinessContinuityDirectory } from "@workspace/api-client-react";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function BusinessContinuityList({ directory, isLoading }: { directory?: BusinessContinuityDirectory; isLoading: boolean }) {
  if (isLoading) {
    return <div className="border border-border bg-card/40 rounded-sm h-full min-h-56 grid place-items-center font-mono text-[10px] uppercase text-muted-foreground">Loading continuity evidence…</div>;
  }
  const orgs = directory?.organizations ?? [];
  
  if (orgs.length === 0) {
    return (
      <div className="border border-border bg-card/40 rounded-sm flex flex-col h-full">
        <div className="p-3 border-b border-border/50 bg-muted/20">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Business Continuity Status</span>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
           <span className="font-mono text-xs text-muted-foreground text-center">{directory?.note ?? "Continuity data unavailable."}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border border-border bg-card/40 rounded-sm flex flex-col h-full overflow-hidden max-h-[380px]">
      <div className="p-3 border-b border-border/50 flex justify-between items-center bg-muted/20 shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Business Continuity Status</span>
        <span className="font-mono text-[9px] text-muted-foreground uppercase px-1.5 py-0.5 bg-background border border-border/50 rounded-[2px]">{orgs.length} TRACKED</span>
      </div>
      <div className="divide-y divide-border/50 overflow-y-auto flex-1">
        {orgs.map(org => {
          let Icon = HelpCircle;
          let color = "text-muted-foreground";
          
          if (org.status === 'operational') {
            Icon = CheckCircle2;
            color = "text-green-500";
          } else if (org.status === 'disrupted') {
            Icon = AlertTriangle;
            color = "text-amber-500";
          }
          
          return (
            <div key={org.id} className="p-3 hover:bg-muted/10 transition-colors flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs tracking-wide truncate uppercase text-foreground">{org.name}</span>
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground uppercase mt-0.5">
                     {org.category.replace("_", " ")} • {org.location}
                  </div>
                </div>
              </div>
              <div className="ml-7 text-[10px] text-muted-foreground bg-background/50 p-2 rounded-sm border border-border/30 leading-relaxed font-mono">
                 <div className="uppercase text-foreground">{org.status} • {org.confidence.replace("_", " ")}</div>
                 <div className="mt-1">{org.evidenceSource}</div>
                 <div className="mt-1 opacity-50 text-[8px] uppercase">
                   Updated: {org.lastUpdated ? new Date(org.lastUpdated).toLocaleString() : "No verified availability update"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {directory?.note && <div className="border-t border-border p-2 text-[8px] leading-relaxed text-muted-foreground">{directory.note}</div>}
      <div className="border-t border-border/50 p-2 text-[8px] leading-relaxed text-muted-foreground">
        Directory locations are not availability claims. Verified partner updates require a documented identity and organization authorization, so they are not enabled in this release.
      </div>
    </div>
  );
}
