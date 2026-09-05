import { UnifiedCommandWorkspace } from "@workspace/api-client-react";
import { Users, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { ActionDialog } from "../forms/ActionDialog";

export function PersonnelSection({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const canManageAccess = workspace.capabilities.includes('manage_access');
  const [editMember, setEditMember] = useState<any>(null);

  const events = [...workspace.accessEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 flex flex-col h-full rounded-md border border-border bg-card/30">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">Command Roster</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-3">
            {workspace.members.length === 0 ? (
              <div className="text-center font-mono text-xs text-muted-foreground py-8">No members found.</div>
            ) : (
              workspace.members.map(member => (
                <div key={member.id} className={`border border-border bg-background p-3 rounded-sm flex items-center justify-between group transition-colors ${canManageAccess ? 'cursor-pointer hover:border-primary/50' : ''}`} onClick={() => canManageAccess && setEditMember(member)}>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{member.name}</span>
                      <Badge variant="outline" className={`font-mono text-[9px] uppercase shrink-0 ${member.status === 'active' ? 'text-green-500 border-green-500/20' : 'text-muted-foreground'}`}>{member.status}</Badge>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground flex gap-2 truncate">
                      <span className="truncate">{member.role}</span>
                      <span className="opacity-50">|</span>
                      <span className="truncate">{member.agency}</span>
                      <span className="opacity-50">|</span>
                      <span className="text-primary/70 shrink-0">{member.icsFunction}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-mono text-[10px] text-muted-foreground">{member.contactChannel}</div>
                    {canManageAccess && (
                      <div className="font-mono text-[9px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity mt-1">EDIT STATUS</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col h-full rounded-md border border-border bg-card/30">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">Access Log</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {events.length === 0 ? (
            <div className="text-center font-mono text-xs text-muted-foreground py-8">No events logged.</div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-primary uppercase">{ev.action}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{format(parseISO(ev.timestamp), 'HH:mm')}</span>
                </div>
                <div className="text-xs text-foreground/90">{ev.detail}</div>
                <div className="font-mono text-[9px] text-muted-foreground mt-1 uppercase">ACTOR: {ev.actor}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {editMember && (
        <ActionDialog
          workspaceId={workspace.id} open={!!editMember} onOpenChange={(v) => !v && setEditMember(null)} type="update_member" initialData={editMember} title={`Update ${editMember.name}`}
          fields={[
            { name: "status", label: "Status", type: "select", options: ["active", "standby", "offline", "suspended", "removed"], required: true }
          ]}
        />
      )}
    </div>
  );
}