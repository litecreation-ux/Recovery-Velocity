import * as React from "react";
import { UnifiedCommandWorkspace, useApplyUnifiedCommandAction, getGetUnifiedCommandWorkspaceQueryKey } from "@workspace/api-client-react";
import { useRole } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Radio, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";

export function CommunicationsSection({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const applyAction = useApplyUnifiedCommandAction({
  });
  const [message, setMessage] = useState("");
  const canCoordinate = workspace.capabilities.includes('coordinate');

  const canAck = canCoordinate; 

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    applyAction.mutate({
      workspaceId: workspace.id,
      data: {
        type: 'post_message',
        message,
        channel: 'general'
      }
    }, {
      onSuccess: () => {
        setMessage("");
        queryClient.invalidateQueries({ queryKey: getGetUnifiedCommandWorkspaceQueryKey(workspace.id) });
      }
    });
  };

  const handleAck = (id: string) => {
    applyAction.mutate({
      workspaceId: workspace.id,
      data: { type: 'acknowledge_message', recordId: id }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUnifiedCommandWorkspaceQueryKey(workspace.id) });
      }
    });
  };

  const comms = [...workspace.communications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="flex flex-col h-full rounded-md border border-border bg-card/30">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Radio className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">Inter-Agency Comms</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4 flex flex-col-reverse">
        {comms.length === 0 ? (
          <div className="text-center font-mono text-xs text-muted-foreground py-8">No communications on record.</div>
        ) : (
          comms.map(msg => (
            <div key={msg.id} className="border border-border bg-background p-3 rounded-sm flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="font-mono text-[10px] text-primary uppercase tracking-widest flex items-center gap-2">
                  <span>{msg.author}</span>
                  <span className="text-muted-foreground opacity-50">|</span>
                  <span className="text-muted-foreground">{msg.agency}</span>
                  <span className="text-muted-foreground opacity-50">|</span>
                  <span className="text-muted-foreground">{msg.channel}</span>
                </div>
                <div className="font-mono text-[9px] text-muted-foreground">
                  {format(parseISO(msg.timestamp), 'HH:mm:ss')}
                </div>
              </div>
              <p className="text-sm font-sans text-foreground/90 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1 flex-wrap">
                  {msg.acknowledgements.map(ack => (
                    <span key={ack} className="font-mono text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> {ack}
                    </span>
                  ))}
                  {msg.acknowledgements.length === 0 && (
                    <span className="font-mono text-[9px] text-muted-foreground">No ACKs</span>
                  )}
                </div>
                {(!msg.acknowledgements.includes(workspace.currentActor.name)) && (
                  canAck ? (
                    <Button variant="ghost" size="sm" onClick={() => handleAck(msg.id)} disabled={applyAction.isPending} className="h-6 px-2 font-mono text-[9px] uppercase tracking-wider hover:bg-primary/20 hover:text-primary">
                      Acknowledge
                    </Button>
                  ) : (
                    <span className="font-mono text-[9px] text-muted-foreground uppercase opacity-50 px-2">Ack Unavailable</span>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {canCoordinate && (
        <div className="p-3 border-t border-border bg-background/50">
          <form onSubmit={handlePost} className="flex flex-col gap-2">
            <Textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Transmit message to Unified Command..."
              className="min-h-[60px] resize-none font-mono text-xs bg-background rounded-sm"
            />
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-muted-foreground uppercase">Channel: General</span>
              <Button type="submit" disabled={!message.trim() || applyAction.isPending} size="sm" className="h-7 px-3 font-mono text-[10px] uppercase bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30">
                {applyAction.isPending ? 'Transmitting...' : 'Transmit'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}