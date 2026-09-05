import { UnifiedCommandWorkspace } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus } from "lucide-react";
import { useState } from "react";
import { ActionDialog } from "../forms/ActionDialog";

export function ObjectivesSection({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const canCoordinate = workspace.capabilities.includes('coordinate');
  const [createOpen, setCreateOpen] = useState(false);
  const [editObj, setEditObj] = useState<any>(null);

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <div className="flex flex-col h-full rounded-md border border-border bg-card/30">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">Incident Objectives</h2>
        </div>
        {canCoordinate && (
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)} className="h-7 px-2 font-mono text-[10px] uppercase">
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {workspace.objectives.length === 0 ? (
          <div className="text-center font-mono text-xs text-muted-foreground py-8">No objectives defined.</div>
        ) : (
          workspace.objectives.map(obj => (
            <div key={obj.id} className={`border border-border bg-background p-3 rounded-sm flex flex-col gap-2 transition-colors ${canCoordinate ? 'hover:border-primary/50 cursor-pointer' : ''}`} onClick={() => canCoordinate && setEditObj(obj)}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-medium text-sm leading-tight">{obj.title}</h3>
                <Badge variant="outline" className={`font-mono text-[9px] uppercase shrink-0 ${priorityColors[obj.priority] || ''}`}>
                  {obj.priority}
                </Badge>
              </div>
              {obj.description && <p className="text-xs text-muted-foreground">{obj.description}</p>}
              <div className="flex items-center justify-between gap-3 mt-1 font-mono text-[10px] text-muted-foreground">
                <div className="flex gap-3">
                  <span className="truncate">OWNER: {obj.owner}</span>
                  <span>OP: {obj.operationalPeriod}</span>
                </div>
                <span className={obj.status === 'active' ? 'text-green-500' : ''}>{obj.status.toUpperCase()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <ActionDialog
        workspaceId={workspace.id} open={createOpen} onOpenChange={setCreateOpen} type="create_objective" title="Create Objective"
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "priority", label: "Priority", type: "select", options: ["critical", "high", "medium"], required: true },
          { name: "operationalPeriod", label: "Op Period", type: "text", required: true },
          { name: "owner", label: "Owner Agency", type: "text", required: true }
        ]}
      />
      
      {editObj && (
        <ActionDialog
          workspaceId={workspace.id} open={!!editObj} onOpenChange={(open) => !open && setEditObj(null)} type="update_objective" initialData={editObj} title="Update Objective"
          fields={[
            { name: "status", label: "Status", type: "select", options: ["active", "achieved", "deferred"], required: true },
            { name: "owner", label: "Owner Agency", type: "text", required: true },
          ]}
        />
      )}
    </div>
  );
}