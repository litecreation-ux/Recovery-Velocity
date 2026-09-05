import { UnifiedCommandWorkspace } from "@workspace/api-client-react";
import { Map as MapIcon, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ActionDialog } from "../forms/ActionDialog";

export function BoundariesSection({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const canCoordinate = workspace.capabilities.includes('coordinate');
  const [editBoundary, setEditBoundary] = useState<any>(null);

  return (
    <div className="flex flex-col h-full rounded-md border border-border bg-card/30">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <MapIcon className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">Jurisdiction & Handoffs</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {workspace.boundaries.length === 0 ? (
          <div className="text-center font-mono text-xs text-muted-foreground py-8">No boundaries defined.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workspace.boundaries.map(boundary => (
              <div key={boundary.id} className={`border border-border bg-background p-4 rounded-sm flex flex-col gap-3 transition-colors ${canCoordinate ? 'hover:border-primary/50 cursor-pointer' : ''}`} onClick={() => canCoordinate && setEditBoundary(boundary)}>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm truncate pr-2">{boundary.responsibleAgency}</h3>
                  <Badge variant="outline" className="font-mono text-[9px] uppercase border-primary/20 text-primary shrink-0">
                    {boundary.scopeType}
                  </Badge>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  <div className="text-primary/70 mb-1">SCOPE</div>
                  <div className="leading-snug">{boundary.scope}</div>
                </div>
                {boundary.note && (
                  <div className="text-xs text-foreground/80 italic mt-1 pb-2 border-b border-border/30">"{boundary.note}"</div>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="font-mono text-[9px] uppercase flex flex-col gap-1">
                    <span className="text-muted-foreground">HANDOFF: <span className={boundary.handoffState === 'complete' ? 'text-green-500' : 'text-amber-500'}>{boundary.handoffState}</span></span>
                    <span className="text-muted-foreground">VERIFIED: <span className={boundary.verificationStatus === 'verified' ? 'text-green-500' : 'text-red-500'}>{boundary.verificationStatus}</span></span>
                  </div>
                  {boundary.verificationStatus === 'verified' && <ShieldCheck className="h-5 w-5 text-green-500 opacity-80" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editBoundary && (
        <ActionDialog
          workspaceId={workspace.id} open={!!editBoundary} onOpenChange={(v) => !v && setEditBoundary(null)} type="update_boundary" initialData={editBoundary} title="Update Boundary"
          fields={[
            { name: "handoffState", label: "Handoff State", type: "select", options: ["retained", "requested", "in_progress", "complete"], required: true },
            { name: "verificationStatus", label: "Verification Status", type: "select", options: ["verified", "stale", "unverified"], required: true }
          ]}
        />
      )}
    </div>
  );
}